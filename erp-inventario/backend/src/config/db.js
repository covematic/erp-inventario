const { Pool, types } = require('pg');
const { databaseUrl } = require('./env');

// NUMERIC (1700) e INT8 (20) llegan como texto; se convierten a número.
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
// DATE (1082) se mantiene como 'YYYY-MM-DD' para evitar corrimientos de zona horaria.
types.setTypeParser(1082, (v) => v);

const esLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);
// Las bases en la nube (Neon, Supabase, Render...) exigen conexión cifrada
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: esLocal ? false : { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX) || 10,
});

async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Ejecuta fn(client) dentro de una transacción.
 * Si fn lanza un error se hace ROLLBACK y el error se propaga.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
