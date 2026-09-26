const { withTransaction, query } = require('../config/db');
const salidaModel = require('../models/salidaModel');
const inventario = require('./inventarioService');
const alertaService = require('./alertaService');
const AppError = require('../utils/AppError');
const { siguienteNumero, q3, paginacion } = require('../utils/helpers');

async function validarDestino(client, data) {
  if (data.tipo_destino === 'PROYECTO') {
    const { rows } = await client.query('SELECT id, nombre, estado FROM proyectos WHERE id = $1', [data.proyecto_id]);
    if (!rows[0]) throw AppError.badRequest('El proyecto no existe');
    if (rows[0].estado !== 'ACTIVO') throw AppError.badRequest(`El proyecto "${rows[0].nombre}" está cerrado; no admite nuevas guías`);
  } else {
    const { rows } = await client.query('SELECT id, activo FROM areas WHERE id = $1', [data.area_id]);
    if (!rows[0] || !rows[0].activo) throw AppError.badRequest('El área no existe o está inactiva');
  }
  const alm = await client.query('SELECT id FROM almacenes WHERE id = $1 AND activo', [data.almacen_id]);
  if (!alm.rows[0]) throw AppError.badRequest('El almacén no existe o está inactivo');
}

/**
 * Registra una guía de salida.
 * Solicitud → Validación de stock → Registro → Disminución del stock → Kardex.
 *
 * - despachar = true  (por defecto): almacén despacha en el acto; el stock baja y se escribe el Kardex.
 * - despachar = false: la guía queda PENDIENTE y el stock pasa de disponible a comprometido
 *   (reservado) hasta que se despache o se anule.
 *
 * Si alguna línea excede el stock disponible, se rechaza la guía completa y se registra una alerta.
 */
async function crear(input, user) {
  const data = {
    numero_guia: null, observaciones: null, fecha_retorno_estimada: null, proyecto_id: null, area_id: null,
    ...input,
    requiere_devolucion: Boolean(input.requiere_devolucion),
    despachar: input.despachar !== false,
  };
  let faltantes = [];
  try {
    return await withTransaction(async (client) => {
      await validarDestino(client, data);

      faltantes = await inventario.verificarDisponibilidad(client, data.almacen_id, data.items);
      if (faltantes.length) {
        const lista = faltantes.map((f) => `${f.producto} (${f.sku}): solicitado ${f.solicitado}, disponible ${f.disponible} ${f.unidad}`).join('; ');
        throw AppError.conflict(`Stock insuficiente. No se registró la guía. ${lista}`, faltantes);
      }

      const numero = await siguienteNumero(client, 'salida');
      const estado = data.despachar ? 'DESPACHADA' : 'PENDIENTE';
      const cab = await salidaModel.insertCabecera(client, {
        ...data,
        numero,
        estado,
        usuario_id: user.id,
        despachado_por: data.despachar ? user.id : null,
        despachado_at: data.despachar ? new Date() : null,
      });

      const items = [...data.items].sort((a, b) => a.producto_id - b.producto_id);
      for (const it of items) {
        const cantidad = q3(it.cantidad);
        const { rows } = await client.query('SELECT costo_promedio FROM productos WHERE id = $1', [it.producto_id]);
        const costo = Number(rows[0].costo_promedio);
        await salidaModel.insertDetalle(client, { salida_id: cab.id, producto_id: it.producto_id, cantidad, costo_unitario: costo });

        if (data.despachar) {
          await inventario.aplicarMovimiento(client, {
            productoId: it.producto_id,
            almacenId: data.almacen_id,
            delta: { disponible: -cantidad },
            kardex: {
              tipo: 'SALIDA', documentoTipo: 'SALIDA', documentoId: cab.id, documentoNumero: numero,
              salida: cantidad, costoUnitario: costo, usuarioId: user.id, fecha: data.fecha,
            },
          });
        } else {
          // Reserva: no es un movimiento físico, por eso no se escribe en el Kardex
          await inventario.aplicarMovimiento(client, {
            productoId: it.producto_id,
            almacenId: data.almacen_id,
            delta: { disponible: -cantidad, comprometido: cantidad },
          });
        }
      }
      return cab;
    });
  } catch (err) {
    // La transacción ya hizo ROLLBACK; la alerta del intento rechazado se guarda aparte
    if (faltantes.length) {
      await alertaService.registrarIntentoRechazado(faltantes, user).catch(() => {});
    }
    throw err;
  }
}

/** Despacha una guía PENDIENTE: libera lo comprometido y registra la salida en el Kardex. */
async function despachar(id, user) {
  return withTransaction(async (client) => {
    const s = await salidaModel.lockById(client, id);
    if (!s) throw AppError.notFound('Guía no encontrada');
    if (s.estado !== 'PENDIENTE') throw AppError.conflict(`La guía ${s.numero} está ${s.estado.toLowerCase()} y no puede despacharse`);

    const detalles = await salidaModel.detalles(client, id);
    for (const d of detalles) {
      await inventario.aplicarMovimiento(client, {
        productoId: d.producto_id,
        almacenId: s.almacen_id,
        delta: { comprometido: -Number(d.cantidad) },
        kardex: {
          tipo: 'SALIDA', documentoTipo: 'SALIDA', documentoId: s.id, documentoNumero: s.numero,
          salida: Number(d.cantidad), costoUnitario: Number(d.costo_unitario), usuarioId: user.id,
        },
      });
    }
    await salidaModel.marcarDespachada(client, id, user.id);
    return { id, estado: 'DESPACHADA' };
  });
}

/**
 * Anula una guía (solo supervisor o administrador).
 * - PENDIENTE: libera la reserva (comprometido → disponible).
 * - DESPACHADA: reingresa al stock disponible lo que no fue devuelto y lo registra en el Kardex.
 */
async function anular(id, motivo, user) {
  return withTransaction(async (client) => {
    const s = await salidaModel.lockById(client, id);
    if (!s) throw AppError.notFound('Guía no encontrada');
    if (s.estado === 'ANULADA') throw AppError.conflict('La guía ya fue anulada');

    const detalles = await salidaModel.detalles(client, id, { lock: true });
    for (const d of detalles) {
      if (s.estado === 'PENDIENTE') {
        await inventario.aplicarMovimiento(client, {
          productoId: d.producto_id, almacenId: s.almacen_id,
          delta: { comprometido: -Number(d.cantidad), disponible: Number(d.cantidad) },
        });
      } else {
        const pendiente = q3(Number(d.cantidad) - Number(d.cantidad_devuelta));
        if (pendiente <= 0) continue;
        await inventario.aplicarMovimiento(client, {
          productoId: d.producto_id, almacenId: s.almacen_id,
          delta: { disponible: pendiente },
          kardex: {
            tipo: 'ANULACION', documentoTipo: 'SALIDA', documentoId: s.id, documentoNumero: s.numero,
            entrada: pendiente, costoUnitario: Number(d.costo_unitario), usuarioId: user.id,
            observacion: `Anulación de guía: ${motivo}`,
          },
        });
      }
    }
    await salidaModel.anular(client, id, user.id, motivo);
    return { id, estado: 'ANULADA' };
  });
}

async function listar(q) {
  const pag = paginacion(q);
  const r = await salidaModel.list(q, pag);
  return { ...r, page: pag.page, limit: pag.limit };
}

async function obtener(id) {
  const s = await salidaModel.findById(id);
  if (!s) throw AppError.notFound('Guía no encontrada');
  s.detalles = await salidaModel.detalles({ query }, id);
  const dev = await query(
    `SELECT d.id, d.numero, d.fecha, d.motivo, d.responsable, u.nombre AS usuario_nombre
       FROM devoluciones d JOIN usuarios u ON u.id = d.usuario_id
      WHERE d.salida_id = $1 ORDER BY d.id`,
    [id]
  );
  s.devoluciones = dev.rows;
  return s;
}

module.exports = { crear, despachar, anular, listar, obtener };
