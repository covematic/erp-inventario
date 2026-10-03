import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Eye, Undo2 } from 'lucide-react';
import api, { errorMessage, fieldErrors } from '../api/client';
import useFetch, { useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { PageHeader, TableCard, SearchInput, LoadingBlock, ErrorBlock, EmptyState, Pagination, Field, DetailItem, EstadoProductoBadge } from '../components/ui';
import { CampoLista } from '../components/ListaObligatoria';
import { fmtNum, fmtDate, hoy } from '../utils/format';
import { enfocarPrimerError } from '../utils/foco';

const ESTADOS = [
  ['BUENO', 'Bueno', 'Vuelve al stock disponible', 'text-emerald-700'],
  ['DANADO', 'Dañado', 'Pasa a stock dañado', 'text-orange-700'],
  ['DEFECTUOSO', 'Defectuoso', 'Pasa a stock defectuoso', 'text-red-700'],
];

function DevolucionForm({ open, salidaInicial, onClose, onSaved }) {
  const toast = useToast();
  const { data: guias } = useFetch('/salidas', { devolvibles: 'true', limit: 200 }, { enabled: open });
  const [salidaId, setSalidaId] = useState('');
  const { data: salida, loading: cargandoGuia } = useFetch(salidaId ? `/salidas/${salidaId}` : null, null, { enabled: !!salidaId });
  const [f, setF] = useState({ fecha: hoy(), motivo: '', responsable: '', observaciones: '' });
  const [cant, setCant] = useState({}); // { [detalleId]: { BUENO, DANADO, DEFECTUOSO } }
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSalidaId(salidaInicial ? String(salidaInicial) : '');
    setF({ fecha: hoy(), motivo: '', responsable: '', observaciones: '' });
    setCant({});
    setErrors({});
  }, [open, salidaInicial]);

  useEffect(() => {
    setCant({});
    if (salida) setF((x) => ({ ...x, responsable: x.responsable || salida.responsable }));
  }, [salida]);

  const lineas = useMemo(() => (salida?.detalles || []).filter((d) => Number(d.pendiente_devolucion) > 0), [salida]);
  const setC = (id, estado, v) => setCant((c) => ({ ...c, [id]: { ...c[id], [estado]: v } }));
  const totalLinea = (id) => ESTADOS.reduce((a, [e]) => a + (Number(cant[id]?.[e]) || 0), 0);
  const total = lineas.reduce((a, l) => a + totalLinea(l.id), 0);

  async function submit() {
    const e = {};
    if (!salidaId) e.salida_id = 'Seleccione la guía de salida';
    if (!f.fecha) e.fecha = 'La fecha es obligatoria';
    else if (salida && f.fecha < salida.fecha) e.fecha = `No puede ser anterior a la guía (${fmtDate(salida.fecha)})`;
    if (!f.motivo.trim()) e.motivo = 'Indique el motivo';
    if (!f.responsable.trim()) e.responsable = 'Indique quién devuelve';
    for (const l of lineas) {
      for (const [est] of ESTADOS) if (Number(cant[l.id]?.[est]) < 0) e[`l${l.id}`] = 'No se admiten cantidades negativas';
      if (totalLinea(l.id) > Number(l.pendiente_devolucion)) e[`l${l.id}`] = `Máximo ${fmtNum(l.pendiente_devolucion)} (lo que falta devolver)`;
    }
    if (salidaId && total <= 0) e.items = 'Ingrese la cantidad devuelta de al menos un producto';
    setErrors(e);
    if (Object.keys(e).length) { enfocarPrimerError(); return toast.error('Revise los datos de la devolución'); }

    const items = lineas.flatMap((l) => ESTADOS
      .filter(([est]) => Number(cant[l.id]?.[est]) > 0)
      .map(([est]) => ({ detalle_salida_id: l.id, cantidad: Number(cant[l.id][est]), estado_producto: est })));
    setSaving(true);
    try {
      const { data } = await api.post('/devoluciones', { ...f, salida_id: Number(salidaId), items });
      toast.success(data.message);
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Registrar devolución"
      subtitle="Toda devolución se vincula a una guía de salida despachada"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit} disabled={saving || !salidaId}><Undo2 className="h-4 w-4" /> {saving ? 'Registrando…' : `Registrar (${fmtNum(total)} und.)`}</button>
      </>}
    >
      <div className="space-y-4">
        <CampoLista tipo="guiaDevolvible" opciones={guias?.data} label="Guía de salida" error={errors.salida_id} hint="Solo se listan guías despachadas con productos pendientes de devolver">
          <select className={`input ${errors.salida_id ? 'input-error' : ''}`} value={salidaId} onChange={(e) => setSalidaId(e.target.value)}>
            <option value="">Seleccione…</option>
            {guias?.data.map((g) => (
              <option key={g.id} value={g.id}>{g.numero} · {fmtDate(g.fecha)} · {g.destino_nombre}</option>
            ))}
          </select>
        </CampoLista>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fecha" required error={errors.fecha}>
            <input type="date" className="input" value={f.fecha} max={hoy()} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
          </Field>
          <Field label="Responsable que devuelve" required error={errors.responsable} className="sm:col-span-2">
            <input className="input" value={f.responsable} onChange={(e) => setF({ ...f, responsable: e.target.value })} />
          </Field>
        </div>
        <Field label="Motivo de la devolución" required error={errors.motivo}>
          <input className="input" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ej. material sobrante de obra, herramienta prestada" />
        </Field>

        {salidaId && (cargandoGuia && !salida ? <LoadingBlock /> : (
          <div className="rounded-md border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Indique cuántas unidades vuelven en cada estado. Las dañadas o defectuosas no regresan al stock disponible.
            </div>
            {errors.items && <p className="mx-3 mt-2 text-sm text-red-600">{errors.items}</p>}
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Producto</th><th className="num">Despachado</th><th className="num">Por devolver</th>{ESTADOS.map(([k, l]) => <th key={k} className="num">{l}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lineas.map((l) => (
                    <tr key={l.id} className={errors[`l${l.id}`] ? 'bg-red-50/50' : ''}>
                      <td>
                        <p className="font-medium text-slate-900">{l.producto_nombre}</p>
                        <p className="text-xs text-slate-500">{l.sku} · {l.unidad_medida}</p>
                        {errors[`l${l.id}`] && <p className="text-xs text-red-600">{errors[`l${l.id}`]}</p>}
                      </td>
                      <td className="num">{fmtNum(l.cantidad)}</td>
                      <td className="num font-medium">{fmtNum(l.pendiente_devolucion)}</td>
                      {ESTADOS.map(([k, , hint]) => (
                        <td key={k} className="w-24">
                          <input type="number" aria-label={`${l.producto_nombre}: cantidad en estado ${k.toLowerCase()}`} min="0" step="any" max={l.pendiente_devolucion} title={hint}
                            className={`input w-24 text-right ${errors[`l${l.id}`] ? 'input-error' : ''}`}
                            value={cant[l.id]?.[k] ?? ''} placeholder="0" onChange={(e) => setC(l.id, k, e.target.value)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <Field label="Observaciones">
          <textarea className="input" rows={2} value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function DevolucionDetalle({ id, onClose }) {
  const { data: d, loading } = useFetch(id ? `/devoluciones/${id}` : null, null, { enabled: !!id });
  return (
    <Modal open={!!id} onClose={onClose} size="lg" title={d ? `Devolución ${d.numero}` : 'Devolución'} subtitle={d ? `Guía ${d.salida_numero} · ${d.destino_nombre}` : ''}>
      {loading || !d ? <LoadingBlock /> : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailItem label="Fecha">{fmtDate(d.fecha)}</DetailItem>
            <DetailItem label="Guía">{d.salida_numero}</DetailItem>
            <DetailItem label="Responsable">{d.responsable}</DetailItem>
            <DetailItem label="Registrado por">{d.usuario_nombre}</DetailItem>
            <div className="col-span-2 sm:col-span-4"><DetailItem label="Motivo">{d.motivo}</DetailItem></div>
            {d.observaciones && <div className="col-span-2 sm:col-span-4"><DetailItem label="Observaciones">{d.observaciones}</DetailItem></div>}
          </dl>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="table-base">
              <thead><tr><th>SKU</th><th>Producto</th><th className="num">Despachado</th><th className="num">Devuelto</th><th>Estado</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {d.detalles.map((x) => (
                  <tr key={x.id}>
                    <td><span className="code-tag">{x.sku}</span></td><td>{x.producto_nombre}</td>
                    <td className="num text-slate-500">{fmtNum(x.cantidad_despachada)}</td>
                    <td className="num font-medium">{fmtNum(x.cantidad)} {x.unidad_medida}</td>
                    <td><EstadoProductoBadge estado={x.estado_producto} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Devoluciones() {
  const { can } = useAuth();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: !!(location.state?.salidaId || location.state?.nuevo), salidaId: location.state?.salidaId || null });
  const [ver, setVer] = useState(null);
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch('/devoluciones', { q: dq, estado_producto: estado, desde, hasta, page, limit: 15 });

  useEffect(() => setPage(1), [dq, estado, desde, hasta]);

  return (
    <>
      <PageHeader
        title="Devoluciones"
        subtitle="Productos que regresan al almacén desde una guía de salida"
        actions={can('ALMACEN') && <button className="btn-primary" onClick={() => setForm({ open: true, salidaId: null })}><Plus className="h-4 w-4" /> Nueva devolución</button>}
      />
      <TableCard
        onLimpiar={() => { setEstado(''); setDesde(''); setHasta(''); }}
        toolbar={<>
          <SearchInput value={q} onChange={setQ} placeholder="N° devolución, guía, proyecto o responsable" className="lg:w-80" />
          <select aria-label="Filtrar por estado" className="input lg:w-48" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Cualquier estado</option><option value="BUENO">Con productos buenos</option><option value="DANADO">Con dañados</option><option value="DEFECTUOSO">Con defectuosos</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
            <span className="text-slate-500">–</span>
            <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
          </div>
        </>}
        footer={data && <Pagination page={page} limit={data.limit} total={data.total} onPage={setPage} />}
      >
        {loading && !data ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : data.data.length === 0 ? ((q || estado || desde || hasta)
          ? <EmptyState title="Ninguna devolución coincide" text="Pruebe con otra búsqueda, estado o rango de fechas." />
          : <EmptyState icon={Undo2} title="No hay devoluciones registradas" text="Cuando un proyecto o área devuelva material, regístrelo aquí indicando si vuelve bueno, dañado o defectuoso."
              action={can('ALMACEN') && <button className="btn-primary" onClick={() => setForm({ open: true, salidaId: null })}><Plus aria-hidden="true" className="h-4 w-4" /> Nueva devolución</button>} />) : (
          <table className="table-base">
            <thead><tr><th>N° devolución</th><th>Fecha</th><th>Guía</th><th>Destino</th><th>Motivo</th><th className="num">Bueno</th><th className="num">Dañado</th><th className="num">Defectuoso</th><th></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.data.map((d) => (
                <tr key={d.id} className="cursor-pointer" onClick={() => setVer(d.id)}>
                  <td><span className="code-tag">{d.numero}</span></td>
                  <td className="whitespace-nowrap">{fmtDate(d.fecha)}</td>
                  <td><span className="code-tag">{d.salida_numero}</span></td>
                  <td className="max-w-[220px] truncate">{d.destino_nombre}</td>
                  <td className="max-w-[220px] truncate">{d.motivo}</td>
                  <td className="num text-emerald-700">{Number(d.cant_bueno) ? fmtNum(d.cant_bueno) : '—'}</td>
                  <td className="num text-orange-700">{Number(d.cant_danado) ? fmtNum(d.cant_danado) : '—'}</td>
                  <td className="num text-red-700">{Number(d.cant_defectuoso) ? fmtNum(d.cant_defectuoso) : '—'}</td>
                  <td className="text-right"><button className="btn-ghost btn-sm" aria-label="Ver detalle"><Eye className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
      <DevolucionForm open={form.open} salidaInicial={form.salidaId} onClose={() => setForm({ open: false, salidaId: null })}
        onSaved={() => { setForm({ open: false, salidaId: null }); reload(); }} />
      <DevolucionDetalle id={ver} onClose={() => setVer(null)} />
    </>
  );
}
