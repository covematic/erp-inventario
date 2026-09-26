/**
 * Acceso a la tabla stock. Las funciones reciben el cliente de la transacción.
 */

/** Obtiene y BLOQUEA la fila de stock (la crea en cero si no existe). */
async function lock(client, productoId, almacenId) {
  await client.query(
    `INSERT INTO stock (producto_id, almacen_id) VALUES ($1, $2)
     ON CONFLICT (producto_id, almacen_id) DO NOTHING`,
    [productoId, almacenId]
  );
  const { rows } = await client.query(
    `SELECT s.*, p.nombre AS producto_nombre, p.sku, p.unidad_medida, p.costo_promedio, p.activo AS producto_activo
       FROM stock s JOIN productos p ON p.id = s.producto_id
      WHERE s.producto_id = $1 AND s.almacen_id = $2
      FOR UPDATE OF s`,
    [productoId, almacenId]
  );
  return rows[0];
}

async function update(client, productoId, almacenId, v) {
  const { rows } = await client.query(
    `UPDATE stock SET disponible = $3, comprometido = $4, danado = $5, defectuoso = $6, updated_at = NOW()
      WHERE producto_id = $1 AND almacen_id = $2 RETURNING *`,
    [productoId, almacenId, v.disponible, v.comprometido, v.danado, v.defectuoso]
  );
  return rows[0];
}

/** Stock usable total (disponible + comprometido) de un producto en todos los almacenes. */
async function totalUsable(client, productoId) {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(disponible + comprometido), 0) AS total FROM stock WHERE producto_id = $1`,
    [productoId]
  );
  return Number(rows[0].total);
}

module.exports = { lock, update, totalUsable };
