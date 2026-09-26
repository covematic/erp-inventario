const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/** Valida que los parámetros :id y :productoId sean enteros positivos. */
function validarIds(router) {
  for (const nombre of ['id', 'productoId']) {
    router.param(nombre, (req, res, next, valor) => {
      if (!/^\d+$/.test(valor) || Number(valor) <= 0) return next(AppError.badRequest('Identificador inválido'));
      next();
    });
  }
  return router;
}

module.exports = { h: asyncHandler, validarIds };
