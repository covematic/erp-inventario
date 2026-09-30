import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Package, Boxes, AlertTriangle, PackageX, PackageMinus, Undo2, Wallet, Clock, ArrowRight, FolderKanban, Table2, BarChart3,
} from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { LoadingBlock, ErrorBlock, PageHeader, StatCard, TipoMovBadge, EmptyState } from '../components/ui';
import { fmtNum, fmtMoney, fmtDateTime } from '../utils/format';

// Paleta categórica validada (daltonismo y contraste); fija por serie, nunca por posición
const SERIES = [
  { key: 'entradas', label: 'Entradas', color: '#2E63B8' },
  { key: 'salidas', label: 'Salidas', color: '#E8741C' },
  { key: 'devoluciones', label: 'Devoluciones', color: '#12917E' },
];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const labelMes = (ym) => {
  const [y, m] = ym.split('-');
  return `${MESES[Number(m) - 1]} ${y.slice(2)}`;
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-800">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-medium tabular-nums text-slate-900">{fmtNum(p.value)} und.</span>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch('/dashboard');
  const [vista, setVista] = useState('grafico');
  const navigate = useNavigate();

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  const { kpis, serie, ultimos_movimientos: ultimos, productos_criticos: criticos, top_proyectos: top } = data;
  const serieFmt = serie.map((s) => ({ ...s, mes: labelMes(s.mes) }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumen del inventario y de los movimientos recientes" />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatCard label="Productos registrados" value={fmtNum(kpis.total_productos)} icon={Package} onClick={() => navigate('/productos')} />
        <StatCard label="Stock disponible" value={`${fmtNum(kpis.stock_disponible)} und.`} icon={Boxes} tone="green"
          hint={`${fmtNum(kpis.stock_comprometido)} comprometidas`} onClick={() => navigate('/inventario')} />
        <StatCard label="Stock bajo" value={fmtNum(kpis.productos_stock_bajo)} icon={AlertTriangle} tone="amber"
          hint="en o bajo el mínimo" onClick={() => navigate('/productos?estado_stock=BAJO')} />
        <StatCard label="Agotados" value={fmtNum(kpis.productos_agotados)} icon={PackageX} tone="red"
          onClick={() => navigate('/productos?estado_stock=AGOTADO')} />
        <StatCard label="Salidas realizadas" value={fmtNum(kpis.salidas)} icon={PackageMinus} tone="slate"
          hint={kpis.salidas_pendientes ? `${kpis.salidas_pendientes} guía(s) pendiente(s)` : 'guías despachadas'} onClick={() => navigate('/salidas')} />
        <StatCard label="Devoluciones" value={fmtNum(kpis.devoluciones)} icon={Undo2} tone="purple"
          hint={`${fmtNum(Number(kpis.stock_danado) + Number(kpis.stock_defectuoso))} und. no aptas`} onClick={() => navigate('/devoluciones')} />
        <StatCard label="Valor del inventario" value={fmtMoney(kpis.valor_inventario)} icon={Wallet} tone="blue" hint="a costo promedio" />
        <StatCard label="Proyectos activos" value={fmtNum(kpis.proyectos_activos)} icon={FolderKanban} tone="slate" onClick={() => navigate('/proyectos')} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="card p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-900">Entradas, salidas y devoluciones</h2>
              <p className="text-xs text-slate-500">Unidades por mes · últimos 6 meses</p>
            </div>
            <div className="flex rounded-md border border-slate-200 p-0.5">
              <button onClick={() => setVista('grafico')} className={`rounded-md p-1.5 ${vista === 'grafico' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`} aria-label="Ver gráfico"><BarChart3 className="h-4 w-4" /></button>
              <button onClick={() => setVista('tabla')} className={`rounded-md p-1.5 ${vista === 'tabla' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`} aria-label="Ver tabla"><Table2 className="h-4 w-4" /></button>
            </div>
          </div>
          {vista === 'grafico' ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serieFmt} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#D9DED7" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={{ stroke: '#C0C7BE' }} tick={{ fontSize: 12, fill: '#666F65' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#666F65' }} tickFormatter={(v) => fmtNum(v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ECEEEA' }} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
                  {SERIES.map((s) => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Mes</th>{SERIES.map((s) => <th key={s.key} className="num">{s.label}</th>)}<th className="num">Valor salidas</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {serieFmt.map((r) => (
                    <tr key={r.mes}><td>{r.mes}</td>{SERIES.map((s) => <td key={s.key} className="num">{fmtNum(r[s.key])}</td>)}<td className="num">{fmtMoney(r.valor_salidas)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Productos críticos</h2>
            <Link to="/alertas" className="text-xs font-medium text-brand-600 hover:underline">Ver alertas</Link>
          </div>
          {criticos.length === 0 ? (
            <EmptyState title="Todo en orden" text="Ningún producto está en el mínimo o agotado." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {criticos.map((p) => {
                const pct = Number(p.stock_minimo) > 0 ? Math.min(100, (Number(p.disponible) / Number(p.stock_minimo)) * 100) : 0;
                const agotado = Number(p.disponible) === 0;
                return (
                  <li key={p.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <Link to={`/kardex/${p.id}`} className="truncate font-medium text-slate-800 hover:text-brand-700">{p.nombre}</Link>
                      <span className={`shrink-0 text-xs font-medium tabular-nums ${agotado ? 'text-red-600' : 'text-amber-700'}`}>
                        {agotado ? 'Agotado' : `${fmtNum(p.disponible)} / ${fmtNum(p.stock_minimo)}`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${agotado ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Clock className="h-4 w-4 text-slate-400" /> Últimos movimientos</h2>
            <Link to="/movimientos" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">Historial completo <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Documento</th><th>Producto</th><th className="num">Cantidad</th><th>Usuario</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {ultimos.map((m) => {
                  const cant = Number(m.cantidad_entrada) || Number(m.cantidad_devolucion) || -Number(m.cantidad_salida);
                  return (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap text-slate-500">{fmtDateTime(m.fecha)}</td>
                      <td><TipoMovBadge tipo={m.tipo} /></td>
                      <td><span className="code-tag">{m.documento_numero}</span></td>
                      <td className="max-w-[220px] truncate">{m.producto_nombre}</td>
                      <td className={`num font-medium ${cant < 0 ? 'text-slate-900' : 'text-emerald-700'}`}>{cant > 0 ? '+' : ''}{fmtNum(cant)} {m.unidad_medida}</td>
                      <td className="whitespace-nowrap text-slate-500">{m.usuario_nombre}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-1 font-semibold text-slate-900">Consumo por proyecto</h2>
          <p className="mb-3 text-xs text-slate-500">Valor neto despachado (descontando devoluciones)</p>
          {top.length === 0 ? <EmptyState title="Sin consumo registrado" /> : (
            <ul className="space-y-3">
              {top.map((p) => {
                const max = Number(top[0].valor) || 1;
                return (
                  <li key={p.id}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate text-slate-700"><span className="code-tag">{p.codigo}</span> {p.nombre}</span>
                      <span className="shrink-0 font-medium tabular-nums text-slate-900">{fmtMoney(p.valor)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[#2E63B8]" style={{ width: `${(Number(p.valor) / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
