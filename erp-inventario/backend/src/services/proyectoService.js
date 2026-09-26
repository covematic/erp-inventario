const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { Filtros } = require('../utils/helpers');

const CAMPOS = ['codigo', 'nombre', 'cliente', 'responsable', 'ubicacion', 'fecha_inicio', 'fecha_fin', 'estado'];

async function listar(q) {
  const w = new Filtros()
    .add('(p.codigo ILIKE ? OR p.nombre ILIKE ? OR p.cliente ILIKE ? OR p.responsable ILIKE ?)', q.q ? `%${q.q}%` : null)
    .add('p.estado = ?', q.estado);
  const { rows } = await query(
    `SELECT p.*,
            COUNT(DISTINCT s.id) FILTER (WHERE s.estado <> 'ANULADA')::int AS guias,
            COALESCE(SUM(d.cantidad * d.costo_unitario) FILTER (WHERE s.estado = 'DESPACHADA'),0)
              - COALESCE(SUM(d.cantidad_devuelta * d.costo_unitario) FILTER (WHERE s.estado = 'DESPACHADA'),0) AS valor_consumido
       FROM proyectos p
       LEFT JOIN salidas s ON s.proyecto_id = p.id
       LEFT JOIN detalle_salidas d ON d.salida_id = s.id
       ${w.where()}
      GROUP BY p.id ORDER BY p.estado, p.fecha_inicio DESC`,
    w.params
  );
  return rows;
}

/** Ficha del proyecto: datos, guías y consumo neto por producto. */
async function obtener(id) {
  const { rows } = await query('SELECT * FROM proyectos WHERE id = $1', [id]);
  if (!rows[0]) throw AppError.notFound('Proyecto no encontrado');
  const proyecto = rows[0];

  const guias = await query(
    `SELECT s.id, s.numero, s.numero_guia, s.fecha, s.estado, s.motivo, s.responsable, s.requiere_devolucion,
            COUNT(d.id)::int AS items, COALESCE(SUM(d.cantidad * d.costo_unitario),0) AS valor
       FROM salidas s LEFT JOIN detalle_salidas d ON d.salida_id = s.id
      WHERE s.proyecto_id = $1 GROUP BY s.id ORDER BY s.fecha DESC, s.id DESC`,
    [id]
  );
  const consumo = await query(
    `SELECT p.id AS producto_id, p.sku, p.nombre, p.unidad_medida,
            SUM(d.cantidad) AS despachado, SUM(d.cantidad_devuelta) AS devuelto,
            SUM(d.cantidad - d.cantidad_devuelta) AS consumido,
            SUM((d.cantidad - d.cantidad_devuelta) * d.costo_unitario) AS valor
       FROM salidas s JOIN detalle_salidas d ON d.salida_id = s.id JOIN productos p ON p.id = d.producto_id
      WHERE s.proyecto_id = $1 AND s.estado = 'DESPACHADA'
      GROUP BY p.id ORDER BY valor DESC`,
    [id]
  );
  return { ...proyecto, guias: guias.rows, consumo: consumo.rows };
}

async function crear(data) {
  const cols = CAMPOS.filter((c) => data[c] !== undefined);
  const { rows } = await query(
    `INSERT INTO proyectos (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
    cols.map((c) => data[c])
  );
  return rows[0];
}

async function actualizar(id, data) {
  const cols = CAMPOS.filter((c) => data[c] !== undefined);
  const { rows } = await query(
    `UPDATE proyectos SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...cols.map((c) => data[c])]
  );
  if (!rows[0]) throw AppError.notFound('Proyecto no encontrado');
  return rows[0];
}

async function eliminar(id) {
  const { rows } = await query('SELECT EXISTS (SELECT 1 FROM salidas WHERE proyecto_id = $1) AS usado', [id]);
  if (rows[0].usado) {
    await query(`UPDATE proyectos SET estado = 'CERRADO' WHERE id = $1`, [id]);
    return { eliminado: false, message: 'El proyecto tiene guías registradas; se marcó como CERRADO' };
  }
  const r = await query('DELETE FROM proyectos WHERE id = $1', [id]);
  if (!r.rowCount) throw AppError.notFound('Proyecto no encontrado');
  return { eliminado: true, message: 'Proyecto eliminado' };
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
