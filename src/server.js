/*
 * Copyright 2019 The BitcoinZ Project
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
const NumberMapping = require("./models/NumberMapping");
const bitcore = require('bitcore-lib-btcz');
const zmq = require('zmq');
const cache = require('memory-cache');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const morgan = require('morgan');
const rp = require('request-promise-native')
const blockchain = require('./models/blockchain')
const app = express();

const twilio = new Twilio(config.twilio.accountSid, config.twilio.token);

const zmqUrl = `tcp://${config.node.host}:${config.node.zmqPort}`;
const zmqSubSocket = zmq.socket('sub');

async function sendResponse(toNumber, text) {
  console.log(`sendResponse to ${toNumber}: ${text}`);
  try {
    await twilio.messages.create({
      body: text,
      to: toNumber,
      from: config.twilio.smsNumber
    });
  } catch(err) {
    console.error('sendResponse error', { err });
  }
}

async function lookupOrCreateAddressByNumber(number) {
  try {
    return await NumberMapping.where('number', number).fetch({require: true});
  } catch(err) {
    if (/^EmptyResponse/.test(err.message)) {
      const addressInfo = await blockchain.generateNewTaddress();
      const address = addressInfo.address;
      const WIF = addressInfo.WIF;
      await NumberMapping.create({
        number,
        address,
        WIF
      });
      await blockchain.importAddress(address);
      return NumberMapping.where('number', number).fetch({require: true});
    }
    console.error('lookupOrCreateAddressByNumber error', { err });
    throw err;
  }
}

function helpSend(smsIn) {
  sendResponse(smsIn.From, "BTCZ can be sent using the following command:\nsend [amount] [address or number]\n\nExample:\nsend 10 t1K2ZGbAfEJ1GZ8sGNFdG9vBqxoxpJoaVzD");
}

async function sendCoins(smsIn, numberMapping) {
  const text = smsIn.Body.trim();
  const fromAddress = numberMapping.get('address');
  const results = text.split(" ", 4);

  let currencyAmound = -1;
  let currency, amount, toAddress;

  if (isNaN(results[1])) { // Check if is not numeric (with currency code)
    currency = results[1].toUpperCase();
    amount = Number(results[2]);
    toAddress = results[3];
  } else {
    currency = "BTCZ";
    amount = Number(results[1]);
    toAddress = results[2];
  }

  if (currency != "BTCZ"){
    const requestOptions = {
      method: 'GET',
      uri: 'https://pay.btcz.app/api/get_btcz_rate',
      json: true,
      gzip: true
    };
    await rp(requestOptions).then(response => {
      let json = JSON.stringify(response);
      json = JSON.parse(json);
      currencyAmound=json[currency];
      amount = amount/currencyAmound;
      console.log(`Exchange rate for ${currency} : ${currencyAmound}`)
    }).catch((err) => {
      console.error('updateExchangeRate', { err })
      return;
    });
  }

  if (!amount || !toAddress || isNaN(currencyAmound)) {
    helpSend(smsIn);
    if (isNaN(currencyAmound)){
      sendResponse(smsIn.From, "You can use any of this currency code : BTCZ, BTC, USD, CHF, EUR, GBP, RUB, JPY, ZAR, CAD, AUD.\n\nExample:\nsend EUR 1.52 t1K2ZGbAfEJ1GZ8sGNFdG9vBqxoxpJoaVzD");
    }
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
  } catch(err) {
    console.error('sendCoins parse number error', { err });
  }

  try {
    const response = await blockchain.getBalance(fromAddress);
    const balance = response.result;
    const remainingBalance = balance - amount - 0.0001;

    if (remainingBalance < 0) {
      sendResponse(smsIn.From, `Not enough coins to send ${amount} BTCZ. Balance: ${balance} BTCZ`);
      return;
    }

    const unspentOutputs = await blockchain.listunspent(fromAddress);
    const createTx = blockchain.createTransaction;
    const tx = createTx(unspentOutputs.result, toAddress, amount, 0.0001, numberMapping.get('WIF'));
    await blockchain.broadcastTransaction(tx);

    sendResponse(smsIn.From, `${amount} BTCZ has been sent to ${toAddress}`);
  } catch(err) {
    console.error('sendCoins error', { err });
    sendResponse(smsIn.From, 'There was an error processing your request');
  }
}

function receiveCoins(smsIn, numberMapping) {
  const address = numberMapping.get('address');
  const msg = `Receive BTCZ to this address`;
  sendResponse(smsIn.From, msg);
  sendResponse(smsIn.From, address);
}

async function lookupBalance(smsIn, numberMapping) {
  const address = numberMapping.get('address');
  const text = smsIn.Body.trim()+" BtcZ";
  const results = text.split(" ", 2);
  const currency = results[1].toUpperCase();
  let currencyAmound = -1 ;

  if (currency != "BTCZ"){
    const requestOptions = {
      method: 'GET',
      uri: 'https://pay.btcz.app/api/get_btcz_rate',
      json: true,
      gzip: true
    };
    await rp(requestOptions).then(response => {
      let json = JSON.stringify(response);
      json = JSON.parse(json);
      currencyAmound=json[currency];
      console.log(`Exchange rate for ${currency} : ${currencyAmound}`)
    }).catch((err) => {
      console.error('updateExchangeRate', { err })
    });
  }

  try {
    const response = await blockchain.getBalance(address);

    let balance = response.result;
    if (isNaN(currencyAmound)){currency="BTCZ"};
    let balResponse = `${balance} ${currency}`;
    if (currencyAmound != -1 && currency != "BTCZ") {
      const BalBTCZ = balance;
      balance = balance*currencyAmound;
      balance = balance.toFixed(3);
      balResponse = `${balance} ${currency} (${BalBTCZ} BTCZ)`;
    }

    sendResponse(smsIn.From, `Your balance is ${balResponse}`);
  } catch(err) {
    console.error('lookupBalance error', { err });
    sendResponse(smsIn.From, 'There was an error retrieving details');
  }
}

function welcome(smsIn) {
  sendResponse(smsIn.From, 'Welcome to the TxtZ App!\nUse the commands help, balance, send, and receive to interact with the system.');
}

function help(smsIn) {
  sendResponse(smsIn.From, "Commands are:\nbal, balance - balance info\nrec, receive - wallet address info\nsend [amount] [address or number]");
}

async function routeResponse(smsIn) {
  if (!smsIn.Body || !smsIn.From) {
      throw "Invalid response received from Twilio";
  }

  try {
    const numberMapping = await lookupOrCreateAddressByNumber(smsIn.From);
    const normalizeText = smsIn.Body.toLowerCase().trim();

    console.log(`routeResponse : ${normalizeText} | from ${smsIn.From}`);

    if (normalizeText === 'start' || normalizeText === 'setup' || normalizeText === 'welcome') {
      welcome(smsIn);
      return;
    }

    if (normalizeText === 'help') {
      help(smsIn);
      return;
    }

    if (normalizeText.startsWith('balance') || normalizeText.startsWith('bal')) {
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
  } catch(err) {
    console.error('routeResponse error', { err });
  }
}

function transactionHandler(rawtx) {
  const tx = new bitcore.Transaction(rawtx);
  if (cache.get(tx.id)) {
    return;
  }

  const txObj = tx.toObject();
  cache.put(tx.id, true, 3600000);

  // If no inputs found, then no further processing needed
  // We should proably be looking for the OP_CODE here instead
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

app.use(morgan('combined'));
app.use(bodyParser.urlencoded({extended: false}));

app.post("/message", function (req, res) {
  const opts = {};

  // check if this is a request from a proxy and build the real URL
  if (req.headers.host && req.headers['x-forwarded-proto']) {
    opts.url = req.headers['x-forwarded-proto'] + `://${req.headers.host}${req.url}`;
  }

  // Make sure the request is from Twilio before allowing it to be processed
  if (Twilio.validateExpressRequest(req, config.twilio.token, opts)) {
    routeResponse(req.body);
  } else {
    console.error(`Unauthorized request to: ${req.url}`);
  }

  // For security reasons, always return a successful 200 response
  res.send('<Response></Response>');
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
