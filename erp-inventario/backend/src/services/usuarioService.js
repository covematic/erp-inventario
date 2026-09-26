const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuarioModel');
const AppError = require('../utils/AppError');

async function crear(data) {
  if (!data.password) throw AppError.badRequest('La contraseña es obligatoria', [{ campo: 'password', mensaje: 'La contraseña es obligatoria' }]);
  const password_hash = await bcrypt.hash(data.password, 10);
  const id = await usuarioModel.create({ ...data, password_hash });
  return usuarioModel.findById(id);
}

async function actualizar(id, data, actor) {
  if (id === actor.id && data.activo === false) throw AppError.badRequest('No puede desactivar su propio usuario');
  const cambios = { ...data };
  delete cambios.password;
  if (data.password) cambios.password_hash = await bcrypt.hash(data.password, 10);
  const n = await usuarioModel.update(id, cambios);
  if (!n) throw AppError.notFound('Usuario no encontrado');
  return usuarioModel.findById(id);
}

module.exports = {
  listar: usuarioModel.list,
  roles: usuarioModel.roles,
  crear,
  actualizar,
};
