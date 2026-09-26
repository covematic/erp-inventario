const PREFIJOS = {
  entrada: ['seq_entrada', 'ENT'],
  salida: ['seq_salida', 'GS'],
  devolucion: ['seq_devolucion', 'DEV'],
  ajuste: ['seq_ajuste', 'AJU'],
};

/** Genera el siguiente número de documento, p. ej. GS-000012. */
async function siguienteNumero(client, tipo) {
  const [secuencia, prefijo] = PREFIJOS[tipo];
  const { rows } = await client.query(`SELECT nextval('${secuencia}') AS n`);
  return `${prefijo}-${String(rows[0].n).padStart(6, '0')}`;
}

/** Redondea a 3 decimales (cantidades) evitando errores de coma flotante. */
const q3 = (n) => Math.round(Number(n) * 1000) / 1000;
/** Redondea a 4 decimales (costos). */
const q4 = (n) => Math.round(Number(n) * 10000) / 10000;

/** Paginación estándar a partir de ?page y ?limit. */
function paginacion(query, maxLimit = 200) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

/** Constructor simple de cláusulas WHERE con parámetros numerados. */
class Filtros {
  constructor() { this.conds = []; this.params = []; }
  add(sqlConPlaceholder, valor) {
    if (valor === undefined || valor === null || valor === '') return this;
    this.params.push(valor);
    this.conds.push(sqlConPlaceholder.replace(/\?/g, `$${this.params.length}`));
    return this;
  }
  raw(sql) { this.conds.push(sql); return this; }
  where() { return this.conds.length ? `WHERE ${this.conds.join(' AND ')}` : ''; }
  next(valor) { this.params.push(valor); return `$${this.params.length}`; }
}

module.exports = { siguienteNumero, q3, q4, paginacion, Filtros };
