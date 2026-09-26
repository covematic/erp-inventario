const { withTransaction } = require('../config/db');
const devolucionModel = require('../models/devolucionModel');
const salidaModel = require('../models/salidaModel');
const inventario = require('./inventarioService');
const AppError = require('../utils/AppError');
const { siguienteNumero, q3, paginacion } = require('../utils/helpers');

// Destino del stock según el estado del producto devuelto
const DESTINO = { BUENO: 'disponible', DANADO: 'danado', DEFECTUOSO: 'defectuoso' };
const ESTADO_STOCK = { BUENO: 'DISPONIBLE', DANADO: 'DANADO', DEFECTUOSO: 'DEFECTUOSO' };

/**
 * Registra una devolución vinculada a una guía de salida despachada.
 * Salida existente → Registro → Validación de cantidad → Evaluación del estado → Stock → Kardex.
 */
async function crear(data, user) {
  return withTransaction(async (client) => {
    const salida = await salidaModel.lockById(client, data.salida_id);
    if (!salida) throw AppError.badRequest('La guía de salida indicada no existe');
    if (salida.estado !== 'DESPACHADA') {
      throw AppError.conflict(`La guía ${salida.numero} está ${salida.estado.toLowerCase()}; solo se aceptan devoluciones de guías despachadas`);
    }
    if (data.fecha < salida.fecha) {
      throw AppError.badRequest(`La fecha de devolución no puede ser anterior a la guía (${salida.fecha})`);
    }

    const lineas = await salidaModel.detalles(client, salida.id, { lock: true });
    const porId = new Map(lineas.map((l) => [l.id, l]));

    // Una misma línea puede devolverse en partes con distinto estado (ej. 8 buenos + 2 dañados):
    // se suma todo lo solicitado por línea antes de validar.
    const solicitado = new Map();
    for (const it of data.items) {
      const linea = porId.get(it.detalle_salida_id);
      if (!linea) throw AppError.badRequest('Uno de los productos no pertenece a la guía seleccionada');
      solicitado.set(linea.id, q3((solicitado.get(linea.id) || 0) + Number(it.cantidad)));
    }
    const excedidos = [];
    for (const [lineaId, cant] of solicitado) {
      const l = porId.get(lineaId);
      const maximo = q3(Number(l.cantidad) - Number(l.cantidad_devuelta));
      if (cant > maximo) {
        excedidos.push({ producto: l.producto_nombre, sku: l.sku, despachado: Number(l.cantidad), ya_devuelto: Number(l.cantidad_devuelta), maximo, solicitado: cant });
      }
    }
    if (excedidos.length) {
      const lista = excedidos.map((e) => `${e.producto}: se intenta devolver ${e.solicitado}, máximo ${e.maximo} (despachado ${e.despachado}, ya devuelto ${e.ya_devuelto})`).join('; ');
      throw AppError.conflict(`La cantidad devuelta supera lo retirado en la guía. ${lista}`, excedidos);
    }

    const numero = await siguienteNumero(client, 'devolucion');
    const cab = await devolucionModel.insertCabecera(client, { ...data, numero, usuario_id: user.id });

    const items = [...data.items].sort((a, b) => porId.get(a.detalle_salida_id).producto_id - porId.get(b.detalle_salida_id).producto_id);
    for (const it of items) {
      const linea = porId.get(it.detalle_salida_id);
      const cantidad = q3(it.cantidad);
      await devolucionModel.insertDetalle(client, {
        devolucion_id: cab.id, detalle_salida_id: linea.id, producto_id: linea.producto_id, cantidad, estado_producto: it.estado_producto,
      });
      await devolucionModel.sumarDevuelto(client, linea.id, cantidad);
      await inventario.aplicarMovimiento(client, {
        productoId: linea.producto_id,
        almacenId: salida.almacen_id,
        delta: { [DESTINO[it.estado_producto]]: cantidad },
        kardex: {
          tipo: 'DEVOLUCION', documentoTipo: 'DEVOLUCION', documentoId: cab.id, documentoNumero: numero,
          devolucion: cantidad, estadoStock: ESTADO_STOCK[it.estado_producto],
          costoUnitario: Number(linea.costo_unitario), usuarioId: user.id, fecha: data.fecha,
          observacion: `Devolución de ${salida.numero} (${it.estado_producto.toLowerCase()})`,
        },
      });
    }
    return cab;
  });
}

async function listar(q) {
  const pag = paginacion(q);
  const r = await devolucionModel.list(q, pag);
  return { ...r, page: pag.page, limit: pag.limit };
}

async function obtener(id) {
  const d = await devolucionModel.findById(id);
  if (!d) throw AppError.notFound('Devolución no encontrada');
  d.detalles = await devolucionModel.detalles(id);
  return d;
}

module.exports = { crear, listar, obtener };
