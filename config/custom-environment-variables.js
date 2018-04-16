module.exports = {
  node: {
    username: 'BTCZ_NODE_USER',
    password: 'BTCZ_NODE_PASS',
    host: 'BTCZ_NODE_HOST'
  },
  knex: {
    connection: {
      host: 'DB_HOST',
      user: 'DB_USER',
      password: 'DB_PASSWORD',
      database: 'DB_DATABASE'
    },
  },
  twilio: {
    accountSid: 'TWILIO_ACCOUNTSID',
    token: 'TWILIO_TOKEN',
    smsNumber: 'TWILIO_SMS_NUMBER',
  }
};
