// Postgres pool wrapped around Neon's pooled endpoint.
// DATABASE_URL is read from the Vercel env in production and from
// .env.local when running the migration script locally.

const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

async function query(text, params) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

function configured() {
  return !!process.env.DATABASE_URL;
}

module.exports = { query, getPool, configured };
