/**
 * Datos de prueba. Todas las operaciones de stock se generan con los mismos
 * servicios que usa la API, por lo que stock, Kardex y documentos son coherentes.
 * Uso: npm run db:seed   (después de npm run db:setup)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { pool, query } = require('../src/config/db');
const entradas = require('../src/services/entradaService');
const salidas = require('../src/services/salidaService');
const devoluciones = require('../src/services/devolucionService');
const ajustes = require('../src/services/ajusteService');

const hace = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};

async function insertar(tabla, filas) {
  const ids = [];
  for (const f of filas) {
    const cols = Object.keys(f);
    const { rows } = await query(
      `INSERT INTO ${tabla} (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`,
      cols.map((c) => f[c])
    );
    ids.push(rows[0].id);
  }
  return ids;
}

async function main() {
  const yaHay = await query('SELECT COUNT(*)::int AS n FROM usuarios');
  if (yaHay.rows[0].n > 0) {
    console.log('La base ya tiene datos. Ejecute "npm run db:reset" para reiniciarla con datos de prueba.');
    return;
  }

  // ---------- Seguridad ----------
  const [rAdmin, rAlm, rSup] = await insertar('roles', [
    { nombre: 'ADMIN', descripcion: 'Acceso completo' },
    { nombre: 'ALMACEN', descripcion: 'Registra entradas, salidas y devoluciones' },
    { nombre: 'SUPERVISOR', descripcion: 'Consulta, aprueba anulaciones y ajustes, reportes' },
  ]);
  const hash = (p) => bcrypt.hashSync(p, 10);
  const [uAdmin, uAlm, uSup] = await insertar('usuarios', [
    { nombre: 'Ana Torres (Admin)', email: 'admin@erp.com', password_hash: hash('admin123'), rol_id: rAdmin },
    { nombre: 'Luis Quispe (Almacén)', email: 'almacen@erp.com', password_hash: hash('almacen123'), rol_id: rAlm },
    { nombre: 'Carla Rojas (Supervisora)', email: 'supervisor@erp.com', password_hash: hash('supervisor123'), rol_id: rSup },
  ]);
  const almacenero = { id: uAlm };
  const supervisor = { id: uSup };
  const admin = { id: uAdmin };

  // ---------- Catálogos ----------
  const [cElec, cTub, cHer, cEpp, cFer, cPin] = await insertar('categorias', [
    { nombre: 'Materiales eléctricos' }, { nombre: 'Tuberías y accesorios' }, { nombre: 'Herramientas' },
    { nombre: 'Equipos de protección (EPP)' }, { nombre: 'Ferretería' }, { nombre: 'Pinturas y acabados' },
  ]);
  const [pv1, pv2, pv3, pv4] = await insertar('proveedores', [
    { ruc: '20512345671', razon_social: 'Electro Andina S.A.C.', contacto: 'Jorge Salas', telefono: '01 445 2211', email: 'ventas@electroandina.pe' },
    { ruc: '20601234582', razon_social: 'Tubos del Pacífico S.A.', contacto: 'María León', telefono: '01 332 8890', email: 'pedidos@tubospacifico.pe' },
    { ruc: '20487654323', razon_social: 'Ferretería Industrial Lima E.I.R.L.', contacto: 'Pedro Huamán', telefono: '01 567 1020' },
    { ruc: '20398765434', razon_social: 'Seguridad Total Perú S.A.C.', contacto: 'Rosa Vega', email: 'rvega@seguridadtotal.pe' },
  ]);
  const [alm1] = await insertar('almacenes', [
    { codigo: 'ALM-01', nombre: 'Almacén Central', ubicacion: 'Av. Industrial 1250, Ate' },
    { codigo: 'ALM-02', nombre: 'Almacén de Obra Norte', ubicacion: 'Carabayllo' },
  ]);
  const [aMant, aProd, , , aSeg] = await insertar('areas', [
    { nombre: 'Mantenimiento' }, { nombre: 'Producción' }, { nombre: 'Logística' },
    { nombre: 'Administración' }, { nombre: 'Seguridad y Salud en el Trabajo' },
  ]);
  const [py1, py2, py3] = await insertar('proyectos', [
    { codigo: 'PRY-001', nombre: 'Instalación eléctrica Planta Ate', cliente: 'Alimentos del Sur S.A.', responsable: 'Ing. Marco Paredes', ubicacion: 'Ate, Lima', fecha_inicio: hace(150) },
    { codigo: 'PRY-002', nombre: 'Remodelación oficinas San Isidro', cliente: 'Grupo Horizonte', responsable: 'Arq. Lucía Benavides', ubicacion: 'San Isidro, Lima', fecha_inicio: hace(95) },
    { codigo: 'PRY-003', nombre: 'Red de agua Condominio Los Álamos', cliente: 'Inmobiliaria Álamos', responsable: 'Ing. Raúl Chávez', ubicacion: 'Surco, Lima', fecha_inicio: hace(60) },
  ]);

  // ---------- Productos ----------
  const P = {};
  const productos = [
    ['ELE-CAB-12', 'Cable THW 12 AWG (rollo 100 m)', cElec, pv1, 'ROLLO', 185, 240, 10],
    ['ELE-CAB-14', 'Cable THW 14 AWG (rollo 100 m)', cElec, pv1, 'ROLLO', 150, 195, 10],
    ['ELE-INT-01', 'Interruptor termomagnético 2x20A', cElec, pv1, 'UND', 38, 55, 20],
    ['ELE-TOM-02', 'Tomacorriente doble con línea a tierra', cElec, pv1, 'UND', 12.5, 19, 40],
    ['ELE-TAB-12', 'Tablero de distribución 12 polos', cElec, pv1, 'UND', 145, 210, 4],
    ['ELE-LUM-60', 'Luminaria LED panel 60x60 40W', cElec, pv1, 'UND', 68, 99, 15],
    ['TUB-PVC-12', 'Tubo PVC agua 1/2" x 5 m', cTub, pv2, 'UND', 9.8, 14.5, 50],
    ['TUB-PVC-34', 'Tubo PVC agua 3/4" x 5 m', cTub, pv2, 'UND', 14.2, 20.5, 40],
    ['TUB-COD-12', 'Codo PVC 1/2" x 90°', cTub, pv2, 'UND', 0.9, 1.6, 100],
    ['TUB-VAL-12', 'Válvula esférica 1/2"', cTub, pv2, 'UND', 18, 27, 15],
    ['HER-TAL-01', 'Taladro percutor 800W', cHer, pv3, 'UND', 320, 420, 2],
    ['HER-ESC-06', 'Escalera tijera fibra de vidrio 6 pasos', cHer, pv3, 'UND', 390, 499, 2],
    ['HER-MUL-01', 'Multímetro digital', cHer, pv3, 'UND', 95, 140, 3],
    ['EPP-CAS-01', 'Casco de seguridad dieléctrico', cEpp, pv4, 'UND', 28, 42, 20],
    ['EPP-GUA-01', 'Guantes de cuero (par)', cEpp, pv4, 'PAR', 9.5, 15, 50],
    ['EPP-LEN-01', 'Lentes de seguridad claros', cEpp, pv4, 'UND', 6.8, 11, 40],
    ['EPP-ARN-01', 'Arnés de seguridad cuerpo entero', cEpp, pv4, 'UND', 145, 190, 4],
    ['FER-CIN-01', 'Cinta aislante 3M (rollo)', cFer, pv3, 'UND', 3.2, 5.5, 60],
    ['FER-TOR-08', 'Tornillo autorroscante 8x1" (caja 100)', cFer, pv3, 'CAJA', 14, 22, 10],
    ['PIN-LAT-01', 'Pintura látex blanco (galón)', cPin, pv3, 'GLN', 42, 60, 12],
    ['PIN-SEL-01', 'Sellador de paredes (galón)', cPin, pv3, 'GLN', 35, 50, 8],
  ];
  for (const [sku, nombre, cat, prov, um, pc, pv, min] of productos) {
    const [id] = await insertar('productos', [
      { sku, nombre, categoria_id: cat, proveedor_id: prov, unidad_medida: um, precio_compra: pc, precio_venta: pv, costo_promedio: 0, stock_minimo: min },
    ]);
    P[sku] = id;
  }
  const it = (sku, cantidad, extra = {}) => ({ producto_id: P[sku], cantidad, ...extra });
  const ie = (sku, cantidad, costo) => it(sku, cantidad, { costo_unitario: costo });

  // ---------- Entradas (hace ~5 meses) ----------
  await entradas.crear({ fecha: hace(148), documento_ref: 'F001-004512', proveedor_id: pv1, almacen_id: alm1, observaciones: 'Compra inicial de material eléctrico',
    items: [ie('ELE-CAB-12', 40, 180), ie('ELE-CAB-14', 35, 148), ie('ELE-INT-01', 80, 37), ie('ELE-TOM-02', 150, 12), ie('ELE-TAB-12', 12, 140), ie('ELE-LUM-60', 60, 66)] }, almacenero);
  await entradas.crear({ fecha: hace(146), documento_ref: 'F002-000981', proveedor_id: pv2, almacen_id: alm1,
    items: [ie('TUB-PVC-12', 200, 9.5), ie('TUB-PVC-34', 120, 14), ie('TUB-COD-12', 500, 0.85), ie('TUB-VAL-12', 40, 17.5)] }, almacenero);
  await entradas.crear({ fecha: hace(145), documento_ref: 'F001-017733', proveedor_id: pv3, almacen_id: alm1,
    items: [ie('HER-TAL-01', 6, 310), ie('HER-ESC-06', 5, 385), ie('HER-MUL-01', 8, 92), ie('FER-CIN-01', 200, 3.1), ie('FER-TOR-08', 30, 13.5), ie('PIN-LAT-01', 40, 41), ie('PIN-SEL-01', 25, 34)] }, almacenero);
  await entradas.crear({ fecha: hace(144), documento_ref: 'F003-002210', proveedor_id: pv4, almacen_id: alm1,
    items: [ie('EPP-CAS-01', 60, 27), ie('EPP-GUA-01', 150, 9.2), ie('EPP-LEN-01', 120, 6.5), ie('EPP-ARN-01', 6, 140)] }, almacenero);

  // ---------- Guías de salida y devoluciones a lo largo de los meses ----------
  const g1 = await salidas.crear({ fecha: hace(130), numero_guia: 'GR-PRY001-001', almacen_id: alm1, tipo_destino: 'PROYECTO', proyecto_id: py1, motivo: 'PROYECTO',
    responsable: 'Ing. Marco Paredes', despachar: true, observaciones: 'Primera etapa: canalización y cableado',
    items: [it('ELE-CAB-12', 15), it('ELE-CAB-14', 12), it('ELE-INT-01', 24), it('ELE-TOM-02', 60), it('ELE-TAB-12', 3), it('FER-CIN-01', 40)] }, almacenero);
  await salidas.crear({ fecha: hace(125), almacen_id: alm1, tipo_destino: 'AREA', area_id: aSeg, motivo: 'CONSUMO_INTERNO',
    responsable: 'Rosa Medina', despachar: true, items: [it('EPP-CAS-01', 20), it('EPP-GUA-01', 60), it('EPP-LEN-01', 50)] }, almacenero);
  await devoluciones.crear({ fecha: hace(110), salida_id: g1.id, motivo: 'Sobrante de primera etapa', responsable: 'Ing. Marco Paredes',
    items: await lineas(g1.id, { 'ELE-TOM-02': [[8, 'BUENO'], [2, 'DEFECTUOSO']], 'ELE-CAB-14': [[2, 'BUENO']] }) }, almacenero);

  await entradas.crear({ fecha: hace(100), documento_ref: 'F001-004799', proveedor_id: pv1, almacen_id: alm1,
    items: [ie('ELE-CAB-12', 20, 190), ie('ELE-INT-01', 30, 39), ie('ELE-LUM-60', 20, 70)] }, almacenero);

  const g2 = await salidas.crear({ fecha: hace(90), numero_guia: 'GR-PRY002-001', almacen_id: alm1, tipo_destino: 'PROYECTO', proyecto_id: py2, motivo: 'PROYECTO',
    responsable: 'Arq. Lucía Benavides', despachar: true, requiere_devolucion: true, fecha_retorno_estimada: hace(20),
    observaciones: 'Incluye herramientas en préstamo',
    items: [it('ELE-LUM-60', 36), it('ELE-TOM-02', 30), it('PIN-LAT-01', 18), it('PIN-SEL-01', 10), it('HER-ESC-06', 2), it('HER-TAL-01', 2), it('FER-TOR-08', 8)] }, almacenero);
  await salidas.crear({ fecha: hace(80), almacen_id: alm1, tipo_destino: 'AREA', area_id: aMant, motivo: 'CONSUMO_INTERNO', responsable: 'Julio Ramos', despachar: true,
    items: [it('FER-CIN-01', 30), it('ELE-INT-01', 10), it('TUB-VAL-12', 6)] }, almacenero);

  const g3 = await salidas.crear({ fecha: hace(58), numero_guia: 'GR-PRY003-001', almacen_id: alm1, tipo_destino: 'PROYECTO', proyecto_id: py3, motivo: 'PROYECTO',
    responsable: 'Ing. Raúl Chávez', despachar: true, items: [it('TUB-PVC-12', 140), it('TUB-PVC-34', 80), it('TUB-COD-12', 420), it('TUB-VAL-12', 20)] }, almacenero);
  await devoluciones.crear({ fecha: hace(40), salida_id: g3.id, motivo: 'Material sobrante y piezas con fallas', responsable: 'Ing. Raúl Chávez',
    items: await lineas(g3.id, { 'TUB-PVC-12': [[12, 'BUENO'], [3, 'DANADO']], 'TUB-VAL-12': [[2, 'DEFECTUOSO']] }) }, almacenero);

  await entradas.crear({ fecha: hace(45), documento_ref: 'F002-001102', proveedor_id: pv2, almacen_id: alm1,
    items: [ie('TUB-PVC-34', 30, 14.5), ie('TUB-VAL-12', 10, 18)] }, almacenero);

  const g4 = await salidas.crear({ fecha: hace(35), numero_guia: 'GR-PRY001-002', almacen_id: alm1, tipo_destino: 'PROYECTO', proyecto_id: py1, motivo: 'PROYECTO',
    responsable: 'Téc. Jhon Flores', despachar: true, requiere_devolucion: true, fecha_retorno_estimada: hace(-10),
    items: [it('ELE-CAB-12', 30), it('ELE-TAB-12', 6), it('ELE-LUM-60', 30), it('HER-MUL-01', 3), it('EPP-CAS-01', 10), it('EPP-ARN-01', 6)] }, almacenero);
  await devoluciones.crear({ fecha: hace(15), salida_id: g2.id, motivo: 'Devolución de herramientas prestadas', responsable: 'Arq. Lucía Benavides',
    items: await lineas(g2.id, { 'HER-TAL-01': [[1, 'BUENO'], [1, 'DANADO']], 'PIN-LAT-01': [[2, 'BUENO']] }) }, almacenero);

  // Guía que se registra por error y el supervisor anula
  const gErr = await salidas.crear({ fecha: hace(12), almacen_id: alm1, tipo_destino: 'AREA', area_id: aProd, motivo: 'TRASLADO', responsable: 'Pedro Soto', despachar: true,
    items: [it('TUB-PVC-34', 10)] }, almacenero);
  await salidas.anular(gErr.id, 'Registrada por error: el traslado se canceló', supervisor);

  await salidas.crear({ fecha: hace(8), almacen_id: alm1, tipo_destino: 'AREA', area_id: aMant, motivo: 'DANO', responsable: 'Julio Ramos', despachar: true,
    observaciones: 'Luminarias rotas durante manipulación', items: [it('ELE-LUM-60', 2)] }, almacenero);
  await salidas.crear({ fecha: hace(5), numero_guia: 'GR-PRY002-002', almacen_id: alm1, tipo_destino: 'PROYECTO', proyecto_id: py2, motivo: 'PROYECTO', responsable: 'Arq. Lucía Benavides',
    despachar: true, items: [it('PIN-LAT-01', 14), it('PIN-SEL-01', 9), it('EPP-GUA-01', 40)] }, almacenero);

  // Ajuste por conteo físico y baja de producto dañado
  await ajustes.crear({ fecha: hace(4), producto_id: P['EPP-LEN-01'], almacen_id: alm1, tipo: 'DISMINUCION', cantidad: 3, motivo: 'Diferencia en inventario físico mensual' }, supervisor);
  await ajustes.crear({ fecha: hace(3), producto_id: P['TUB-PVC-12'], almacen_id: alm1, tipo: 'BAJA_DANADO', cantidad: 3, motivo: 'Tubos rajados enviados a desecho' }, admin);

  // Guía pendiente (stock comprometido)
  await salidas.crear({ fecha: hace(1), numero_guia: 'GR-PRY003-002', almacen_id: alm1, tipo_destino: 'PROYECTO', proyecto_id: py3, motivo: 'PROYECTO', responsable: 'Ing. Raúl Chávez',
    despachar: false, observaciones: 'Se recoge el lunes', items: [it('TUB-PVC-34', 25), it('TUB-COD-12', 60)] }, almacenero);

  // Intento rechazado por falta de stock (genera alerta)
  try {
    await salidas.crear({ fecha: hace(0), almacen_id: alm1, tipo_destino: 'PROYECTO', proyecto_id: py1, motivo: 'PROYECTO', responsable: 'Ing. Marco Paredes',
      items: [it('ELE-TAB-12', 10)] }, almacenero);
  } catch { /* esperado */ }

  const resumen = await query(`SELECT
    (SELECT COUNT(*) FROM productos) AS productos, (SELECT COUNT(*) FROM entradas) AS entradas,
    (SELECT COUNT(*) FROM salidas) AS salidas, (SELECT COUNT(*) FROM devoluciones) AS devoluciones,
    (SELECT COUNT(*) FROM movimientos_inventario) AS movimientos`);
  console.log('Datos de prueba cargados:', resumen.rows[0]);
  console.log('Usuarios: admin@erp.com / admin123 · almacen@erp.com / almacen123 · supervisor@erp.com / supervisor123');

  /** Convierte { SKU: [[cantidad, estado], ...] } en ítems de devolución de la guía indicada. */
  async function lineas(salidaId, mapa) {
    const { rows } = await query(
      `SELECT d.id, p.sku FROM detalle_salidas d JOIN productos p ON p.id = d.producto_id WHERE d.salida_id = $1`,
      [salidaId]
    );
    const porSku = Object.fromEntries(rows.map((r) => [r.sku, r.id]));
    return Object.entries(mapa).flatMap(([sku, partes]) =>
      partes.map(([cantidad, estado_producto]) => ({ detalle_salida_id: porSku[sku], cantidad, estado_producto })));
  }
}

main()
  .catch((e) => {
    console.error('Error al cargar datos de prueba:', e.message, e.details || '');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
