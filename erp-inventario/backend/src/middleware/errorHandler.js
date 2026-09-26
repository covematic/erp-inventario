const AppError = require('../utils/AppError');

const MENSAJES_CHECK = {
  stock_disponible_check: 'La operación dejaría el stock disponible en negativo',
  stock_comprometido_check: 'La operación dejaría el stock comprometido en negativo',
  stock_danado_check: 'La operación dejaría el stock dañado en negativo',
  stock_defectuoso_check: 'La operación dejaría el stock defectuoso en negativo',
  chk_devuelta: 'La cantidad devuelta no puede superar la cantidad despachada',
  chk_destino: 'La guía debe indicar un proyecto o un área según el destino',
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, details: err.details });
  }

  // Errores de PostgreSQL traducidos a mensajes claros
  switch (err.code) {
    case '23505':
      return res.status(409).json({
        message: `Ya existe un registro con ese valor${err.detail ? ` (${err.detail.replace(/^Key /, '').replace(/ already exists\.?/, '')})` : ''}`,
      });
    case '23503':
      return res.status(409).json({
        message: 'El registro está relacionado con otros datos y no puede eliminarse, o hace referencia a un dato inexistente',
      });
    case '23514':
      return res.status(400).json({
        message: MENSAJES_CHECK[err.constraint] || `Dato fuera de rango (${err.constraint})`,
      });
    case '23502':
      return res.status(400).json({ message: `Falta el campo obligatorio ${err.column}` });
    case '22P02':
      return res.status(400).json({ message: 'Formato de dato inválido' });
    default:
      break;
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la solicitud no es JSON válido' });
  }

  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor' });
}

function notFound(req, res) {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
