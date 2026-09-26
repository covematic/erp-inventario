/**
 * Crea la base de datos (si no existe) y carga el esquema.
 * Uso: npm run db:setup     (¡borra y recrea todas las tablas!)
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/erp_inventario';

const esLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const ssl = esLocal ? false : { rejectUnauthorized: false };

async function main() {
  if (!esLocal) {
    // Base en la nube: ya existe, solo se carga el esquema
    const c = new Client({ connectionString: url, ssl });
    await c.connect();
    await c.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    await c.end();
    console.log('Esquema cargado correctamente en la base de datos en la nube');
    return;
  }
  const u = new URL(url);
  const dbName = decodeURIComponent(u.pathname.slice(1));
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const c1 = new Client({ connectionString: admin.toString() });
  await c1.connect();
  const exists = await c1.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) {
    await c1.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
    console.log(`Base de datos "${dbName}" creada`);
  }
  await c1.end();

  const c2 = new Client({ connectionString: url });
  await c2.connect();
  await c2.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  await c2.end();
  console.log('Esquema cargado correctamente');
}

main().catch((e) => {
  console.error('Error al preparar la base de datos:', e.message);
  process.exit(1);
});
