const { z } = require('zod');

const texto = (max, label) =>
  z.string({ required_error: `${label} es obligatorio`, invalid_type_error: `${label} debe ser texto` })
    .trim().min(1, `${label} es obligatorio`).max(max, `${label} admite máximo ${max} caracteres`);

const textoOpcional = (max) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).optional().nullable()
    .transform((v) => (v === '' || v === undefined ? null : v));

const id = (label) =>
  z.coerce.number({ invalid_type_error: `${label} es obligatorio` }).int().positive(`${label} es obligatorio`);

const idOpcional = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.number().int().positive().nullable()
);

const cantidad = (label = 'La cantidad') =>
  z.coerce.number({ invalid_type_error: `${label} debe ser un número` })
    .positive(`${label} debe ser mayor a 0`)
    .max(999999999, `${label} es demasiado grande`)
    .refine((n) => Number.isInteger(Math.round(n * 1000)), 'Máximo 3 decimales');

const monto = (label) =>
  z.coerce.number({ invalid_type_error: `${label} debe ser un número` })
    .min(0, `${label} no puede ser negativo`).max(9999999999, `${label} es demasiado grande`);

const fecha = (label = 'La fecha') =>
  z.string({ required_error: `${label} es obligatoria` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} debe tener formato AAAA-MM-DD`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `${label} no es válida`);

const fechaOpcional = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').nullable()
);

const motivoAnulacion = z.object({
  motivo: texto(500, 'El motivo de anulación'),
});

module.exports = { z, texto, textoOpcional, id, idOpcional, cantidad, monto, fecha, fechaOpcional, motivoAnulacion };
