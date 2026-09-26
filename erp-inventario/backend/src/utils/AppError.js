/** Error de negocio con código HTTP y detalle opcional para el cliente. */
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(msg, details) { return new AppError(400, msg, details); }
  static unauthorized(msg = 'No autenticado') { return new AppError(401, msg); }
  static forbidden(msg = 'No tiene permisos para realizar esta operación') { return new AppError(403, msg); }
  static notFound(msg = 'Registro no encontrado') { return new AppError(404, msg); }
  static conflict(msg, details) { return new AppError(409, msg, details); }
}

module.exports = AppError;
