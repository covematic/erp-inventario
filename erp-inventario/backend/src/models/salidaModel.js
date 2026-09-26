const { query } = require('../config/db');
const { Filtros } = require('../utils/helpers');

async function insertCabecera(client, s) {
  const { rows } = await client.query(
    `INSERT INTO salidas (numero, numero_guia, fecha, almacen_id, tipo_destino, proyecto_id, area_id, motivo,
                          responsable, requiere_devolucion, fecha_retorno_estimada, estado, usuario_id,
                          despachado_por, despachado_at, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [s.numero, s.numero_guia, s.fecha, s.almacen_id, s.tipo_destino, s.proyecto_id, s.area_id, s.motivo,
      s.responsable, s.requiere_devolucion, s.fecha_retorno_estimada, s.estado, s.usuario_id,
      s.despachado_por || null, s.despachado_at || null, s.observaciones]
  );
  return rows[0];
}

async function insertDetalle(client, d) {
  const { rows } = await client.query(
    `INSERT INTO detalle_salidas (salida_id, producto_id, cantidad, costo_unitario)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [d.salida_id, d.producto_id, d.cantidad, d.costo_unitario]
  );
  return rows[0];
}

async function lockById(client, id) {
  const { rows } = await client.query('SELECT * FROM salidas WHERE id = $1 FOR UPDATE', [id]);
  return rows[0];
}

async function detalles(db, salidaId, { lock = false } = {}) {
  const { rows } = await db.query(
    `SELECT d.*, (d.cantidad - d.cantidad_devuelta) AS pendiente_devolucion,
            p.sku, p.nombre AS producto_nombre, p.unidad_medida
       FROM detalle_salidas d JOIN productos p ON p.id = d.producto_id
      WHERE d.salida_id = $1 ORDER BY d.producto_id
      ${lock ? 'FOR UPDATE OF d' : ''}`,
    [salidaId]
  );
  return rows;
}

async function marcarDespachada(client, id, usuarioId) {
  await client.query(
    `UPDATE salidas SET estado = 'DESPACHADA', despachado_por = $2, despachado_at = NOW() WHERE id = $1`,
    [id, usuarioId]
  );
}

async function anular(client, id, usuarioId, motivo) {
  await client.query(
    `UPDATE salidas SET estado = 'ANULADA', anulado_por = $2, anulado_at = NOW(), motivo_anulacion = $3 WHERE id = $1`,
    [id, usuarioId, motivo]
  );
}

const SELECT = `
  SELECT s.*, a.nombre AS almacen_nombre, u.nombre AS usuario_nombre,
         ud.nombre AS despachado_por_nombre, ua.nombre AS anulado_por_nombre,
         pr.codigo AS proyecto_codigo, pr.nombre AS proyecto_nombre, ar.nombre AS area_nombre,
         COALESCE(pr.codigo || ' · ' || pr.nombre, ar.nombre) AS destino_nombre,
         t.items, t.cantidad_total, t.valor_total, t.pendiente_devolucion
    FROM salidas s
    JOIN almacenes a ON a.id = s.almacen_id
    JOIN usuarios u ON u.id = s.usuario_id
    LEFT JOIN usuarios ud ON ud.id = s.despachado_por
    LEFT JOIN usuarios ua ON ua.id = s.anulado_por
    LEFT JOIN proyectos pr ON pr.id = s.proyecto_id
    LEFT JOIN areas ar ON ar.id = s.area_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS items, COALESCE(SUM(d.cantidad),0) AS cantidad_total,
             COALESCE(SUM(d.cantidad * d.costo_unitario),0) AS valor_total,
             COALESCE(SUM(d.cantidad - d.cantidad_devuelta),0) AS pendiente_devolucion
        FROM detalle_salidas d WHERE d.salida_id = s.id
    ) t ON TRUE`;

async function list(f, { limit, offset }) {
  // Se filtra sobre la consulta completa (x) para poder usar los totales calculados
  const w = new Filtros()
    .add('x.fecha >= ?', f.desde)
    .add('x.fecha <= ?', f.hasta)
    .add('x.estado = ?', f.estado)
    .add('x.motivo = ?', f.motivo)
    .add('x.tipo_destino = ?', f.tipo_destino)
    .add('x.proyecto_id = ?', f.proyecto_id)
    .add('x.area_id = ?', f.area_id)
    .add(`(x.numero ILIKE ? OR x.numero_guia ILIKE ? OR x.responsable ILIKE ? OR x.destino_nombre ILIKE ?)`, f.q ? `%${f.q}%` : null);
  if (f.devolvibles === 'true') {
    w.raw(`x.estado = 'DESPACHADA'`).raw('x.pendiente_devolucion > 0');
  }
  const where = w.where();
  const base = `FROM (${SELECT}) x`;
  const total = await query(`SELECT COUNT(*)::int AS n ${base} ${where}`, w.params);
  const data = await query(`SELECT x.* ${base} ${where} ORDER BY x.id DESC LIMIT ${w.next(limit)} OFFSET ${w.next(offset)}`, w.params);
  return { data: data.rows, total: total.rows[0].n };
}

async function findById(id) {
  const { rows } = await query(`${SELECT} WHERE s.id = $1`, [id]);
  return rows[0];
}

module.exports = { insertCabecera, insertDetalle, lockById, detalles, marcarDespachada, anular, list, findById };
