
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.alterTable('numberMapping', (table) => {
      table.string('WIF', 191);
    }),
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('numberMapping', (table) => {
      table.dropColumn('WIF');
    }),
  ]);
};
