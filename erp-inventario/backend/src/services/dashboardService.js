const { query } = require('../config/db');

async function resumen() {
  const kpi = await query(`
    WITH prod AS (
      SELECT p.id, p.stock_minimo, p.costo_promedio,
             COALESCE(SUM(s.disponible),0) AS disp, COALESCE(SUM(s.comprometido),0) AS comp,
             COALESCE(SUM(s.danado),0) AS dan, COALESCE(SUM(s.defectuoso),0) AS def
        FROM productos p LEFT JOIN stock s ON s.producto_id = p.id
       WHERE p.activo GROUP BY p.id
    )
    SELECT COUNT(*)::int AS total_productos,
           COALESCE(SUM(disp),0) AS stock_disponible,
           COALESCE(SUM(comp),0) AS stock_comprometido,
           COALESCE(SUM(dan),0) AS stock_danado,
           COALESCE(SUM(def),0) AS stock_defectuoso,
           COUNT(*) FILTER (WHERE disp > 0 AND stock_minimo > 0 AND disp <= stock_minimo)::int AS productos_stock_bajo,
           COUNT(*) FILTER (WHERE disp = 0)::int AS productos_agotados,
           COALESCE(SUM((disp + comp) * costo_promedio),0) AS valor_inventario
      FROM prod`);

  const docs = await query(`
    SELECT (SELECT COUNT(*) FROM salidas WHERE estado = 'DESPACHADA')::int AS salidas,
           (SELECT COUNT(*) FROM salidas WHERE estado = 'PENDIENTE')::int AS salidas_pendientes,
           (SELECT COUNT(*) FROM devoluciones)::int AS devoluciones,
           (SELECT COUNT(*) FROM entradas WHERE estado = 'CONFIRMADA')::int AS entradas,
           (SELECT COUNT(*) FROM proyectos WHERE estado = 'ACTIVO')::int AS proyectos_activos`);

  // Últimos 6 meses (incluido el actual), en cantidades y en valor
  const serie = await query(`
    WITH meses AS (
      SELECT generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
                             date_trunc('month', CURRENT_DATE), INTERVAL '1 month') AS mes
    )
    SELECT to_char(m.mes, 'YYYY-MM') AS mes,
           COALESCE(SUM(mv.cantidad_entrada) FILTER (WHERE mv.tipo = 'ENTRADA'),0) AS entradas,
           COALESCE(SUM(mv.cantidad_salida) FILTER (WHERE mv.tipo = 'SALIDA'),0) AS salidas,
           COALESCE(SUM(mv.cantidad_devolucion) FILTER (WHERE mv.tipo = 'DEVOLUCION'),0) AS devoluciones,
           COALESCE(SUM(mv.valor) FILTER (WHERE mv.tipo = 'ENTRADA'),0) AS valor_entradas,
           COALESCE(SUM(mv.valor) FILTER (WHERE mv.tipo = 'SALIDA'),0) AS valor_salidas,
           COALESCE(SUM(mv.valor) FILTER (WHERE mv.tipo = 'DEVOLUCION'),0) AS valor_devoluciones
      FROM meses m
      LEFT JOIN movimientos_inventario mv ON date_trunc('month', mv.fecha) = m.mes
     GROUP BY m.mes ORDER BY m.mes`);

  const ultimos = await query(`
    SELECT m.id, m.fecha, m.tipo, m.documento_numero, m.cantidad_entrada, m.cantidad_salida, m.cantidad_devolucion,
           m.estado_stock, m.valor, p.sku, p.nombre AS producto_nombre, p.unidad_medida, u.nombre AS usuario_nombre
      FROM movimientos_inventario m JOIN productos p ON p.id = m.producto_id JOIN usuarios u ON u.id = m.usuario_id
     ORDER BY m.id DESC LIMIT 8`);

  const criticos = await query(`
    SELECT p.id, p.sku, p.nombre, p.unidad_medida, p.stock_minimo, COALESCE(SUM(s.disponible),0) AS disponible
      FROM productos p LEFT JOIN stock s ON s.producto_id = p.id
     WHERE p.activo GROUP BY p.id
    HAVING COALESCE(SUM(s.disponible),0) = 0 OR (p.stock_minimo > 0 AND COALESCE(SUM(s.disponible),0) <= p.stock_minimo)
     ORDER BY COALESCE(SUM(s.disponible),0) / NULLIF(p.stock_minimo,0) NULLS FIRST LIMIT 6`);

  const topProyectos = await query(`
    SELECT pr.id, pr.codigo, pr.nombre,
           SUM((d.cantidad - d.cantidad_devuelta) * d.costo_unitario) AS valor
      FROM proyectos pr JOIN salidas s ON s.proyecto_id = pr.id AND s.estado = 'DESPACHADA'
      JOIN detalle_salidas d ON d.salida_id = s.id
     GROUP BY pr.id ORDER BY valor DESC LIMIT 5`);

  return {
    kpis: { ...kpi.rows[0], ...docs.rows[0] },
    serie: serie.rows,
    ultimos_movimientos: ultimos.rows,
    productos_criticos: criticos.rows,
    top_proyectos: topProyectos.rows,
  };
}

module.exports = { resumen };
