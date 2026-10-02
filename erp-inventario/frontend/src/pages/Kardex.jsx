import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import ProductSelect from '../components/ProductSelect';
import { PageHeader, LoadingBlock, ErrorBlock, EmptyState, TipoMovBadge, EstadoProductoBadge, DetailItem } from '../components/ui';
import { fmtNum, fmtMoney, fmtDateTime } from '../utils/format';

function exportarCSV(k) {
  const cols = ['Fecha', 'Tipo', 'Documento', 'Entrada', 'Salida', 'Devolución', 'Estado', 'Saldo', 'Costo unitario', 'Valor', 'Usuario', 'Observación'];
  const esc = (v) => { const s = v ?? ''; return /[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : s; };
  const filas = k.movimientos.map((m) => [fmtDateTime(m.fecha), m.tipo, m.documento_numero, m.cantidad_entrada, m.cantidad_salida, m.cantidad_devolucion,
    m.estado_stock, m.saldo, m.costo_unitario, m.valor, m.usuario_nombre, m.observacion].map(esc).join(','));
  const blob = new Blob([`﻿${[cols.join(','), ...filas].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kardex_${k.producto.sku}.csv`;
  a.click();
}

export default function Kardex() {
  const { productoId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [almacen, setAlmacen] = useState(params.get('almacen_id') || '');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const { data: productos } = useFetch('/productos', { limit: 1000 });
  const { data: almacenes } = useFetch('/almacenes');
  const { data: k, loading, error, reload } = useFetch(productoId ? `/inventario/kardex/${productoId}` : null, { almacen_id: almacen, desde, hasta }, { enabled: !!productoId });

  useEffect(() => {
    if (!almacen && almacenes?.length) setAlmacen(String(almacenes[0].id));
  }, [almacenes, almacen]);

  const totales = k?.movimientos.reduce((a, m) => ({
    e: a.e + Number(m.cantidad_entrada), s: a.s + Number(m.cantidad_salida), d: a.d + Number(m.cantidad_devolucion),
  }), { e: 0, s: 0, d: 0 });

  return (
    <>
      <PageHeader title="Kardex por producto" subtitle="Historial valorizado de todos los movimientos del producto"
        actions={k && k.movimientos.length > 0 && <button className="btn-secondary" onClick={() => exportarCSV(k)}><Download className="h-4 w-4" /> Exportar CSV</button>} />

      <div className="card mb-4 grid gap-3 p-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ProductSelect products={productos?.data || []} value={Number(productoId) || null} onChange={(p) => navigate(`/kardex/${p.id}${almacen ? `?almacen_id=${almacen}` : ''}`)} />
        </div>
        <select aria-label="Almacén" className="input lg:col-span-3" value={almacen} onChange={(e) => setAlmacen(e.target.value)}>
          {almacenes?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <input type="date" className="input lg:col-span-2" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
        <input type="date" className="input lg:col-span-2" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
      </div>

      {!productoId ? (
        <div className="card"><EmptyState title="Seleccione un producto" text="Elija un producto para ver su Kardex: entradas, salidas, devoluciones, ajustes y anulaciones con su saldo." /></div>
      ) : loading && !k ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : (
        <>
          <div className="card mb-4 p-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              <div className="col-span-2"><DetailItem label="Producto"><span className="font-semibold">{k.producto.nombre}</span><br /><span className="text-xs text-slate-500">{k.producto.sku} · {k.producto.categoria_nombre}</span></DetailItem></div>
              <DetailItem label="Disponible"><span className="text-lg font-semibold tabular-nums">{fmtNum(k.stock?.disponible ?? 0)}</span></DetailItem>
              <DetailItem label="Comprometido">{fmtNum(k.stock?.comprometido ?? 0)}</DetailItem>
              <DetailItem label="Dañado">{fmtNum(k.stock?.danado ?? 0)}</DetailItem>
              <DetailItem label="Defectuoso">{fmtNum(k.stock?.defectuoso ?? 0)}</DetailItem>
              <DetailItem label="Stock mínimo">{fmtNum(k.producto.stock_minimo)}</DetailItem>
              <DetailItem label="Costo promedio">{fmtMoney(k.producto.costo_promedio)}</DetailItem>
            </dl>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              {k.movimientos.length === 0 ? <EmptyState title="Sin movimientos" text="Este producto no registra movimientos en el almacén y período seleccionados." /> : (
                <table className="table-base">
                  <thead><tr>
                    <th>Fecha</th><th>Tipo</th><th>Documento</th><th className="num">Entrada</th><th className="num">Salida</th><th className="num">Devolución</th>
                    <th className="num">Saldo</th><th className="num">Costo unit.</th><th className="num">Valor</th><th>Usuario</th><th>Observación</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {k.movimientos.map((m) => (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap text-slate-600">{fmtDateTime(m.fecha)}</td>
                        <td><TipoMovBadge tipo={m.tipo} /></td>
                        <td><span className="code-tag">{m.documento_numero}</span></td>
                        <td className="num text-emerald-700">{Number(m.cantidad_entrada) ? fmtNum(m.cantidad_entrada) : ''}</td>
                        <td className="num text-slate-900">{Number(m.cantidad_salida) ? fmtNum(m.cantidad_salida) : ''}</td>
                        <td className="num text-violet-700">
                          {Number(m.cantidad_devolucion) ? <>{fmtNum(m.cantidad_devolucion)} {m.estado_stock !== 'DISPONIBLE' && <EstadoProductoBadge estado={m.estado_stock} />}</> : ''}
                        </td>
                        <td className="num font-semibold">{fmtNum(m.saldo)}</td>
                        <td className="num">{fmtMoney(m.costo_unitario)}</td>
                        <td className="num">{fmtMoney(m.valor)}</td>
                        <td className="whitespace-nowrap text-slate-500">{m.usuario_nombre}</td>
                        <td className="max-w-[240px] truncate text-xs text-slate-500" title={m.observacion || ''}>{m.observacion}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="bg-slate-50 font-semibold">
                    <td colSpan={3} className="text-right">Totales del período</td>
                    <td className="num text-emerald-700">{fmtNum(totales.e)}</td><td className="num">{fmtNum(totales.s)}</td><td className="num text-violet-700">{fmtNum(totales.d)}</td>
                    <td colSpan={5}></td>
                  </tr></tfoot>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
