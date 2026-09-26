const { query } = require('../config/db');

/**
 * Modelo genérico para catálogos simples (categorías, proveedores, almacenes, áreas).
 * Los nombres de tabla y columnas provienen solo de esta configuración fija, nunca del usuario.
 */
const CATALOGOS = {
  categorias: { campos: ['nombre', 'descripcion', 'activo'], buscar: ['nombre'], orden: 'nombre' },
  proveedores: { campos: ['ruc', 'razon_social', 'contacto', 'telefono', 'email', 'direccion', 'activo'], buscar: ['ruc', 'razon_social', 'contacto'], orden: 'razon_social' },
  almacenes: { campos: ['codigo', 'nombre', 'ubicacion', 'activo'], buscar: ['codigo', 'nombre'], orden: 'codigo' },
  areas: { campos: ['nombre', 'activo'], buscar: ['nombre'], orden: 'nombre' },
};

function cfg(tabla) {
  const c = CATALOGOS[tabla];
  if (!c) throw new Error(`Catálogo desconocido: ${tabla}`);
  return c;
}

async function list(tabla, { q, activo }) {
  const c = cfg(tabla);
  const conds = [];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    conds.push(`(${c.buscar.map((b) => `${b} ILIKE $${params.length}`).join(' OR ')})`);
  }
  if (activo === 'true') conds.push('activo');
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM ${tabla} ${where} ORDER BY ${c.orden}`, params);
  return rows;
}

async function findById(tabla, id) {
  cfg(tabla);
  const { rows } = await query(`SELECT * FROM ${tabla} WHERE id = $1`, [id]);
  return rows[0];
}

async function create(tabla, data) {
  const cols = cfg(tabla).campos.filter((k) => data[k] !== undefined);
  const { rows } = await query(
    `INSERT INTO ${tabla} (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
    cols.map((k) => data[k])
  );
  return rows[0];
}

async function update(tabla, id, data) {
  const cols = cfg(tabla).campos.filter((k) => data[k] !== undefined);
  const { rows } = await query(
    `UPDATE ${tabla} SET ${cols.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...cols.map((k) => data[k])]
  );
  return rows[0];
}

async function remove(tabla, id) {
  cfg(tabla);
  return (await query(`DELETE FROM ${tabla} WHERE id = $1`, [id])).rowCount;
}

module.exports = { CATALOGOS, list, findById, create, update, remove };
