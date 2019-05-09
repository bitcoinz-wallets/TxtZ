
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('numberMapping', (table) => {
      table.uuid('id').primary();
      table.string('number', 191).unique();
      table.string('address', 191).unique();
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
    }),
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('numberMapping'),
  ]);
};
