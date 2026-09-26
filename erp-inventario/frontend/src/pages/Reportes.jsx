import { useState } from 'react';
import { FileSpreadsheet, FileText, Play } from 'lucide-react';
import api, { download, errorMessage } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { PageHeader, LoadingBlock, EmptyState } from '../components/ui';
import { fmtNum, fmtMoney, fmtDate, fmtDateTime } from '../utils/format';

function celda(c, v) {
  if (v === null || v === undefined) return '—';
  if (c.tipo === 'moneda') return fmtMoney(v);
  if (c.tipo === 'numero') return fmtNum(v);
  if (c.tipo === 'fecha') return String(v).length > 10 ? fmtDateTime(v) : fmtDate(v);
  return v;
}

export default function Reportes() {
  const toast = useToast();
  const { data: catalogo } = useFetch('/reportes');
  const [sel, setSel] = useState('stock-actual');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rep, setRep] = useState(null);
  const [loading, setLoading] = useState(false);
  const actual = catalogo?.find((r) => r.id === sel);

  async function generar(id = sel) {
    if (desde && hasta && desde > hasta) return toast.error('La fecha "desde" no puede ser posterior a "hasta"');
    setLoading(true);
    try {
      const { data } = await api.get(`/reportes/${id}`, { params: { desde, hasta } });
      setRep(data);
    } catch (err) { toast.error(errorMessage(err)); } finally { setLoading(false); }
  }

  async function exportar(formato) {
    try {
      await download(`/reportes/${sel}`, { desde, hasta, formato }, `${sel}_${new Date().toISOString().slice(0, 10)}.${formato}`);
    } catch (err) { toast.error(errorMessage(err)); }
  }

  const totales = rep?.columnas.filter((c) => (c.tipo === 'moneda' || c.tipo === 'numero') && !/m[ií]nimo|costo|saldo|gu[ií]as/i.test(c.label));

  return (
    <>
      <PageHeader title="Reportes" subtitle="Consulte y exporte a Excel o CSV" />
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="card h-fit p-2 lg:col-span-1">
          {!catalogo ? <LoadingBlock /> : catalogo.map((r) => (
            <button key={r.id} onClick={() => { setSel(r.id); setRep(null); }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${sel === r.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              {r.titulo}
            </button>
          ))}
        </div>
        <div className="space-y-4 lg:col-span-3">
          <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-end">
            <div className="flex-1"><p className="font-semibold text-slate-900">{actual?.titulo}</p>
              <p className="text-xs text-slate-500">{actual?.usaFechas ? 'Filtre por período (opcional)' : 'Muestra la situación actual del inventario'}</p></div>
            {actual?.usaFechas && <>
              <div><label className="label text-xs">Desde</label><input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
              <div><label className="label text-xs">Hasta</label><input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
            </>}
            <button className="btn-primary" onClick={() => generar()} disabled={loading}><Play className="h-4 w-4" /> {loading ? 'Generando…' : 'Generar'}</button>
            <button className="btn-secondary" onClick={() => exportar('xlsx')}><FileSpreadsheet className="h-4 w-4" /> Excel</button>
            <button className="btn-secondary" onClick={() => exportar('csv')}><FileText className="h-4 w-4" /> CSV</button>
          </div>
          <div className="card overflow-hidden">
            {!rep ? <EmptyState title="Genere el reporte" text="Elija el reporte y presione Generar para ver los resultados aquí." /> : rep.filas.length === 0 ? <EmptyState text="No hay datos para el período seleccionado." /> : (
              <>
                <div className="border-b border-slate-200 px-4 py-2 text-xs text-slate-500">{rep.filas.length} fila(s)</div>
                <div className="max-h-[65vh] overflow-auto">
                  <table className="table-base">
                    <thead className="sticky top-0"><tr>{rep.columnas.map((c) => <th key={c.key} className={c.tipo === 'numero' || c.tipo === 'moneda' ? 'num' : ''}>{c.label}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {rep.filas.map((f, i) => (
                        <tr key={i}>{rep.columnas.map((c) => <td key={c.key} className={c.tipo === 'numero' || c.tipo === 'moneda' ? 'num' : 'whitespace-nowrap'}>{celda(c, f[c.key])}</td>)}</tr>
                      ))}
                    </tbody>
                    {totales.length > 0 && (
                      <tfoot className="sticky bottom-0"><tr className="bg-slate-100 font-semibold">
                        {rep.columnas.map((c, i) => (
                          <td key={c.key} className={c.tipo === 'numero' || c.tipo === 'moneda' ? 'num' : ''}>
                            {i === 0 ? 'Total' : totales.includes(c) ? celda(c, rep.filas.reduce((a, f) => a + Number(f[c.key] || 0), 0)) : ''}
                          </td>
                        ))}
                      </tr></tfoot>
                    )}
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
