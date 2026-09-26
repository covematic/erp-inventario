/**
 * NÚCLEO DEL INVENTARIO
 * ---------------------
 * Es el único lugar del sistema que modifica la tabla `stock`.
 * Cada cambio de stock físico queda registrado en el Kardex (movimientos_inventario)
 * dentro de la misma transacción, por lo que stock e historial nunca se desincronizan.
 */
const stockModel = require('../models/stockModel');
const movimientoModel = require('../models/movimientoModel');
const AppError = require('../utils/AppError');
const { q3, q4 } = require('../utils/helpers');

const CAMPOS = ['disponible', 'comprometido', 'danado', 'defectuoso'];
const ETIQUETA = {
  disponible: 'disponible',
  comprometido: 'comprometido',
  danado: 'dañado',
  defectuoso: 'defectuoso',
};

const saldoFisico = (s) => q3(CAMPOS.reduce((acc, c) => acc + Number(s[c]), 0));

/**
 * Aplica una variación de stock y, si corresponde, escribe el Kardex.
 *
 * @param {object} client  cliente de la transacción activa
 * @param {object} op
 *   productoId, almacenId
 *   delta: { disponible?, comprometido?, danado?, defectuoso? }  (+ suma, - resta)
 *   kardex?: { tipo, documentoTipo, documentoId, documentoNumero, entrada?, salida?,
 *              devolucion?, estadoStock?, costoUnitario, usuarioId, fecha?, observacion? }
 * @returns {object} fila de stock actualizada
 */
async function aplicarMovimiento(client, { productoId, almacenId, delta, kardex }) {
  const actual = await stockModel.lock(client, productoId, almacenId);
  if (!actual) throw AppError.notFound('Producto no encontrado');

  const nuevo = {};
  for (const campo of CAMPOS) {
    nuevo[campo] = q3(Number(actual[campo]) + Number(delta[campo] || 0));
    if (nuevo[campo] < 0) {
      throw AppError.conflict(
        `Stock ${ETIQUETA[campo]} insuficiente para "${actual.producto_nombre}" (${actual.sku}). ` +
        `Disponible: ${Number(actual[campo])} ${actual.unidad_medida}, requerido: ${Math.abs(Number(delta[campo]))}.`,
        [{ producto_id: productoId, sku: actual.sku, producto: actual.producto_nombre, campo, actual: Number(actual[campo]), requerido: Math.abs(Number(delta[campo])) }]
      );
    }
  }

  const actualizado = await stockModel.update(client, productoId, almacenId, nuevo);

  if (kardex) {
    const cantidad = (kardex.entrada || 0) + (kardex.salida || 0) + (kardex.devolucion || 0);
    const costo = q4(kardex.costoUnitario ?? actual.costo_promedio);
    await movimientoModel.insert(client, {
      ...kardex,
      productoId,
      almacenId,
      saldo: saldoFisico(actualizado),
      costoUnitario: costo,
      valor: q4(cantidad * costo),
    });
  }
  return actualizado;
}

/**
 * Verifica, con las filas BLOQUEADAS, que haya stock disponible para todas las líneas.
 * Devuelve la lista de faltantes (vacía si todo alcanza). No modifica nada.
 */
async function verificarDisponibilidad(client, almacenId, items) {
  const faltantes = [];
  // Orden por producto_id para bloquear siempre en el mismo orden y evitar deadlocks
  const ordenados = [...items].sort((a, b) => a.producto_id - b.producto_id);
  for (const it of ordenados) {
    const s = await stockModel.lock(client, it.producto_id, almacenId);
    if (!s) throw AppError.badRequest(`El producto ${it.producto_id} no existe`);
    if (!s.producto_activo) throw AppError.badRequest(`El producto "${s.producto_nombre}" está inactivo`);
    if (Number(it.cantidad) > Number(s.disponible)) {
      faltantes.push({
        producto_id: it.producto_id,
        sku: s.sku,
        producto: s.producto_nombre,
        unidad: s.unidad_medida,
        solicitado: Number(it.cantidad),
        disponible: Number(s.disponible),
      });
    }
  }
  return faltantes;
}

module.exports = { aplicarMovimiento, verificarDisponibilidad, saldoFisico };
