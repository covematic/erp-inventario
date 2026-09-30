import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Eye, Truck, Ban, Undo2, Printer } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import useFetch, { useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal, { ConfirmDialog } from '../components/Modal';
import {
  PageHeader, TableCard, SearchInput, LoadingBlock, ErrorBlock, EmptyState, Pagination, EstadoBadge, Badge, DetailItem,
} from '../components/ui';
import { fmtNum, fmtMoney, fmtDate, fmtDateTime, MOTIVOS_SALIDA } from '../utils/format';

export function SalidaDetalle({ id, onClose, onChanged }) {
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: s, loading, reload } = useFetch(id ? `/salidas/${id}` : null, null, { enabled: !!id });
  const [accion, setAccion] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  async function ejecutar() {
    setBusy(true);
    try {
      const { data } = accion === 'despachar'
        ? await api.post(`/salidas/${id}/despachar`)
        : await api.post(`/salidas/${id}/anular`, { motivo });
      toast.success(data.message);
      setAccion(null);
      setMotivo('');
      reload();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const pendienteDev = s?.detalles?.some((d) => Number(d.pendiente_devolucion) > 0);

  return (
    <Modal
      open={!!id}
      onClose={onClose}
      size="lg"
      title={s ? `Guía de salida ${s.numero}` : 'Guía de salida'}
      subtitle={s ? `${s.tipo_destino === 'PROYECTO' ? 'Proyecto' : 'Área'}: ${s.destino_nombre}` : ''}
      footer={s && <>
        <button className="btn-secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</button>
        {s.estado === 'PENDIENTE' && can('ALMACEN') && <button className="btn-primary" onClick={() => setAccion('despachar')}><Truck className="h-4 w-4" /> Despachar</button>}
        {s.estado === 'DESPACHADA' && pendienteDev && can('ALMACEN') && (
          <button className="btn-secondary" onClick={() => navigate('/devoluciones', { state: { salidaId: s.id } })}><Undo2 className="h-4 w-4" /> Registrar devolución</button>
        )}
        {s.estado !== 'ANULADA' && can('SUPERVISOR') && <button className="btn-danger" onClick={() => setAccion('anular')}><Ban className="h-4 w-4" /> Anular</button>}
      </>}
    >
      {loading || !s ? <LoadingBlock /> : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailItem label="Estado"><EstadoBadge estado={s.estado} /></DetailItem>
            <DetailItem label="Fecha">{fmtDate(s.fecha)}</DetailItem>
            <DetailItem label="N° guía física">{s.numero_guia}</DetailItem>
            <DetailItem label="Motivo">{MOTIVOS_SALIDA[s.motivo]}</DetailItem>
            <DetailItem label="Almacén">{s.almacen_nombre}</DetailItem>
            <DetailItem label="Responsable">{s.responsable}</DetailItem>
            <DetailItem label="Registrado por">{s.usuario_nombre}</DetailItem>
            <DetailItem label="Despachado">{s.despachado_at ? `${fmtDateTime(s.despachado_at)} · ${s.despachado_por_nombre}` : null}</DetailItem>
            {s.requiere_devolucion && <DetailItem label="Retorno estimado">{fmtDate(s.fecha_retorno_estimada)}</DetailItem>}
            {s.observaciones && <div className="col-span-2 sm:col-span-4"><DetailItem label="Observaciones">{s.observaciones}</DetailItem></div>}
          </dl>
          {s.estado === 'ANULADA' && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Anulada el {fmtDateTime(s.anulado_at)} por {s.anulado_por_nombre}. Motivo: {s.motivo_anulacion}
            </div>
          )}
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="table-base">
              <thead><tr><th>SKU</th><th>Producto</th><th className="num">Cantidad</th><th className="num">Devuelto</th><th className="num">Pendiente</th><th className="num">Costo unit.</th><th className="num">Valor</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {s.detalles.map((d) => (
                  <tr key={d.id}>
                    <td><span className="code-tag">{d.sku}</span></td>
                    <td>{d.producto_nombre}</td>
                    <td className="num">{fmtNum(d.cantidad)} {d.unidad_medida}</td>
                    <td className="num text-violet-700">{Number(d.cantidad_devuelta) ? fmtNum(d.cantidad_devuelta) : '—'}</td>
                    <td className={`num ${Number(d.pendiente_devolucion) > 0 && s.requiere_devolucion ? 'font-medium text-amber-700' : 'text-slate-500'}`}>{fmtNum(d.pendiente_devolucion)}</td>
                    <td className="num">{fmtMoney(d.costo_unitario)}</td>
                    <td className="num">{fmtMoney(d.cantidad * d.costo_unitario)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-slate-50 font-semibold"><td colSpan={6} className="text-right">Total</td><td className="num">{fmtMoney(s.valor_total)}</td></tr></tfoot>
            </table>
          </div>
          {s.devoluciones.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Devoluciones asociadas</h3>
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
                {s.devoluciones.map((d) => (
                  <li key={d.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                    <span><span className="code-tag">{d.numero}</span> · {d.motivo}</span>
                    <span className="text-slate-500">{fmtDate(d.fecha)} · {d.responsable}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!accion}
        danger={accion === 'anular'}
        title={accion === 'anular' ? `Anular guía ${s?.numero}` : `Despachar guía ${s?.numero}`}
        message={accion === 'anular'
          ? (s?.estado === 'PENDIENTE'
            ? 'Se liberará el stock reservado. Esta acción no se puede deshacer.'
            : 'Se reintegrará al stock disponible todo lo que no haya sido devuelto y quedará registrado en el Kardex. Esta acción no se puede deshacer.')
          : 'Se descontará el stock reservado y se registrará la salida en el Kardex.'}
        confirmText={accion === 'anular' ? 'Anular guía' : 'Despachar'}
        requireReason={accion === 'anular'}
        reason={motivo}
        setReason={setMotivo}
        loading={busy}
        onConfirm={ejecutar}
        onClose={() => setAccion(null)}
      />
    </Modal>
  );
}

export default function Salidas() {
  const { can } = useAuth();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [ver, setVer] = useState(location.state?.abrir || null);
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch('/salidas', { q: dq, estado, tipo_destino: tipo, desde, hasta, page, limit: 15 });

  useEffect(() => setPage(1), [dq, estado, tipo, desde, hasta]);

  return (
    <>
      <PageHeader
        title="Guías de salida"
        subtitle="Salidas de almacén hacia proyectos y áreas internas"
        actions={can('ALMACEN') && <Link to="/salidas/nueva" className="btn-primary"><Plus className="h-4 w-4" /> Nueva guía</Link>}
      />
      <TableCard
        toolbar={<>
          <SearchInput value={q} onChange={setQ} placeholder="N° salida, guía, proyecto, área o responsable" className="lg:w-80" />
          <select className="input lg:w-40" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option><option value="DESPACHADA">Despachadas</option><option value="PENDIENTE">Pendientes</option><option value="ANULADA">Anuladas</option>
          </select>
          <select className="input lg:w-36" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todo destino</option><option value="PROYECTO">Proyectos</option><option value="AREA">Áreas</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
            <span className="text-slate-400">–</span>
            <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
          </div>
        </>}
        footer={data && <Pagination page={page} limit={data.limit} total={data.total} onPage={setPage} />}
      >
        {loading && !data ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : data.data.length === 0 ? <EmptyState /> : (
          <table className="table-base">
            <thead><tr><th>N° salida</th><th>Fecha</th><th>Destino</th><th>Motivo</th><th>Responsable</th><th className="num">Ítems</th><th className="num">Valor</th><th>Estado</th><th></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.data.map((s) => (
                <tr key={s.id} className="cursor-pointer" onClick={() => setVer(s.id)}>
                  <td>
                    <p><span className="code-tag">{s.numero}</span></p>
                    {s.numero_guia && <p className="text-xs text-slate-500">{s.numero_guia}</p>}
                  </td>
                  <td className="whitespace-nowrap">{fmtDate(s.fecha)}</td>
                  <td className="max-w-[240px]">
                    <Badge tone={s.tipo_destino === 'PROYECTO' ? 'blue' : 'gray'}>{s.tipo_destino === 'PROYECTO' ? 'Proyecto' : 'Área'}</Badge>
                    <p className="mt-0.5 truncate text-sm">{s.destino_nombre}</p>
                  </td>
                  <td className="whitespace-nowrap">{MOTIVOS_SALIDA[s.motivo]}</td>
                  <td className="whitespace-nowrap">{s.responsable}</td>
                  <td className="num">{s.items}</td>
                  <td className="num">{fmtMoney(s.valor_total)}</td>
                  <td>
                    <EstadoBadge estado={s.estado} />
                    {s.requiere_devolucion && s.estado === 'DESPACHADA' && Number(s.pendiente_devolucion) > 0 && (
                      <Badge tone="amber" className="ml-1">Por devolver</Badge>
                    )}
                  </td>
                  <td className="text-right"><button className="btn-ghost btn-sm" aria-label="Ver detalle"><Eye className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
      <SalidaDetalle id={ver} onClose={() => setVer(null)} onChanged={reload} />
    </>
  );
}
