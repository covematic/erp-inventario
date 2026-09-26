const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');

/** Verifica el token JWT y carga req.user = { id, nombre, email, rol }. */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [tipo, token] = header.split(' ');
    if (tipo !== 'Bearer' || !token) throw AppError.unauthorized('Debe iniciar sesión');

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      throw AppError.unauthorized('La sesión expiró o el token no es válido');
    }

    const { rows } = await query(
      `SELECT u.id, u.nombre, u.email, u.activo, r.nombre AS rol
         FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = $1`,
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.activo) throw AppError.unauthorized('Usuario inactivo o inexistente');

    req.user = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
