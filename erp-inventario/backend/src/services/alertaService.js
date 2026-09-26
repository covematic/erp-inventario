const { query } = require('../config/db');

/** Guarda una alerta por cada producto de una salida rechazada por falta de stock. */
async function registrarIntentoRechazado(faltantes, user) {
  for (const f of faltantes) {
    await query(
      `INSERT INTO alertas (tipo, mensaje, producto_id, usuario_id) VALUES ('SALIDA_RECHAZADA', $1, $2, $3)`,
      [`Intento de salida de ${f.solicitado} ${f.unidad} de "${f.producto}" con solo ${f.disponible} disponibles`, f.producto_id, user.id]
    );
  }
}

/**
 * Alertas vigentes. Las de stock se calculan en tiempo real;
 * los intentos rechazados vienen de la tabla alertas (no leídas).
 */
async function listar() {
  const stock = await query(`
    SELECT p.id AS producto_id, p.sku, p.nombre, p.unidad_medida, p.stock_minimo,
           COALESCE(SUM(s.disponible),0) AS disponible,
           COALESCE(SUM(s.danado),0) AS danado, COALESCE(SUM(s.defectuoso),0) AS defectuoso
      FROM productos p LEFT JOIN stock s ON s.producto_id = p.id
     WHERE p.activo
     GROUP BY p.id`);

  const alertas = [];
  for (const r of stock.rows) {
    if (Number(r.disponible) === 0) {
      alertas.push({ tipo: 'AGOTADO', nivel: 'critico', producto_id: r.producto_id, sku: r.sku, titulo: `${r.nombre} está agotado`, mensaje: `Sin stock disponible (mínimo ${r.stock_minimo} ${r.unidad_medida})` });
    } else if (Number(r.stock_minimo) > 0 && Number(r.disponible) <= Number(r.stock_minimo)) {
      alertas.push({ tipo: 'STOCK_BAJO', nivel: 'advertencia', producto_id: r.producto_id, sku: r.sku, titulo: `${r.nombre} llegó al stock mínimo`, mensaje: `Disponible ${r.disponible} ${r.unidad_medida} · mínimo ${r.stock_minimo}` });
    }
    if (Number(r.danado) > 0 || Number(r.defectuoso) > 0) {
      alertas.push({ tipo: 'NO_APTO', nivel: 'info', producto_id: r.producto_id, sku: r.sku, titulo: `${r.nombre} tiene unidades no aptas`, mensaje: `Dañado: ${r.danado} · Defectuoso: ${r.defectuoso} ${r.unidad_medida}` });
    }
  }

  const pendientes = await query(`
    SELECT s.id AS salida_id, s.numero, s.responsable, s.fecha_retorno_estimada,
           COALESCE(pr.codigo || ' · ' || pr.nombre, ar.nombre) AS destino,
           SUM(d.cantidad - d.cantidad_devuelta) AS pendiente, COUNT(*)::int AS productos,
           (s.fecha_retorno_estimada IS NOT NULL AND s.fecha_retorno_estimada < CURRENT_DATE) AS vencida
      FROM salidas s
      JOIN detalle_salidas d ON d.salida_id = s.id
      LEFT JOIN proyectos pr ON pr.id = s.proyecto_id
      LEFT JOIN areas ar ON ar.id = s.area_id
     WHERE s.estado = 'DESPACHADA' AND s.requiere_devolucion AND d.cantidad > d.cantidad_devuelta
     GROUP BY s.id, pr.codigo, pr.nombre, ar.nombre
     ORDER BY s.fecha_retorno_estimada NULLS LAST`);
  for (const p of pendientes.rows) {
    alertas.push({
      tipo: 'PENDIENTE_DEVOLUCION', nivel: p.vencida ? 'critico' : 'advertencia', salida_id: p.salida_id,
      titulo: `${p.numero} tiene productos pendientes de devolución`,
      mensaje: `${p.destino} · ${p.pendiente} unidades en ${p.productos} producto(s)${p.fecha_retorno_estimada ? ` · retorno ${p.vencida ? 'vencido el' : 'previsto'} ${p.fecha_retorno_estimada}` : ''}`,
    });
  }

  const rechazos = await query(`
    SELECT a.id, a.mensaje, a.created_at, a.producto_id, u.nombre AS usuario_nombre
      FROM alertas a LEFT JOIN usuarios u ON u.id = a.usuario_id
     WHERE NOT a.leida ORDER BY a.id DESC LIMIT 50`);
  for (const r of rechazos.rows) {
    alertas.push({ tipo: 'SALIDA_RECHAZADA', nivel: 'advertencia', id: r.id, producto_id: r.producto_id, titulo: 'Salida rechazada por stock insuficiente', mensaje: `${r.mensaje} · ${r.usuario_nombre || ''}`, fecha: r.created_at });
  }

  const orden = { critico: 0, advertencia: 1, info: 2 };
  alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  const resumen = alertas.reduce((acc, a) => ({ ...acc, [a.tipo]: (acc[a.tipo] || 0) + 1 }), {});
  return { total: alertas.length, resumen, data: alertas };
}

async function marcarLeida(id) {
  await query('UPDATE alertas SET leida = TRUE WHERE id = $1', [id]);
}

async function marcarTodasLeidas() {
  await query('UPDATE alertas SET leida = TRUE WHERE NOT leida');
}

module.exports = { registrarIntentoRechazado, listar, marcarLeida, marcarTodasLeidas };
