const productoModel = require('../models/productoModel');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { paginacion } = require('../utils/helpers');

async function listar(q) {
  const pag = paginacion(q, 1000);
  const r = await productoModel.list(q, pag);
  return { ...r, page: pag.page, limit: pag.limit };
}

async function obtener(id) {
  const p = await productoModel.findById(id);
  if (!p) throw AppError.notFound('Producto no encontrado');
  return p;
}

/** Prefijo de 3 letras a partir del nombre de la categoría: "Herramientas" → "HER". */
function prefijoDe(nombre) {
  const limpio = String(nombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z]/g, '');
  return (limpio.slice(0, 3) || 'PRD').padEnd(3, 'X');
}

/** Siguiente código libre para la categoría, con formato PRE-0001. */
async function sugerirSku(categoriaId) {
  const { rows } = await query('SELECT nombre FROM categorias WHERE id = $1', [categoriaId]);
  if (!rows[0]) throw AppError.badRequest('Seleccione una categoría válida');
  const pre = prefijoDe(rows[0].nombre);
  const r = await query(
    `SELECT COALESCE(MAX(CAST(substring(sku FROM '^' || $1::text || '-([0-9]+)$') AS INT)), 0) + 1 AS n
       FROM productos WHERE sku ~ ('^' || $1::text || '-[0-9]+$')`,
    [pre]
  );
  return `${pre}-${String(r.rows[0].n).padStart(4, '0')}`;
}

/**
 * Registra la cantidad que ya existía físicamente como una entrada "Inventario inicial",
 * para que quede en el Kardex. Si falla, el producto recién creado se elimina.
 */
async function cargarStockInicial(producto, data, user) {
  const cantidad = Number(data.stock_inicial) || 0;
  if (cantidad <= 0) return producto;
  let almacenId = data.almacen_inicial_id;
  if (!almacenId) {
    const a = await query('SELECT id FROM almacenes WHERE activo ORDER BY id LIMIT 1');
    almacenId = a.rows[0]?.id;
  }
  try {
    if (!almacenId) throw AppError.badRequest('No hay almacenes activos para registrar el stock inicial');
    const entradaService = require('./entradaService');
    await entradaService.crear({
      fecha: data.fecha_inicial || new Date().toISOString().slice(0, 10),
      documento_ref: 'INVENTARIO INICIAL',
      proveedor_id: null,
      almacen_id: almacenId,
      observaciones: 'Stock existente al registrar el producto',
      items: [{ producto_id: producto.id, cantidad, costo_unitario: Number(data.precio_compra) || 0 }],
    }, user);
  } catch (err) {
    await productoModel.remove(producto.id);
    throw err;
  }
  return productoModel.findById(producto.id);
}

async function crear(data, user) {
  const p = await crearSoloProducto(data);
  return cargarStockInicial(p, data, user);
}

async function crearSoloProducto(data) {
  if (data.sku) {
    const id = await productoModel.create(data);
    return productoModel.findById(id);
  }
  // Código automático: si dos personas crean a la vez y chocan, se reintenta con el siguiente
  for (let intento = 0; intento < 5; intento += 1) {
    const sku = await sugerirSku(data.categoria_id);
    try {
      const id = await productoModel.create({ ...data, sku });
      return productoModel.findById(id);
    } catch (err) {
      if (err.code !== '23505' || err.constraint !== 'productos_sku_key') throw err;
    }
  }
  throw AppError.conflict('No se pudo generar un código único. Intente de nuevo');
}

// El stock NO se edita aquí: solo cambia con entradas, salidas, devoluciones y ajustes.
async function actualizar(id, data) {
  const n = await productoModel.update(id, data);
  if (!n) throw AppError.notFound('Producto no encontrado');
  return productoModel.findById(id);
}

async function cambiarEstado(id, activo) {
  const n = await productoModel.update(id, { activo });
  if (!n) throw AppError.notFound('Producto no encontrado');
  return productoModel.findById(id);
}

/**
 * Elimina el producto si nunca tuvo movimientos; si los tuvo, lo desactiva
 * para conservar el historial (Kardex).
 */
async function eliminar(id) {
  const p = await productoModel.findById(id);
  if (!p) throw AppError.notFound('Producto no encontrado');
  if (await productoModel.tieneMovimientos(id)) {
    await productoModel.update(id, { activo: false });
    return { eliminado: false, desactivado: true, message: 'El producto tiene movimientos registrados; se desactivó para conservar su historial' };
  }
  await productoModel.remove(id);
  return { eliminado: true, message: 'Producto eliminado' };
}

module.exports = { sugerirSku, listar, obtener, crear, actualizar, cambiarEstado, eliminar };
