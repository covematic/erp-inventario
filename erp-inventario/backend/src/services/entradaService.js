const { withTransaction, query } = require('../config/db');
const entradaModel = require('../models/entradaModel');
const stockModel = require('../models/stockModel');
const inventario = require('./inventarioService');
const AppError = require('../utils/AppError');
const { siguienteNumero, q3, q4, paginacion } = require('../utils/helpers');

/**
 * Registra y confirma una entrada:
 * Proveedor → Registro de entrada → Actualización del stock → Kardex.
 * También recalcula el costo promedio ponderado de cada producto.
 */
async function crear(data, user) {
  return withTransaction(async (client) => {
    const prov = await client.query('SELECT id, activo FROM proveedores WHERE id = $1', [data.proveedor_id]);
    if (!prov.rows[0]) throw AppError.badRequest('El proveedor no existe');
    if (!prov.rows[0].activo) throw AppError.badRequest('El proveedor está inactivo');
    const alm = await client.query('SELECT id FROM almacenes WHERE id = $1 AND activo', [data.almacen_id]);
    if (!alm.rows[0]) throw AppError.badRequest('El almacén no existe o está inactivo');

    const numero = await siguienteNumero(client, 'entrada');
    const cab = await entradaModel.insertCabecera(client, { ...data, numero, usuario_id: user.id });

    let total = 0;
    const items = [...data.items].sort((a, b) => a.producto_id - b.producto_id);
    for (const it of items) {
      const prodRes = await client.query('SELECT id, nombre, activo, costo_promedio FROM productos WHERE id = $1 FOR UPDATE', [it.producto_id]);
      const prod = prodRes.rows[0];
      if (!prod) throw AppError.badRequest(`El producto ${it.producto_id} no existe`);
      if (!prod.activo) throw AppError.badRequest(`El producto "${prod.nombre}" está inactivo`);

      const cantidad = q3(it.cantidad);
      const costoUnit = q4(it.costo_unitario);
      const costoTotal = q4(cantidad * costoUnit);
      total += costoTotal;

      await entradaModel.insertDetalle(client, {
        entrada_id: cab.id, producto_id: it.producto_id, cantidad, costo_unitario: costoUnit, costo_total: costoTotal,
      });

      // Costo promedio ponderado
      const stockPrevio = await stockModel.totalUsable(client, it.producto_id);
      const nuevoPromedio = stockPrevio + cantidad > 0
        ? q4((stockPrevio * Number(prod.costo_promedio) + cantidad * costoUnit) / (stockPrevio + cantidad))
        : costoUnit;
      await client.query(
        'UPDATE productos SET costo_promedio = $2, precio_compra = $3, updated_at = NOW() WHERE id = $1',
        [it.producto_id, nuevoPromedio, costoUnit]
      );

      await inventario.aplicarMovimiento(client, {
        productoId: it.producto_id,
        almacenId: data.almacen_id,
        delta: { disponible: cantidad },
        kardex: {
          tipo: 'ENTRADA', documentoTipo: 'ENTRADA', documentoId: cab.id, documentoNumero: numero,
          entrada: cantidad, costoUnitario: costoUnit, usuarioId: user.id, fecha: data.fecha,
        },
      });
    }
    await entradaModel.setTotal(client, cab.id, q4(total));
    return { ...cab, total: q4(total) };
  });
}

/**
 * Anula una entrada: retira del stock disponible lo que ingresó.
 * Solo es posible si ese stock sigue disponible (no fue despachado).
 */
async function anular(id, motivo, user) {
  return withTransaction(async (client) => {
    const ent = await entradaModel.lockById(client, id);
    if (!ent) throw AppError.notFound('Entrada no encontrada');
    if (ent.estado === 'ANULADA') throw AppError.conflict('La entrada ya fue anulada');

    const detalles = await entradaModel.detalles(client, id);
    for (const d of detalles.sort((a, b) => a.producto_id - b.producto_id)) {
      try {
        await inventario.aplicarMovimiento(client, {
          productoId: d.producto_id,
          almacenId: ent.almacen_id,
          delta: { disponible: -Number(d.cantidad) },
          kardex: {
            tipo: 'ANULACION', documentoTipo: 'ENTRADA', documentoId: ent.id, documentoNumero: ent.numero,
            salida: Number(d.cantidad), costoUnitario: Number(d.costo_unitario), usuarioId: user.id,
            observacion: `Anulación de entrada: ${motivo}`,
          },
        });
      } catch (err) {
        if (err instanceof AppError && err.status === 409) {
          throw AppError.conflict(
            `No se puede anular ${ent.numero}: parte de "${d.producto_nombre}" ya fue despachada. ${err.message}`,
            err.details
          );
        }
        throw err;
      }
    }
    await entradaModel.anular(client, id, user.id, motivo);
    return { id, estado: 'ANULADA' };
  });
}

async function listar(q) {
  const pag = paginacion(q);
  const r = await entradaModel.list(q, pag);
  return { ...r, page: pag.page, limit: pag.limit };
}

async function obtener(id) {
  const ent = await entradaModel.findById(id);
  if (!ent) throw AppError.notFound('Entrada no encontrada');
  ent.detalles = await entradaModel.detalles({ query }, id);
  return ent;
}

module.exports = { crear, anular, listar, obtener };
