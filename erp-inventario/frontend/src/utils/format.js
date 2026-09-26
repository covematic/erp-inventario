const num = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });

export const fmtNum = (v) => (v === null || v === undefined || v === '' ? '—' : num.format(Number(v)));
export const fmtMoney = (v) => (v === null || v === undefined ? '—' : money.format(Number(v)));

/** 'YYYY-MM-DD' o timestamp → 'dd/mm/aaaa' */
export function fmtDate(v) {
  if (!v) return '—';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return new Date(v).toLocaleDateString('es-PE');
}

export function fmtDateTime(v) {
  if (!v) return '—';
  return new Date(v).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const hoy = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const MOTIVOS_SALIDA = {
  PROYECTO: 'Proyecto',
  VENTA: 'Venta',
  CONSUMO_INTERNO: 'Consumo interno',
  TRASLADO: 'Traslado',
  DANO: 'Daño',
  PERDIDA: 'Pérdida',
  OTROS: 'Otros',
};

export const ESTADO_PRODUCTO = { BUENO: 'Bueno', DANADO: 'Dañado', DEFECTUOSO: 'Defectuoso' };

export const TIPO_MOV = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  DEVOLUCION: 'Devolución',
  AJUSTE: 'Ajuste',
  ANULACION: 'Anulación',
};

export const TIPO_AJUSTE = {
  INCREMENTO: 'Incremento de disponible',
  DISMINUCION: 'Disminución de disponible',
  BAJA_DANADO: 'Baja de unidades dañadas',
  BAJA_DEFECTUOSO: 'Baja de unidades defectuosas',
};

export const ROLES = { ADMIN: 'Administrador', ALMACEN: 'Almacén', SUPERVISOR: 'Supervisor' };
