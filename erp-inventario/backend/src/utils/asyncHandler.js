/** Envuelve un controlador async para enviar los errores al errorHandler. */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
