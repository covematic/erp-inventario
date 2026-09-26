const { query } = require('../config/db');
const movimientoModel = require('../models/movimientoModel');
const AppError = require('../utils/AppError');
const { Filtros, paginacion } = require('../utils/helpers');

/** Existencias por producto y almacén con todos los estados de stock. */
async function listarStock(q) {
  const w = new Filtros()
    .add('(p.sku ILIKE ? OR p.nombre ILIKE ?)', q.q ? `%${q.q}%` : null)
    .add('p.categoria_id = ?', q.categoria_id)
    .add('a.id = ?', q.almacen_id);
  w.raw('p.activo');
  if (q.estado === 'AGOTADO') w.raw('COALESCE(s.disponible,0) = 0');
  if (q.estado === 'BAJO') w.raw('COALESCE(s.disponible,0) > 0 AND p.stock_minimo > 0 AND COALESCE(s.disponible,0) <= p.stock_minimo');
  if (q.estado === 'NO_APTO') w.raw('(COALESCE(s.danado,0) + COALESCE(s.defectuoso,0)) > 0');
  if (q.estado === 'COMPROMETIDO') w.raw('COALESCE(s.comprometido,0) > 0');
  const { rows } = await query(
    `SELECT p.id AS producto_id, p.sku, p.nombre, p.unidad_medida, p.stock_minimo, p.costo_promedio,
            c.nombre AS categoria_nombre, a.id AS almacen_id, a.nombre AS almacen_nombre,
            COALESCE(s.disponible,0) AS disponible, COALESCE(s.comprometido,0) AS comprometido,
            COALESCE(s.danado,0) AS danado, COALESCE(s.defectuoso,0) AS defectuoso,
            COALESCE(s.disponible + s.comprometido + s.danado + s.defectuoso,0) AS stock_actual,
            COALESCE(s.disponible + s.comprometido,0) * p.costo_promedio AS valor,
            CASE WHEN COALESCE(s.disponible,0) = 0 THEN 'AGOTADO'
                 WHEN p.stock_minimo > 0 AND COALESCE(s.disponible,0) <= p.stock_minimo THEN 'BAJO'
                 ELSE 'NORMAL' END AS estado_stock
       FROM productos p
       JOIN categorias c ON c.id = p.categoria_id
       CROSS JOIN almacenes a
       LEFT JOIN stock s ON s.producto_id = p.id AND s.almacen_id = a.id
       ${w.where()} AND a.activo
      ORDER BY p.nombre, a.codigo`,
    w.params
  );
  return rows;
}

async function kardex(productoId, q) {
  const prod = await query(
    `SELECT p.id, p.sku, p.nombre, p.unidad_medida, p.costo_promedio, p.stock_minimo, c.nombre AS categoria_nombre
       FROM productos p JOIN categorias c ON c.id = p.categoria_id WHERE p.id = $1`,
    [productoId]
  );
  if (!prod.rows[0]) throw AppError.notFound('Producto no encontrado');
  let almacenId = q.almacen_id;
  if (!almacenId) {
    const a = await query('SELECT id FROM almacenes WHERE activo ORDER BY id LIMIT 1');
    almacenId = a.rows[0]?.id;
  }
  const stock = await query('SELECT * FROM stock WHERE producto_id = $1 AND almacen_id = $2', [productoId, almacenId]);
  const movimientos = await movimientoModel.kardex(productoId, almacenId, { desde: q.desde, hasta: q.hasta });
  return { producto: prod.rows[0], almacen_id: Number(almacenId), stock: stock.rows[0] || null, movimientos };
}

async function movimientos(q) {
  const pag = paginacion(q, 500);
  const r = await movimientoModel.list(q, pag);
  return { ...r, page: pag.page, limit: pag.limit };
}

module.exports = { listarStock, kardex, movimientos };
