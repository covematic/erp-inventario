import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, Info, PackageX, TrendingDown, Undo2, Ban, Wrench, CheckCheck, Check } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { PageHeader, LoadingBlock, ErrorBlock, EmptyState } from '../components/ui';
import { fmtDateTime } from '../utils/format';

const TIPOS = {
  AGOTADO: { label: 'Agotados', icon: PackageX },
  STOCK_BAJO: { label: 'Stock mínimo', icon: TrendingDown },
  PENDIENTE_DEVOLUCION: { label: 'Pendientes de devolución', icon: Undo2 },
  SALIDA_RECHAZADA: { label: 'Salidas rechazadas', icon: Ban },
  NO_APTO: { label: 'Dañados / defectuosos', icon: Wrench },
};
const NIVEL = {
  critico: { cls: 'border-l-red-500', icon: AlertOctagon, iconCls: 'text-red-600', label: 'Crítico' },
  advertencia: { cls: 'border-l-amber-500', icon: AlertTriangle, iconCls: 'text-amber-600', label: 'Advertencia' },
  info: { cls: 'border-l-brand-500', icon: Info, iconCls: 'text-brand-600', label: 'Información' },
};

function enlace(a) {
  if (a.salida_id) return { to: '/salidas', state: { abrir: a.salida_id }, label: 'Ver guía' };
  if (a.producto_id) return { to: `/kardex/${a.producto_id}`, label: 'Ver Kardex' };
  return null;
}

export default function Alertas() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/dashboard/alertas');

  async function revisar(id) {
    try {
      await (id ? api.post(`/dashboard/alertas/${id}/revisar`) : api.post('/dashboard/alertas/revisar-todas'));
      reload();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  const hayRechazos = data.data.some((a) => a.tipo === 'SALIDA_RECHAZADA');

  return (
    <>
      <PageHeader title="Alertas" subtitle="Situaciones del inventario que requieren atención"
        actions={hayRechazos && <button className="btn-secondary" onClick={() => revisar()}><CheckCheck className="h-4 w-4" /> Marcar rechazos como revisados</button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(TIPOS).map(([k, t]) => (
          <div key={k} className="card flex items-center gap-3 p-3">
            <t.icon className="h-5 w-5 text-slate-500" />
            <div><p className="text-lg font-semibold tabular-nums">{data.resumen[k] || 0}</p><p className="text-xs text-slate-500">{t.label}</p></div>
          </div>
        ))}
      </div>
      {data.data.length === 0 ? <div className="card"><EmptyState title="Sin alertas" text="El inventario no presenta situaciones que requieran atención." /></div> : (
        <ul className="space-y-2">
          {data.data.map((a, i) => {
            const n = NIVEL[a.nivel];
            const link = enlace(a);
            return (
              <li key={`${a.tipo}-${a.id || a.producto_id || a.salida_id}-${i}`} className={`card flex flex-col gap-3 border-l-4 p-4 sm:flex-row sm:items-center ${n.cls}`}>
                <n.icon className={`h-5 w-5 shrink-0 ${n.iconCls}`} aria-label={n.label} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{a.titulo}</p>
                  <p className="text-sm text-slate-600">{a.mensaje}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{n.label} · {TIPOS[a.tipo]?.label}{a.fecha ? ` · ${fmtDateTime(a.fecha)}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  {link && <Link to={link.to} state={link.state} className="btn-secondary btn-sm">{link.label}</Link>}
                  {a.tipo === 'SALIDA_RECHAZADA' && <button className="btn-ghost btn-sm" onClick={() => revisar(a.id)}><Check className="h-4 w-4" /> Revisada</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
