const { query } = require('../config/db');
const { Filtros } = require('../utils/helpers');

async function insert(client, m) {
  const { rows } = await client.query(
    `INSERT INTO movimientos_inventario
       (fecha, producto_id, almacen_id, tipo, documento_tipo, documento_id, documento_numero,
        cantidad_entrada, cantidad_salida, cantidad_devolucion, estado_stock, saldo,
        costo_unitario, valor, usuario_id, observacion)
     VALUES (COALESCE($1::date + LOCALTIME, NOW()), $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [m.fecha || null, m.productoId, m.almacenId, m.tipo, m.documentoTipo, m.documentoId, m.documentoNumero,
      m.entrada || 0, m.salida || 0, m.devolucion || 0, m.estadoStock || 'DISPONIBLE', m.saldo,
      m.costoUnitario || 0, m.valor || 0, m.usuarioId, m.observacion || null]
  );
  return rows[0];
}

function filtros(f) {
  return new Filtros()
    .add('m.fecha >= ?::date', f.desde)
    .add("m.fecha < (?::date + INTERVAL '1 day')", f.hasta)
    .add('m.producto_id = ?', f.producto_id)
    .add('m.almacen_id = ?', f.almacen_id)
    .add('m.tipo = ?', f.tipo)
    .add('m.usuario_id = ?', f.usuario_id)
    .add('m.documento_numero ILIKE ?', f.documento ? `%${f.documento}%` : null);
}

const SELECT = `
  SELECT m.*, p.sku, p.nombre AS producto_nombre, p.unidad_medida, a.nombre AS almacen_nombre,
         u.nombre AS usuario_nombre
    FROM movimientos_inventario m
    JOIN productos p ON p.id = m.producto_id
    JOIN almacenes a ON a.id = m.almacen_id
    JOIN usuarios u ON u.id = m.usuario_id`;

async function list(f, { limit, offset }) {
  const w = filtros(f);
  const where = w.where();
  const total = await query(`SELECT COUNT(*)::int AS n FROM movimientos_inventario m ${where}`, w.params);
  const data = await query(
    `${SELECT} ${where} ORDER BY m.id DESC LIMIT ${w.next(limit)} OFFSET ${w.next(offset)}`,
    w.params
  );
  return { data: data.rows, total: total.rows[0].n };
}

async function kardex(productoId, almacenId, f = {}) {
  const w = filtros({ ...f, producto_id: productoId, almacen_id: almacenId });
  const { rows } = await query(`${SELECT} ${w.where()} ORDER BY m.id ASC`, w.params);
  return rows;
}

module.exports = { insert, list, kardex };
