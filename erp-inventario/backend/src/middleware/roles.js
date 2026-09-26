const AppError = require('../utils/AppError');

/** Restringe una ruta a los roles indicados. ADMIN siempre tiene acceso. */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(AppError.unauthorized());
  if (req.user.rol === 'ADMIN' || roles.includes(req.user.rol)) return next();
  next(AppError.forbidden());
};

module.exports = { authorize };
