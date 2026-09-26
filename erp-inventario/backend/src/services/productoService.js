const productoModel = require('../models/productoModel');
const AppError = require('../utils/AppError');
const { paginacion } = require('../utils/helpers');

async function listar(q) {
  const pag = paginacion(q, 1000);
  const r = await productoModel.list(q, pag);
  return { ...r, page: pag.page, limit: pag.limit };
}

async function obtener(id) {
  const p = await productoModel.findById(id);
  if (!p) throw AppError.notFound('Producto no encontrado');
  return p;
}

async function crear(data) {
  const id = await productoModel.create(data);
  return productoModel.findById(id);
}

// El stock NO se edita aquí: solo cambia con entradas, salidas, devoluciones y ajustes.
async function actualizar(id, data) {
  const n = await productoModel.update(id, data);
  if (!n) throw AppError.notFound('Producto no encontrado');
  return productoModel.findById(id);
}

async function cambiarEstado(id, activo) {
  const n = await productoModel.update(id, { activo });
  if (!n) throw AppError.notFound('Producto no encontrado');
  return productoModel.findById(id);
}

/**
 * Elimina el producto si nunca tuvo movimientos; si los tuvo, lo desactiva
 * para conservar el historial (Kardex).
 */
async function eliminar(id) {
  const p = await productoModel.findById(id);
  if (!p) throw AppError.notFound('Producto no encontrado');
  if (await productoModel.tieneMovimientos(id)) {
    await productoModel.update(id, { activo: false });
    return { eliminado: false, desactivado: true, message: 'El producto tiene movimientos registrados; se desactivó para conservar su historial' };
  }
  await productoModel.remove(id);
  return { eliminado: true, message: 'Producto eliminado' };
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar };
