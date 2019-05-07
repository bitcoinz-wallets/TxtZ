module.exports = {
  server: {
    port: 3838,
  },
  node: {
    username: 'bitcoin',
    password: 'local123**',
    host: '127.0.0.1',
    port: 1979,
    zmqPort: 28332,
    rpc: 'http://bitcoin:local123@127.0.0.1:1979',
  },
  knex: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      user: 'txtz',
      password: 'local123**',
      database: 'txtz',
      charset: 'utf8mb4',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
  twilio: {
    accountSid: 'twillio SSID',
    token: 'Token',
    smsNumber: '++123456789',
  }
};
