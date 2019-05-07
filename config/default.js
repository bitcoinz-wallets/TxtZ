module.exports = {
  server: {
    port: 3838,
  },
  node: {
    username: 'marcel',
    password: '19MAbu03**',
    host: '10.100.7.52',
    port: 1979,
    zmqPort: 28332,
    rpc: 'http://marcel:19MAbu03**@10.100.7.52:1979',
  },
  knex: {
    client: 'mysql',
    connection: {
      host: '10.100.3.221',
      user: 'marcel',
      password: '19MAbu03**',
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
    accountSid: 'AC4733011337aa07df26d5077f9659c863',
    token: '8cb38f57fe663780ecc9196bc8ac8964',
    smsNumber: '+12019877007',
  }
};
