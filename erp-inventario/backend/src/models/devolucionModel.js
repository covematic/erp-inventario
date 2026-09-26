const { query } = require('../config/db');
const { Filtros } = require('../utils/helpers');

async function insertCabecera(client, d) {
  const { rows } = await client.query(
    `INSERT INTO devoluciones (numero, fecha, salida_id, motivo, responsable, usuario_id, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [d.numero, d.fecha, d.salida_id, d.motivo, d.responsable, d.usuario_id, d.observaciones]
  );
  return rows[0];
}

async function insertDetalle(client, d) {
  const { rows } = await client.query(
    `INSERT INTO detalle_devoluciones (devolucion_id, detalle_salida_id, producto_id, cantidad, estado_producto)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [d.devolucion_id, d.detalle_salida_id, d.producto_id, d.cantidad, d.estado_producto]
  );
  return rows[0];
}

async function sumarDevuelto(client, detalleSalidaId, cantidad) {
  await client.query(
    'UPDATE detalle_salidas SET cantidad_devuelta = cantidad_devuelta + $2 WHERE id = $1',
    [detalleSalidaId, cantidad]
  );
}

const SELECT = `
  SELECT d.*, s.numero AS salida_numero, s.numero_guia, s.tipo_destino, s.almacen_id,
         COALESCE(pr.codigo || ' · ' || pr.nombre, ar.nombre) AS destino_nombre,
         u.nombre AS usuario_nombre,
         t.items, t.cantidad_total, t.cant_bueno, t.cant_danado, t.cant_defectuoso
    FROM devoluciones d
    JOIN salidas s ON s.id = d.salida_id
    JOIN usuarios u ON u.id = d.usuario_id
    LEFT JOIN proyectos pr ON pr.id = s.proyecto_id
    LEFT JOIN areas ar ON ar.id = s.area_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS items, COALESCE(SUM(dd.cantidad),0) AS cantidad_total,
             COALESCE(SUM(dd.cantidad) FILTER (WHERE dd.estado_producto = 'BUENO'),0) AS cant_bueno,
             COALESCE(SUM(dd.cantidad) FILTER (WHERE dd.estado_producto = 'DANADO'),0) AS cant_danado,
             COALESCE(SUM(dd.cantidad) FILTER (WHERE dd.estado_producto = 'DEFECTUOSO'),0) AS cant_defectuoso
        FROM detalle_devoluciones dd WHERE dd.devolucion_id = d.id
    ) t ON TRUE`;

async function list(f, { limit, offset }) {
  const w = new Filtros()
    .add('x.fecha >= ?', f.desde)
    .add('x.fecha <= ?', f.hasta)
    .add('x.salida_id = ?', f.salida_id)
    .add('(x.numero ILIKE ? OR x.salida_numero ILIKE ? OR x.responsable ILIKE ? OR x.destino_nombre ILIKE ?)', f.q ? `%${f.q}%` : null);
  if (f.estado_producto) {
    w.add('EXISTS (SELECT 1 FROM detalle_devoluciones dd WHERE dd.devolucion_id = x.id AND dd.estado_producto = ?)', f.estado_producto);
  }
  const where = w.where();
  const base = `FROM (${SELECT}) x`;
  const total = await query(`SELECT COUNT(*)::int AS n ${base} ${where}`, w.params);
  const data = await query(`SELECT x.* ${base} ${where} ORDER BY x.id DESC LIMIT ${w.next(limit)} OFFSET ${w.next(offset)}`, w.params);
  return { data: data.rows, total: total.rows[0].n };
}

async function findById(id) {
  const { rows } = await query(`${SELECT} WHERE d.id = $1`, [id]);
  return rows[0];
}

async function detalles(id) {
  const { rows } = await query(
    `SELECT dd.*, p.sku, p.nombre AS producto_nombre, p.unidad_medida, ds.cantidad AS cantidad_despachada
       FROM detalle_devoluciones dd
       JOIN productos p ON p.id = dd.producto_id
       JOIN detalle_salidas ds ON ds.id = dd.detalle_salida_id
      WHERE dd.devolucion_id = $1 ORDER BY dd.id`,
    [id]
  );
  return rows;
}

module.exports = { insertCabecera, insertDetalle, sumarDevuelto, list, findById, detalles };
