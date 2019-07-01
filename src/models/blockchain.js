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

const config = require('config')
const jayson = require('jayson/promise')
const url = require('url')
const rpcURL = `http://${config.node.username}:${config.node.password}@${config.node.host}:${config.node.port}`;
const rpc = url.parse(rpcURL)
const client = jayson.client.http(rpc)
const bitcore = require('bitcore-lib-btcz')
rpc.timeout = 5000

exports.importAddress = function (address) {
  return client.request('importaddress', [address, address, false])
}

exports.getReceivedByAddress = function (address) {
  const reqs = [
    client.request('getreceivedbyaddress', [address, 0]),
    client.request('getreceivedbyaddress', [address, 1])
  ]
  return Promise.all(reqs)
}

exports.getblockchaininfo =function () {
  return client.request('getblockchaininfo', [])
}

exports.listunspent = function (address) {
  return client.request('listunspent', [0, 9999999, [address]])
}

exports.getBalance = function (address) {
  return client.request('z_getbalance', [address])
}

exports.createTransaction = function (utxos, toAddress, amount, fixedFee, WIF, changeAddress) {
  amount = parseInt((amount * 100000000).toFixed(0))
  fixedFee = parseInt((fixedFee * 100000000).toFixed(0))

  const pk = new bitcore.PrivateKey.fromWIF(WIF)
  const fromAddress = (pk.toPublicKey()).toAddress(bitcore.Networks.livenet)
  changeAddress = changeAddress || fromAddress

  let transaction = new bitcore.Transaction()

  // re-loop unspent outputs to parse decimal number into satochis
  for (const utxo of utxos) {
    transaction.from({
      'address': fromAddress,
      'txid': utxo.txid,
      'vout': utxo.vout,
      'scriptPubKey': utxo.scriptPubKey,
      'satoshis': parseInt((utxo.amount * 100000000).toFixed(0))
    })
  }

  transaction
    .to(toAddress, amount - fixedFee)
    .fee(fixedFee)
    .change(changeAddress)
    .sign(pk)

  return transaction.uncheckedSerialize()
}

exports.broadcastTransaction = function (tx) {
  return client.request('sendrawtransaction', [tx])
}

exports.generateNewTaddress = function () {

  const privateKey = new bitcore.PrivateKey()
  const address = privateKey.toAddress().toString()

  return {
    'address': address,
    'WIF': privateKey.toWIF()
  }
}

exports.isAddressValid = function (address) {
  return bitcore.Address.isValid(address)
}
