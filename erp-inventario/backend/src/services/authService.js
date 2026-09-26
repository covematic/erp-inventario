const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuarioModel');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const AppError = require('../utils/AppError');

async function login(email, password) {
  const u = await usuarioModel.findByEmailConHash(email);
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    throw AppError.unauthorized('Correo o contraseña incorrectos');
  }
  if (!u.activo) throw AppError.unauthorized('El usuario está desactivado. Contacte al administrador');
  const token = jwt.sign({ sub: u.id, rol: u.rol }, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token, user: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } };
}

module.exports = { login };
