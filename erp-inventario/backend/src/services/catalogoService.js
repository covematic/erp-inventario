const catalogoModel = require('../models/catalogoModel');
const AppError = require('../utils/AppError');

const listar = (tabla, q) => catalogoModel.list(tabla, q);

async function crear(tabla, data) {
  return catalogoModel.create(tabla, data);
}

async function actualizar(tabla, id, data) {
  const r = await catalogoModel.update(tabla, id, data);
  if (!r) throw AppError.notFound();
  return r;
}

/** Elimina el registro; si está en uso (FK), lo desactiva para no romper la integridad. */
async function eliminar(tabla, id) {
  const actual = await catalogoModel.findById(tabla, id);
  if (!actual) throw AppError.notFound();
  try {
    await catalogoModel.remove(tabla, id);
    return { eliminado: true, message: 'Registro eliminado' };
  } catch (err) {
    if (err.code !== '23503') throw err;
    await catalogoModel.update(tabla, id, { activo: false });
    return { eliminado: false, desactivado: true, message: 'El registro está en uso; se desactivó en lugar de eliminarse' };
  }
}

module.exports = { listar, crear, actualizar, eliminar };
