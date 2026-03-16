import knex from 'knex';

const conString = process.env.VISA_DATABASE_URL;

const db = knex({
  client: 'pg',
  connection: conString,
});

export default db;
