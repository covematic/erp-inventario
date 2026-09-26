const { query } = require('../config/db');
const { Filtros } = require('../utils/helpers');

async function insertCabecera(client, e) {
  const { rows } = await client.query(
    `INSERT INTO entradas (numero, documento_ref, fecha, proveedor_id, almacen_id, usuario_id, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [e.numero, e.documento_ref, e.fecha, e.proveedor_id, e.almacen_id, e.usuario_id, e.observaciones]
  );
  return rows[0];
}

async function insertDetalle(client, d) {
  const { rows } = await client.query(
    `INSERT INTO detalle_entradas (entrada_id, producto_id, cantidad, costo_unitario, costo_total)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [d.entrada_id, d.producto_id, d.cantidad, d.costo_unitario, d.costo_total]
  );
  return rows[0];
}

async function setTotal(client, id, total) {
  await client.query('UPDATE entradas SET total = $2 WHERE id = $1', [id, total]);
}

async function lockById(client, id) {
  const { rows } = await client.query('SELECT * FROM entradas WHERE id = $1 FOR UPDATE', [id]);
  return rows[0];
}

async function detalles(db, entradaId) {
  const { rows } = await db.query(
    `SELECT d.*, p.sku, p.nombre AS producto_nombre, p.unidad_medida
       FROM detalle_entradas d JOIN productos p ON p.id = d.producto_id
      WHERE d.entrada_id = $1 ORDER BY d.id`,
    [entradaId]
  );
  return rows;
}

async function anular(client, id, usuarioId, motivo) {
  await client.query(
    `UPDATE entradas SET estado = 'ANULADA', anulado_por = $2, anulado_at = NOW(), motivo_anulacion = $3 WHERE id = $1`,
    [id, usuarioId, motivo]
  );
}

const SELECT = `
  SELECT e.*, pr.razon_social AS proveedor_nombre, a.nombre AS almacen_nombre, u.nombre AS usuario_nombre,
         ua.nombre AS anulado_por_nombre,
         (SELECT COUNT(*)::int FROM detalle_entradas d WHERE d.entrada_id = e.id) AS items
    FROM entradas e
    JOIN proveedores pr ON pr.id = e.proveedor_id
    JOIN almacenes a ON a.id = e.almacen_id
    JOIN usuarios u ON u.id = e.usuario_id
    LEFT JOIN usuarios ua ON ua.id = e.anulado_por`;

async function list(f, { limit, offset }) {
  const w = new Filtros()
    .add('e.fecha >= ?', f.desde)
    .add('e.fecha <= ?', f.hasta)
    .add('e.proveedor_id = ?', f.proveedor_id)
    .add('e.estado = ?', f.estado)
    .add('(e.numero ILIKE ? OR e.documento_ref ILIKE ? OR pr.razon_social ILIKE ?)', f.q ? `%${f.q}%` : null);
  const where = w.where();
  const total = await query(`SELECT COUNT(*)::int AS n FROM entradas e JOIN proveedores pr ON pr.id = e.proveedor_id ${where}`, w.params);
  const data = await query(`${SELECT} ${where} ORDER BY e.id DESC LIMIT ${w.next(limit)} OFFSET ${w.next(offset)}`, w.params);
  return { data: data.rows, total: total.rows[0].n };
}

async function findById(id) {
  const { rows } = await query(`${SELECT} WHERE e.id = $1`, [id]);
  return rows[0];
}

module.exports = { insertCabecera, insertDetalle, setTotal, lockById, detalles, anular, list, findById };
