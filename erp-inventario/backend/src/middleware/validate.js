const AppError = require('../utils/AppError');

/**
 * Valida req[source] con un esquema Zod y reemplaza el valor por el dato limpio.
 * Devuelve 400 con la lista de campos inválidos.
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errores = result.error.issues.map((i) => ({
      campo: i.path.join('.'),
      mensaje: i.message,
    }));
    return next(AppError.badRequest('Revise los datos del formulario', errores));
  }
  req[source] = result.data;
  next();
};

module.exports = { validate };
