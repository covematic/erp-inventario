const { withTransaction, query } = require('../config/db');
const inventario = require('./inventarioService');
const AppError = require('../utils/AppError');
const { siguienteNumero, q3, paginacion, Filtros } = require('../utils/helpers');

/**
 * Ajustes de inventario (solo supervisor/administrador):
 * - INCREMENTO / DISMINUCION: corrigen el stock disponible (p. ej. tras un conteo físico).
 * - BAJA_DANADO / BAJA_DEFECTUOSO: dan de baja definitiva unidades no aptas.
 */
const REGLAS = {
  INCREMENTO: { campo: 'disponible', signo: 1, estado: 'DISPONIBLE' },
  DISMINUCION: { campo: 'disponible', signo: -1, estado: 'DISPONIBLE' },
  BAJA_DANADO: { campo: 'danado', signo: -1, estado: 'DANADO' },
  BAJA_DEFECTUOSO: { campo: 'defectuoso', signo: -1, estado: 'DEFECTUOSO' },
};

async function crear(data, user) {
  return withTransaction(async (client) => {
    const regla = REGLAS[data.tipo];
    const numero = await siguienteNumero(client, 'ajuste');
    const { rows } = await client.query(
      `INSERT INTO ajustes (numero, fecha, producto_id, almacen_id, tipo, cantidad, motivo, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [numero, data.fecha, data.producto_id, data.almacen_id, data.tipo, q3(data.cantidad), data.motivo, user.id]
    );
    const ajuste = rows[0];
    const cantidad = q3(data.cantidad);
    await inventario.aplicarMovimiento(client, {
      productoId: data.producto_id,
      almacenId: data.almacen_id,
      delta: { [regla.campo]: regla.signo * cantidad },
      kardex: {
        tipo: 'AJUSTE', documentoTipo: 'AJUSTE', documentoId: ajuste.id, documentoNumero: numero,
        entrada: regla.signo > 0 ? cantidad : 0,
        salida: regla.signo < 0 ? cantidad : 0,
        estadoStock: regla.estado, usuarioId: user.id, fecha: data.fecha,
        observacion: `${data.tipo.replace('_', ' ').toLowerCase()}: ${data.motivo}`,
      },
    });
    return ajuste;
  });
}

async function listar(q) {
  const { page, limit, offset } = paginacion(q);
  const w = new Filtros()
    .add('a.fecha >= ?', q.desde).add('a.fecha <= ?', q.hasta)
    .add('a.producto_id = ?', q.producto_id).add('a.tipo = ?', q.tipo);
  const where = w.where();
  const total = await query(`SELECT COUNT(*)::int AS n FROM ajustes a ${where}`, w.params);
  const data = await query(
    `SELECT a.*, p.sku, p.nombre AS producto_nombre, al.nombre AS almacen_nombre, u.nombre AS usuario_nombre
       FROM ajustes a JOIN productos p ON p.id = a.producto_id JOIN almacenes al ON al.id = a.almacen_id
       JOIN usuarios u ON u.id = a.usuario_id ${where}
      ORDER BY a.id DESC LIMIT ${w.next(limit)} OFFSET ${w.next(offset)}`,
    w.params
  );
  return { data: data.rows, total: total.rows[0].n, page, limit };
}

module.exports = { crear, listar };
