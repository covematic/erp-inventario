const { query } = require('../config/db');
const { Filtros } = require('../utils/helpers');

const CAMPOS = ['sku', 'nombre', 'descripcion', 'categoria_id', 'proveedor_id', 'unidad_medida', 'precio_compra', 'precio_venta', 'stock_minimo', 'activo'];

// Stock agregado de todos los almacenes
const SELECT = `
  SELECT p.*, c.nombre AS categoria_nombre, pv.razon_social AS proveedor_nombre,
         COALESCE(st.disponible,0) AS stock_disponible, COALESCE(st.comprometido,0) AS stock_comprometido,
         COALESCE(st.danado,0) AS stock_danado, COALESCE(st.defectuoso,0) AS stock_defectuoso,
         COALESCE(st.disponible + st.comprometido + st.danado + st.defectuoso, 0) AS stock_actual,
         CASE WHEN COALESCE(st.disponible,0) = 0 THEN 'AGOTADO'
              WHEN p.stock_minimo > 0 AND COALESCE(st.disponible,0) <= p.stock_minimo THEN 'BAJO'
              ELSE 'NORMAL' END AS estado_stock
    FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN proveedores pv ON pv.id = p.proveedor_id
    LEFT JOIN LATERAL (
      SELECT SUM(disponible) AS disponible, SUM(comprometido) AS comprometido,
             SUM(danado) AS danado, SUM(defectuoso) AS defectuoso
        FROM stock s WHERE s.producto_id = p.id
    ) st ON TRUE`;

async function list(f, { limit, offset }) {
  const w = new Filtros()
    .add('(x.sku ILIKE ? OR x.nombre ILIKE ? OR x.descripcion ILIKE ?)', f.q ? `%${f.q}%` : null)
    .add('x.categoria_id = ?', f.categoria_id)
    .add('x.proveedor_id = ?', f.proveedor_id)
    .add('x.estado_stock = ?', f.estado_stock);
  if (f.activo === 'true') w.raw('x.activo');
  if (f.activo === 'false') w.raw('NOT x.activo');
  const where = w.where();
  const base = `FROM (${SELECT}) x`;
  const total = await query(`SELECT COUNT(*)::int AS n ${base} ${where}`, w.params);
  const data = await query(`SELECT x.* ${base} ${where} ORDER BY x.nombre LIMIT ${w.next(limit)} OFFSET ${w.next(offset)}`, w.params);
  return { data: data.rows, total: total.rows[0].n };
}

async function findById(id) {
  const { rows } = await query(`${SELECT} WHERE p.id = $1`, [id]);
  return rows[0];
}

async function create(data) {
  const cols = CAMPOS.filter((c) => data[c] !== undefined);
  const { rows } = await query(
    `INSERT INTO productos (${cols.join(',')}, costo_promedio) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}, $${cols.length + 1}) RETURNING id`,
    [...cols.map((c) => data[c]), data.precio_compra || 0]
  );
  return rows[0].id;
}

async function update(id, data) {
  const cols = CAMPOS.filter((c) => data[c] !== undefined);
  const { rowCount } = await query(
    `UPDATE productos SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1`,
    [id, ...cols.map((c) => data[c])]
  );
  return rowCount;
}

async function tieneMovimientos(id) {
  const { rows } = await query(
    `SELECT EXISTS (SELECT 1 FROM movimientos_inventario WHERE producto_id = $1)
         OR EXISTS (SELECT 1 FROM detalle_salidas WHERE producto_id = $1)
         OR EXISTS (SELECT 1 FROM stock WHERE producto_id = $1 AND (disponible + comprometido + danado + defectuoso) > 0) AS usado`,
    [id]
  );
  return rows[0].usado;
}

async function remove(id) {
  await query('DELETE FROM stock WHERE producto_id = $1', [id]);
  return (await query('DELETE FROM productos WHERE id = $1', [id])).rowCount;
}

module.exports = { list, findById, create, update, tieneMovimientos, remove };
