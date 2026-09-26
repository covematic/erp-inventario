/**
 * Limita los intentos de inicio de sesión por IP (10 cada 15 minutos)
 * para dificultar ataques de fuerza bruta cuando el sistema está en internet.
 */
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 10;
const intentos = new Map();

module.exports = function loginLimiter(req, res, next) {
  if (req.method !== 'POST') return next();
  const ahora = Date.now();
  const ip = req.ip;
  const reg = intentos.get(ip) || { n: 0, desde: ahora };
  if (ahora - reg.desde > VENTANA_MS) { reg.n = 0; reg.desde = ahora; }
  reg.n += 1;
  intentos.set(ip, reg);
  if (reg.n > MAX_INTENTOS) {
    const min = Math.ceil((VENTANA_MS - (ahora - reg.desde)) / 60000);
    return res.status(429).json({ message: `Demasiados intentos de inicio de sesión. Intente de nuevo en ${min} minuto(s).` });
  }
  // Un login correcto reinicia el contador
  res.on('finish', () => { if (res.statusCode === 200) intentos.delete(ip); });
  next();
};
