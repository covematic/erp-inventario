const fs = require('fs');
const path = require('path');
const { query } = require('./db');

/**
 * Si la base de datos está vacía (primera vez), crea las tablas y carga los datos de prueba.
 * Así el sistema puede publicarse sin ejecutar comandos desde una computadora.
 * Nunca modifica una base que ya tiene tablas. Se desactiva con AUTO_INIT_DB=false.
 */
async function initDbSiVacia() {
  if (process.env.AUTO_INIT_DB === 'false') return;
  const { rows } = await query("SELECT to_regclass('public.usuarios') IS NOT NULL AS existe");
  if (rows[0].existe) return;
  console.log('Base de datos vacía: creando tablas y datos de prueba…');
  await query(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
  const { seedDatabase } = require('../../db/seed');
  await seedDatabase();
  console.log('Base de datos inicializada');
}

/**
 * Cambios de estructura para bases creadas con versiones anteriores.
 * Cada sentencia es idempotente: puede ejecutarse en cada arranque sin efectos repetidos.
 */
const MIGRACIONES = [
  // v1.3: el proveedor de una entrada pasa a ser opcional (stock inicial)
  'ALTER TABLE entradas ALTER COLUMN proveedor_id DROP NOT NULL',
];

async function aplicarMigraciones() {
  for (const sql of MIGRACIONES) await query(sql);
}

module.exports = { initDbSiVacia, aplicarMigraciones };
