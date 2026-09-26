const ExcelJS = require('exceljs');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Definición de reportes. Cada uno recibe { desde, hasta } y devuelve
 * { titulo, columnas: [{ key, label, tipo }], filas }.
 * tipo: 'texto' | 'numero' | 'moneda' | 'fecha'
 */
const rango = (col, f, params) => {
  const conds = [];
  if (f.desde) { params.push(f.desde); conds.push(`${col} >= $${params.length}::date`); }
  if (f.hasta) { params.push(f.hasta); conds.push(`${col} < ($${params.length}::date + INTERVAL '1 day')`); }
  return conds;
};
const and = (conds) => (conds.length ? ` AND ${conds.join(' AND ')}` : '');

const REPORTES = {
  'stock-actual': {
    titulo: 'Stock actual',
    usaFechas: false,
    columnas: [
      { key: 'sku', label: 'SKU' }, { key: 'nombre', label: 'Producto' }, { key: 'categoria', label: 'Categoría' },
      { key: 'unidad_medida', label: 'Unidad' }, { key: 'disponible', label: 'Disponible', tipo: 'numero' },
      { key: 'comprometido', label: 'Comprometido', tipo: 'numero' }, { key: 'danado', label: 'Dañado', tipo: 'numero' },
      { key: 'defectuoso', label: 'Defectuoso', tipo: 'numero' }, { key: 'stock_actual', label: 'Stock actual', tipo: 'numero' },
      { key: 'stock_minimo', label: 'Stock mínimo', tipo: 'numero' }, { key: 'estado', label: 'Estado' },
    ],
    sql: () => [`
      SELECT p.sku, p.nombre, c.nombre AS categoria, p.unidad_medida,
             COALESCE(SUM(s.disponible),0) AS disponible, COALESCE(SUM(s.comprometido),0) AS comprometido,
             COALESCE(SUM(s.danado),0) AS danado, COALESCE(SUM(s.defectuoso),0) AS defectuoso,
             COALESCE(SUM(s.disponible + s.comprometido + s.danado + s.defectuoso),0) AS stock_actual,
             p.stock_minimo,
             CASE WHEN COALESCE(SUM(s.disponible),0) = 0 THEN 'Agotado'
                  WHEN p.stock_minimo > 0 AND COALESCE(SUM(s.disponible),0) <= p.stock_minimo THEN 'Stock bajo'
                  ELSE 'Normal' END AS estado
        FROM productos p JOIN categorias c ON c.id = p.categoria_id LEFT JOIN stock s ON s.producto_id = p.id
       WHERE p.activo GROUP BY p.id, c.nombre ORDER BY p.nombre`, []],
  },

  movimientos: {
    titulo: 'Movimientos de inventario',
    columnas: [
      { key: 'fecha', label: 'Fecha', tipo: 'fecha' }, { key: 'tipo', label: 'Tipo' }, { key: 'documento_numero', label: 'Documento' },
      { key: 'sku', label: 'SKU' }, { key: 'producto', label: 'Producto' }, { key: 'almacen', label: 'Almacén' },
      { key: 'cantidad_entrada', label: 'Entrada', tipo: 'numero' }, { key: 'cantidad_salida', label: 'Salida', tipo: 'numero' },
      { key: 'cantidad_devolucion', label: 'Devolución', tipo: 'numero' }, { key: 'estado_stock', label: 'Estado stock' },
      { key: 'saldo', label: 'Saldo', tipo: 'numero' }, { key: 'costo_unitario', label: 'Costo unit.', tipo: 'moneda' },
      { key: 'valor', label: 'Valor', tipo: 'moneda' }, { key: 'usuario', label: 'Usuario' },
    ],
    sql: (f) => {
      const params = [];
      const w = rango('m.fecha', f, params);
      return [`
        SELECT m.fecha, m.tipo, m.documento_numero, p.sku, p.nombre AS producto, a.nombre AS almacen,
               m.cantidad_entrada, m.cantidad_salida, m.cantidad_devolucion, m.estado_stock, m.saldo,
               m.costo_unitario, m.valor, u.nombre AS usuario
          FROM movimientos_inventario m JOIN productos p ON p.id = m.producto_id
          JOIN almacenes a ON a.id = m.almacen_id JOIN usuarios u ON u.id = m.usuario_id
         WHERE TRUE ${and(w)} ORDER BY m.id`, params];
    },
  },

  salidas: {
    titulo: 'Salidas por período',
    columnas: [
      { key: 'fecha', label: 'Fecha', tipo: 'fecha' }, { key: 'numero', label: 'N° salida' }, { key: 'numero_guia', label: 'N° guía' },
      { key: 'destino', label: 'Proyecto / Área' }, { key: 'motivo', label: 'Motivo' }, { key: 'responsable', label: 'Responsable' },
      { key: 'sku', label: 'SKU' }, { key: 'producto', label: 'Producto' }, { key: 'cantidad', label: 'Cantidad', tipo: 'numero' },
      { key: 'devuelto', label: 'Devuelto', tipo: 'numero' }, { key: 'valor', label: 'Valor', tipo: 'moneda' },
      { key: 'estado', label: 'Estado' }, { key: 'usuario', label: 'Registrado por' },
    ],
    sql: (f) => {
      const params = [];
      const w = rango('s.fecha', f, params);
      return [`
        SELECT s.fecha, s.numero, s.numero_guia, COALESCE(pr.codigo || ' · ' || pr.nombre, ar.nombre) AS destino,
               s.motivo, s.responsable, p.sku, p.nombre AS producto, d.cantidad, d.cantidad_devuelta AS devuelto,
               d.cantidad * d.costo_unitario AS valor, s.estado, u.nombre AS usuario
          FROM salidas s JOIN detalle_salidas d ON d.salida_id = s.id JOIN productos p ON p.id = d.producto_id
          JOIN usuarios u ON u.id = s.usuario_id
          LEFT JOIN proyectos pr ON pr.id = s.proyecto_id LEFT JOIN areas ar ON ar.id = s.area_id
         WHERE TRUE ${and(w)} ORDER BY s.fecha, s.id`, params];
    },
  },

  devoluciones: {
    titulo: 'Devoluciones por período',
    columnas: [
      { key: 'fecha', label: 'Fecha', tipo: 'fecha' }, { key: 'numero', label: 'N° devolución' }, { key: 'salida', label: 'N° salida' },
      { key: 'destino', label: 'Proyecto / Área' }, { key: 'sku', label: 'SKU' }, { key: 'producto', label: 'Producto' },
      { key: 'cantidad', label: 'Cantidad', tipo: 'numero' }, { key: 'estado_producto', label: 'Estado' },
      { key: 'motivo', label: 'Motivo' }, { key: 'responsable', label: 'Responsable' }, { key: 'usuario', label: 'Registrado por' },
    ],
    sql: (f) => {
      const params = [];
      const w = rango('dv.fecha', f, params);
      return [`
        SELECT dv.fecha, dv.numero, s.numero AS salida, COALESCE(pr.codigo || ' · ' || pr.nombre, ar.nombre) AS destino,
               p.sku, p.nombre AS producto, dd.cantidad, dd.estado_producto, dv.motivo, dv.responsable, u.nombre AS usuario
          FROM devoluciones dv JOIN detalle_devoluciones dd ON dd.devolucion_id = dv.id
          JOIN salidas s ON s.id = dv.salida_id JOIN productos p ON p.id = dd.producto_id JOIN usuarios u ON u.id = dv.usuario_id
          LEFT JOIN proyectos pr ON pr.id = s.proyecto_id LEFT JOIN areas ar ON ar.id = s.area_id
         WHERE TRUE ${and(w)} ORDER BY dv.fecha, dv.id`, params];
    },
  },

  'mas-retirados': {
    titulo: 'Productos más retirados',
    columnas: [
      { key: 'sku', label: 'SKU' }, { key: 'producto', label: 'Producto' }, { key: 'unidad_medida', label: 'Unidad' },
      { key: 'guias', label: 'N° guías', tipo: 'numero' }, { key: 'cantidad', label: 'Cantidad retirada', tipo: 'numero' },
      { key: 'valor', label: 'Valor', tipo: 'moneda' },
    ],
    sql: (f) => {
      const params = [];
      const w = rango('s.fecha', f, params);
      return [`
        SELECT p.sku, p.nombre AS producto, p.unidad_medida, COUNT(DISTINCT s.id) AS guias,
               SUM(d.cantidad) AS cantidad, SUM(d.cantidad * d.costo_unitario) AS valor
          FROM detalle_salidas d JOIN salidas s ON s.id = d.salida_id JOIN productos p ON p.id = d.producto_id
         WHERE s.estado = 'DESPACHADA' ${and(w)}
         GROUP BY p.id ORDER BY cantidad DESC LIMIT 50`, params];
    },
  },

  'mas-devueltos': {
    titulo: 'Productos más devueltos',
    columnas: [
      { key: 'sku', label: 'SKU' }, { key: 'producto', label: 'Producto' }, { key: 'unidad_medida', label: 'Unidad' },
      { key: 'bueno', label: 'Bueno', tipo: 'numero' }, { key: 'danado', label: 'Dañado', tipo: 'numero' },
      { key: 'defectuoso', label: 'Defectuoso', tipo: 'numero' }, { key: 'total', label: 'Total devuelto', tipo: 'numero' },
    ],
    sql: (f) => {
      const params = [];
      const w = rango('dv.fecha', f, params);
      return [`
        SELECT p.sku, p.nombre AS producto, p.unidad_medida,
               COALESCE(SUM(dd.cantidad) FILTER (WHERE dd.estado_producto = 'BUENO'),0) AS bueno,
               COALESCE(SUM(dd.cantidad) FILTER (WHERE dd.estado_producto = 'DANADO'),0) AS danado,
               COALESCE(SUM(dd.cantidad) FILTER (WHERE dd.estado_producto = 'DEFECTUOSO'),0) AS defectuoso,
               SUM(dd.cantidad) AS total
          FROM detalle_devoluciones dd JOIN devoluciones dv ON dv.id = dd.devolucion_id JOIN productos p ON p.id = dd.producto_id
         WHERE TRUE ${and(w)} GROUP BY p.id ORDER BY total DESC LIMIT 50`, params];
    },
  },

  'stock-bajo': {
    titulo: 'Productos con stock bajo o agotados',
    usaFechas: false,
    columnas: [
      { key: 'sku', label: 'SKU' }, { key: 'nombre', label: 'Producto' }, { key: 'categoria', label: 'Categoría' },
      { key: 'disponible', label: 'Disponible', tipo: 'numero' }, { key: 'stock_minimo', label: 'Mínimo', tipo: 'numero' },
      { key: 'faltante', label: 'Faltante al mínimo', tipo: 'numero' }, { key: 'estado', label: 'Estado' },
      { key: 'proveedor', label: 'Proveedor' },
    ],
    sql: () => [`
      SELECT * FROM (
        SELECT p.sku, p.nombre, c.nombre AS categoria, COALESCE(SUM(s.disponible),0) AS disponible, p.stock_minimo,
               GREATEST(p.stock_minimo - COALESCE(SUM(s.disponible),0), 0) AS faltante,
               CASE WHEN COALESCE(SUM(s.disponible),0) = 0 THEN 'Agotado' ELSE 'Stock bajo' END AS estado,
               pv.razon_social AS proveedor
          FROM productos p JOIN categorias c ON c.id = p.categoria_id LEFT JOIN proveedores pv ON pv.id = p.proveedor_id
          LEFT JOIN stock s ON s.producto_id = p.id
         WHERE p.activo GROUP BY p.id, c.nombre, pv.razon_social
      ) x WHERE x.disponible = 0 OR (x.stock_minimo > 0 AND x.disponible <= x.stock_minimo)
      ORDER BY x.disponible, x.nombre`, []],
  },

  danados: {
    titulo: 'Productos dañados y defectuosos',
    usaFechas: false,
    columnas: [
      { key: 'sku', label: 'SKU' }, { key: 'nombre', label: 'Producto' }, { key: 'almacen', label: 'Almacén' },
      { key: 'danado', label: 'Dañado', tipo: 'numero' }, { key: 'defectuoso', label: 'Defectuoso', tipo: 'numero' },
      { key: 'valor', label: 'Valor no apto', tipo: 'moneda' },
    ],
    sql: () => [`
      SELECT p.sku, p.nombre, a.nombre AS almacen, s.danado, s.defectuoso,
             (s.danado + s.defectuoso) * p.costo_promedio AS valor
        FROM stock s JOIN productos p ON p.id = s.producto_id JOIN almacenes a ON a.id = s.almacen_id
       WHERE s.danado > 0 OR s.defectuoso > 0 ORDER BY valor DESC`, []],
  },

  'valor-inventario': {
    titulo: 'Valor del inventario',
    usaFechas: false,
    columnas: [
      { key: 'categoria', label: 'Categoría' }, { key: 'sku', label: 'SKU' }, { key: 'nombre', label: 'Producto' },
      { key: 'cantidad', label: 'Cantidad valorizada', tipo: 'numero' }, { key: 'costo_promedio', label: 'Costo promedio', tipo: 'moneda' },
      { key: 'valor', label: 'Valor', tipo: 'moneda' },
    ],
    sql: () => [`
      SELECT c.nombre AS categoria, p.sku, p.nombre, COALESCE(SUM(s.disponible + s.comprometido),0) AS cantidad,
             p.costo_promedio, COALESCE(SUM(s.disponible + s.comprometido),0) * p.costo_promedio AS valor
        FROM productos p JOIN categorias c ON c.id = p.categoria_id LEFT JOIN stock s ON s.producto_id = p.id
       WHERE p.activo GROUP BY p.id, c.nombre ORDER BY c.nombre, valor DESC`, []],
  },

  'consumo-proyectos': {
    titulo: 'Consumo por proyecto',
    columnas: [
      { key: 'proyecto', label: 'Proyecto' }, { key: 'sku', label: 'SKU' }, { key: 'producto', label: 'Producto' },
      { key: 'despachado', label: 'Despachado', tipo: 'numero' }, { key: 'devuelto', label: 'Devuelto', tipo: 'numero' },
      { key: 'consumido', label: 'Consumo neto', tipo: 'numero' }, { key: 'valor', label: 'Valor neto', tipo: 'moneda' },
    ],
    sql: (f) => {
      const params = [];
      const w = rango('s.fecha', f, params);
      return [`
        SELECT pr.codigo || ' · ' || pr.nombre AS proyecto, p.sku, p.nombre AS producto,
               SUM(d.cantidad) AS despachado, SUM(d.cantidad_devuelta) AS devuelto,
               SUM(d.cantidad - d.cantidad_devuelta) AS consumido,
               SUM((d.cantidad - d.cantidad_devuelta) * d.costo_unitario) AS valor
          FROM salidas s JOIN proyectos pr ON pr.id = s.proyecto_id
          JOIN detalle_salidas d ON d.salida_id = s.id JOIN productos p ON p.id = d.producto_id
         WHERE s.estado = 'DESPACHADA' ${and(w)}
         GROUP BY pr.id, p.id ORDER BY pr.codigo, valor DESC`, params];
    },
  },
};

function catalogo() {
  return Object.entries(REPORTES).map(([id, r]) => ({ id, titulo: r.titulo, usaFechas: r.usaFechas !== false }));
}

async function generar(id, filtros) {
  const def = REPORTES[id];
  if (!def) throw AppError.notFound('Reporte no encontrado');
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    throw AppError.badRequest('La fecha "desde" no puede ser posterior a "hasta"');
  }
  const [sql, params] = def.sql(filtros);
  const { rows } = await query(sql, params);
  return { id, titulo: def.titulo, columnas: def.columnas, filas: rows, filtros };
}

const fmtFecha = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  return new Date(v).toISOString().slice(0, 16).replace('T', ' ');
};

function toCSV(rep) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = rep.columnas.map((c) => esc(c.label)).join(',');
  const body = rep.filas.map((f) => rep.columnas.map((c) => esc(c.tipo === 'fecha' ? fmtFecha(f[c.key]) : f[c.key])).join(','));
  return `﻿${[head, ...body].join('\r\n')}`; // BOM para que Excel respete tildes
}

async function toXLSX(rep) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERP Inventario';
  const ws = wb.addWorksheet(rep.titulo.slice(0, 31));
  ws.addRow([rep.titulo]).font = { bold: true, size: 14 };
  const rango = [rep.filtros.desde && `Desde ${rep.filtros.desde}`, rep.filtros.hasta && `Hasta ${rep.filtros.hasta}`].filter(Boolean).join(' · ');
  ws.addRow([`${rango || 'Todas las fechas'} · Generado ${new Date().toLocaleString('es-PE')}`]).font = { color: { argb: 'FF666666' } };
  ws.addRow([]);
  const header = ws.addRow(rep.columnas.map((c) => c.label));
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  });
  rep.filas.forEach((f) => {
    ws.addRow(rep.columnas.map((c) => {
      const v = f[c.key];
      if (c.tipo === 'fecha') return fmtFecha(v);
      if ((c.tipo === 'numero' || c.tipo === 'moneda') && v !== null) return Number(v);
      return v;
    }));
  });
  rep.columnas.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.max(12, c.label.length + 4, ...rep.filas.slice(0, 200).map((f) => String(f[c.key] ?? '').length + 2));
    col.width = Math.min(col.width, 45);
    if (c.tipo === 'moneda') col.numFmt = '#,##0.00';
    if (c.tipo === 'numero') col.numFmt = '#,##0.###';
  });
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  return wb.xlsx.writeBuffer();
}

module.exports = { catalogo, generar, toCSV, toXLSX };
