const { z, texto, textoOpcional, id, idOpcional, cantidad, monto, fecha, fechaOpcional, motivoAnulacion } = require('./common');

const login = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

const usuario = z.object({
  nombre: texto(120, 'El nombre'),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(150),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100).optional(),
  rol_id: id('El rol'),
  activo: z.boolean().optional().default(true),
});

const producto = z.object({
  sku: texto(40, 'El código/SKU').transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z0-9._-]+$/.test(v), 'El SKU solo admite letras, números, punto, guion y guion bajo'),
  nombre: texto(200, 'El nombre'),
  descripcion: textoOpcional(2000),
  categoria_id: id('La categoría'),
  proveedor_id: idOpcional,
  unidad_medida: texto(20, 'La unidad de medida'),
  precio_compra: monto('El precio de compra'),
  precio_venta: monto('El precio de venta'),
  stock_minimo: monto('El stock mínimo'),
  activo: z.boolean().optional().default(true),
});

const categoria = z.object({
  nombre: texto(100, 'El nombre'),
  descripcion: textoOpcional(250),
  activo: z.boolean().optional().default(true),
});

const proveedor = z.object({
  ruc: texto(20, 'El RUC').refine((v) => /^\d{8,20}$/.test(v), 'El RUC debe contener solo dígitos (8 a 20)'),
  razon_social: texto(200, 'La razón social'),
  contacto: textoOpcional(120),
  telefono: textoOpcional(30),
  email: z.preprocess((v) => (v === '' ? null : v), z.string().email('Correo inválido').max(150).nullable().optional()),
  direccion: textoOpcional(250),
  activo: z.boolean().optional().default(true),
});

const almacen = z.object({
  codigo: texto(20, 'El código').transform((v) => v.toUpperCase()),
  nombre: texto(120, 'El nombre'),
  ubicacion: textoOpcional(250),
  activo: z.boolean().optional().default(true),
});

const area = z.object({
  nombre: texto(120, 'El nombre'),
  activo: z.boolean().optional().default(true),
});

const proyecto = z.object({
  codigo: texto(30, 'El código').transform((v) => v.toUpperCase()),
  nombre: texto(200, 'El nombre'),
  cliente: textoOpcional(200),
  responsable: texto(120, 'El responsable'),
  ubicacion: textoOpcional(250),
  fecha_inicio: fecha('La fecha de inicio'),
  fecha_fin: fechaOpcional,
  estado: z.enum(['ACTIVO', 'CERRADO']).optional().default('ACTIVO'),
}).refine((p) => !p.fecha_fin || p.fecha_fin >= p.fecha_inicio, {
  message: 'La fecha de fin no puede ser anterior a la de inicio', path: ['fecha_fin'],
});

const lineasUnicas = (lineas) => new Set(lineas.map((l) => l.producto_id)).size === lineas.length;

const entrada = z.object({
  fecha: fecha(),
  documento_ref: textoOpcional(60),
  proveedor_id: id('El proveedor'),
  almacen_id: id('El almacén'),
  observaciones: textoOpcional(2000),
  items: z.array(z.object({
    producto_id: id('El producto'),
    cantidad: cantidad(),
    costo_unitario: monto('El costo unitario'),
  })).min(1, 'Agregue al menos un producto')
    .refine(lineasUnicas, 'Un producto no puede repetirse en la misma entrada'),
});

const MOTIVOS_SALIDA = ['VENTA', 'CONSUMO_INTERNO', 'PROYECTO', 'TRASLADO', 'DANO', 'PERDIDA', 'OTROS'];

const salida = z.object({
  fecha: fecha(),
  numero_guia: textoOpcional(60),
  almacen_id: id('El almacén'),
  tipo_destino: z.enum(['PROYECTO', 'AREA'], { errorMap: () => ({ message: 'Seleccione el destino (proyecto o área)' }) }),
  proyecto_id: idOpcional,
  area_id: idOpcional,
  motivo: z.enum(MOTIVOS_SALIDA, { errorMap: () => ({ message: 'Seleccione un motivo válido' }) }),
  responsable: texto(120, 'El responsable'),
  requiere_devolucion: z.boolean().optional().default(false),
  fecha_retorno_estimada: fechaOpcional,
  despachar: z.boolean().optional().default(true),
  observaciones: textoOpcional(2000),
  items: z.array(z.object({
    producto_id: id('El producto'),
    cantidad: cantidad(),
  })).min(1, 'Agregue al menos un producto a la guía')
    .refine(lineasUnicas, 'Un producto no puede repetirse en la misma guía'),
})
  .refine((s) => s.tipo_destino !== 'PROYECTO' || s.proyecto_id, { message: 'Seleccione el proyecto', path: ['proyecto_id'] })
  .refine((s) => s.tipo_destino !== 'AREA' || s.area_id, { message: 'Seleccione el área solicitante', path: ['area_id'] })
  .refine((s) => !s.fecha_retorno_estimada || s.fecha_retorno_estimada >= s.fecha, {
    message: 'La fecha de retorno no puede ser anterior a la fecha de la guía', path: ['fecha_retorno_estimada'],
  })
  .transform((s) => ({
    ...s,
    proyecto_id: s.tipo_destino === 'PROYECTO' ? s.proyecto_id : null,
    area_id: s.tipo_destino === 'AREA' ? s.area_id : null,
  }));

const devolucion = z.object({
  fecha: fecha(),
  salida_id: id('La guía de salida'),
  motivo: texto(200, 'El motivo'),
  responsable: texto(120, 'El responsable'),
  observaciones: textoOpcional(2000),
  items: z.array(z.object({
    detalle_salida_id: id('La línea de la guía'),
    cantidad: cantidad('La cantidad devuelta'),
    estado_producto: z.enum(['BUENO', 'DANADO', 'DEFECTUOSO'], { errorMap: () => ({ message: 'Seleccione el estado del producto' }) }),
  })).min(1, 'Indique al menos un producto a devolver'),
});

const ajuste = z.object({
  fecha: fecha(),
  producto_id: id('El producto'),
  almacen_id: id('El almacén'),
  tipo: z.enum(['INCREMENTO', 'DISMINUCION', 'BAJA_DANADO', 'BAJA_DEFECTUOSO'], { errorMap: () => ({ message: 'Tipo de ajuste inválido' }) }),
  cantidad: cantidad(),
  motivo: texto(500, 'El motivo'),
});

module.exports = {
  login, usuario, producto, categoria, proveedor, almacen, area, proyecto,
  entrada, salida, devolucion, ajuste, motivoAnulacion, MOTIVOS_SALIDA,
};
