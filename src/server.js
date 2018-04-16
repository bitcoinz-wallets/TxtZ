/*
 * Copyright 2018 The BitcoinZ Project
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to
 * do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHTHOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const config = require('config');
const Twilio = require('twilio');
const express = require('express');
const bodyParser = require('body-parser');
const Zcash = require("zcash");
const NumberMapping = require("./models/NumberMapping");
const bitcore = require('bitcore-lib-btcz');
const zmq = require('zmq');
const cache = require('memory-cache');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const app = express();

const twilio = new Twilio(config.twilio.accountSid, config.twilio.token);
const rpc = new Zcash(config.btczNode);

const zmqUrl = `tcp://${config.btczNode.host}:${config.btczNode.zmqPort}`;
const zmqSubSocket = zmq.socket('sub');

function sendResponse(toNumber, text) {
  twilio.messages.create({
    body: text,
    to: toNumber,
    from: config.twilio.smsNumber
  }).catch((err) => console.log('sendResponse error', JSON.stringify(err)));
}

function lookupOrCreateAddressByNumber(number) {
  return NumberMapping.where('number', number).fetch({require: true}).catch((err) => {
    if (/^EmptyResponse/.test(err.message)) {
      return rpc.getnewaddress('').then(address => {
        return NumberMapping.create({
          number,
          address
        }).then(() => {
          return NumberMapping.where('number', number).fetch({require: true});
        });
      });
    }
    throw err;
  });
}

function helpSend(smsIn) {
  sendResponse(smsIn.From, "BTCZ can be sent using the following command:\nsend [amount] [address or number]\n\nExample:\nsend 10 t1K2ZGbAfEJ1GZ8sGNFdG9vBqxoxpJoaVzD");
}

async function sendCoins(smsIn, numberMapping) {
  const text = smsIn.Body.trim();
  const results = text.split(" ", 3);
  const amount = Number(results[1]);
  const fromAddress = numberMapping.get('address');
  let toAddress = results[2];

  if (!amount || !toAddress) {
    helpSend(smsIn);
    return;
  }

  // if toAddress is a number number, lookup address
  try {
    const number = phoneUtil.parseAndKeepRawInput(toAddress, 'US');
    if (phoneUtil.isValidNumber(number)) {
      const numberFormated = phoneUtil.format(number, PNF.E164);
      const result = await lookupOrCreateAddressByNumber(numberFormated);
      toAddress = result.get('address');
    }
  } catch(e) {
    console.error('parse number error', e);
  }

  return rpc.getaddressbalance(fromAddress).then(result => {
    const balance = result.balance / 100000000;
    const remainingBalance = balance - amount;

    if (remainingBalance < 0) {
      throw Error(`Not enough coins to process your request. Balance: ${balance} BTCZ`);
    }

    const transactions = [
      { "address": toAddress, "amount": amount }
    ];

    if (remainingBalance > 0) {
      transactions.push({ "address": fromAddress, "amount": remainingBalance });
    }

    return rpc.z_sendmany(fromAddress, transactions, 1, 0);
  }).then(() => {
    sendResponse(smsIn.From, `${amount} BTCZ has been sent to ${toAddress}`);
  }).catch((err) => {
    console.error('sendCoins error', JSON.stringify(err));
    sendResponse(smsIn.From, 'There was an error processing your request');
  });
}

function receiveCoins(smsIn, numberMapping) {
  const address = numberMapping.get('address');
  const msg = `Receive BTCZ to this address`;
  sendResponse(smsIn.From, msg);
  sendResponse(smsIn.From, address);
}

function lookupBalance(smsIn, numberMapping) {
  const address = numberMapping.get('address');
  return rpc.getaddressbalance(address).then(response => {
    const balance = response.balance / 100000000;
    sendResponse(smsIn.From, `Your balance is ${balance} BTCZ`);
  }).catch((err) => {
    console.error('getaddressbalance error', JSON.stringify(err));
    sendResponse(smsIn.From, 'There was an error retrieving details');
  });
}

function welcome(smsIn) {
  sendResponse(smsIn.From, 'Welcome to the TxtZ App!\nUse the commands help, balance, send, and receive to interact with the system.');
}

function help(smsIn) {
  sendResponse(smsIn.From, "Commands are:\nbal, balance - balance info\nrec, receive - wallet address info\nsend [amount] [address or number]");
}

function routeResponse(smsIn) {
  if (!smsIn.Body || !smsIn.From) {
      throw "Invalid response received from Twilio";
  }

  lookupOrCreateAddressByNumber(smsIn.From).then((numberMapping) => {
    const normalizeText = smsIn.Body.toLowerCase().trim();

    if (normalizeText === 'start' || normalizeText === 'setup' || normalizeText === 'welcome') {
      welcome(smsIn);
      return;
    }

    if (normalizeText === 'help') {
      help(smsIn);
      return;
    }

    if (normalizeText === 'balance' || normalizeText === 'bal') {
      lookupBalance(smsIn, numberMapping);
      return;
    }

    if (normalizeText.startsWith('send')) {
      sendCoins(smsIn, numberMapping);
      return;
    }

    if (normalizeText === 'receive' || normalizeText === 'rec') {
      receiveCoins(smsIn, numberMapping);
      return;
    }

    sendResponse(smsIn.From, 'Unrecognized command. Commands are help, balance, send, and receive');
  });
}


function transactionHandler(rawtx) {
  const tx = new bitcore.Transaction(rawtx);
  if (cache.get(tx.id)) {
    return;
  }

  const txObj = tx.toObject();
  cache.put(tx.id, true, 3600000, function(key, value) {
    console.log(`stored ${key} with value: ${value}`);
  });

  // if no inputs found, then no further processing needed
  if (!tx.inputs[0] || !tx.inputs[0].script) {
    return;
  }

  try {
    const toAddress = bitcore.Address.fromScript(tx.inputs[0].script, 'livenet').toString();

    tx.outputs.forEach(output => {
      const fromAddress = bitcore.Address.fromScript(output.script, 'livenet').toString();
      const amount = (output.satoshis / 100000000);

      // if toAddress is the same as fromAddress, no need to alert
      if (toAddress === fromAddress) {
        return;
      }

      NumberMapping.where('address', fromAddress).fetch().then(numberMapping => {
        if (!numberMapping) {
          return;
        }
        sendResponse(numberMapping.get('number'), `Your account has received ${amount} BTCZ\n\nNote: Transactions may not immediately show up in your balance and can take a few minutes to be confirmed`);
      });
    });
  } catch(e) {
    return;
  }
}

app.use(bodyParser.urlencoded({extended: false}));

app.post("/message", function (request, response) {
  response.send();
  routeResponse(request.body);
});

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

zmqSubSocket.on('connect', function(fd, endPoint) {
  console.log('ZMQ connected to:', endPoint);
});

zmqSubSocket.on('connect_delay', function(fd, endPoint) {
  console.log('ZMQ connection delay:', endPoint);
});

zmqSubSocket.on('disconnect', function(fd, endPoint) {
  console.log('ZMQ disconnect:', endPoint);
});

zmqSubSocket.on('monitor_error', function(err) {
  log.error('Error in monitoring: %s, will restart monitoring in 5 seconds', err);
  setTimeout(function() {
    zmqSubSocket.monitor(500, 0);
  }, 5000);
});

zmqSubSocket.monitor(500, 0);
zmqSubSocket.connect(zmqUrl);
zmqSubSocket.subscribe('rawtx');
zmqSubSocket.on('message', function(topic, message) {
  const topicString = topic.toString('utf8');
  if (topicString === 'rawtx') {
    transactionHandler(message);
  }
});

module.exports = app;
