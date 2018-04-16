module.exports = {
  server: {
    port: 3838,
  },
  btczNode: {
    username: 'bitcoin',
    password: 'local321',
    host: '127.0.0.1',
    port: 1979,
    zmqPort: 28332,
  },
  knex: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      user: 'txtz',
      password: 'btczftw!',
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
    accountSid: 'TWILIOACCOUNTSID',
    token: 'TWILIOTOKEN',
    smsNumber: '+12565555555',
  }
};
