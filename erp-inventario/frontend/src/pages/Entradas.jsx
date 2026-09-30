import { useEffect, useState } from 'react';
import { Plus, Trash2, Eye, Ban } from 'lucide-react';
import api, { errorMessage, fieldErrors } from '../api/client';
import useFetch, { useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal, { ConfirmDialog } from '../components/Modal';
import ProductSelect from '../components/ProductSelect';
import { PageHeader, TableCard, SearchInput, LoadingBlock, ErrorBlock, EmptyState, Pagination, EstadoBadge, Field, DetailItem } from '../components/ui';
import { fmtNum, fmtMoney, fmtDate, fmtDateTime, hoy } from '../utils/format';
import { CreacionRapida, EtiquetaConAccion, CAMPOS_PROVEEDOR } from '../components/CreacionRapida';

let k = 1;
const linea = () => ({ key: k++, producto_id: null, cantidad: '', costo_unitario: '' });

function EntradaForm({ open, onClose, onSaved }) {
  const toast = useToast();
  const { data: proveedores, setData: setProveedores } = useFetch('/proveedores', { activo: 'true' }, { enabled: open });
  const [nuevoProv, setNuevoProv] = useState(false);
  const { data: almacenes } = useFetch('/almacenes', { activo: 'true' }, { enabled: open });
  const { data: productos } = useFetch('/productos', { activo: 'true', limit: 1000 }, { enabled: open });
  const [f, setF] = useState({});
  const [lineas, setLineas] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({ fecha: hoy(), documento_ref: '', proveedor_id: '', almacen_id: '', observaciones: '' });
    setLineas([linea()]);
    setErrors({});
    setNuevoProv(false);
  }, [open]);
  useEffect(() => {
    if (open && almacenes?.length && !f.almacen_id) setF((x) => ({ ...x, almacen_id: String(almacenes[0].id) }));
  }, [open, almacenes, f.almacen_id]);

  const set = (key) => (e) => setF((x) => ({ ...x, [key]: e.target.value }));
  const setL = (key, c) => setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...c } : l)));
  const total = lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0), 0);
  const lista = productos?.data || [];

  async function submit() {
    const e = {};
    if (!f.fecha) e.fecha = 'La fecha es obligatoria';
    if (!f.almacen_id) e.almacen_id = 'Seleccione el almacén';
    const usadas = lineas.filter((l) => l.producto_id || l.cantidad || l.costo_unitario);
    if (!usadas.length) e.items = 'Agregue al menos un producto';
    usadas.forEach((l) => {
      if (!l.producto_id) e[`p${l.key}`] = 'Seleccione el producto';
      if (!(Number(l.cantidad) > 0)) e[`c${l.key}`] = 'Mayor a 0';
      if (l.costo_unitario === '' || Number(l.costo_unitario) < 0) e[`u${l.key}`] = 'Costo ≥ 0';
    });
    setErrors(e);
    if (Object.keys(e).length) return toast.error('Revise los campos marcados');
    setSaving(true);
    try {
      const { data } = await api.post('/entradas', {
        ...f, proveedor_id: f.proveedor_id ? Number(f.proveedor_id) : null, almacen_id: Number(f.almacen_id),
        items: usadas.map((l) => ({ producto_id: l.producto_id, cantidad: Number(l.cantidad), costo_unitario: Number(l.costo_unitario) })),
      });
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
    <Modal open={open} onClose={onClose} size="xl" title="Registrar entrada" subtitle="Al confirmar, el stock aumenta automáticamente y se registra en el Kardex"
      footer={<>
        <span className="mr-auto self-center text-sm text-slate-600">Total: <b className="tabular-nums text-slate-900">{fmtMoney(total)}</b></span>
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Registrando…' : 'Confirmar entrada'}</button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Fecha" required error={errors.fecha}><input type="date" className="input" value={f.fecha || ''} max={hoy()} onChange={set('fecha')} /></Field>
        <div className="sm:col-span-2">
          <EtiquetaConAccion label="Proveedor" accion={!nuevoProv && 'Nuevo'} onAccion={() => setNuevoProv(true)} />
          <select className="input" value={f.proveedor_id || ''} onChange={set('proveedor_id')}>
            <option value="">Sin proveedor (inventario inicial u otro ingreso)</option>
            {proveedores?.map((p) => <option key={p.id} value={p.id}>{p.razon_social} · {p.ruc}</option>)}
          </select>
          {nuevoProv && (
            <CreacionRapida titulo="Proveedor" endpoint="/proveedores" campos={CAMPOS_PROVEEDOR}
              onCancelar={() => setNuevoProv(false)}
              onCreado={(p) => {
                setProveedores((l) => [...(l || []), p].sort((a, b) => a.razon_social.localeCompare(b.razon_social)));
                setF((x) => ({ ...x, proveedor_id: String(p.id) }));
                setNuevoProv(false);
              }} />
          )}
        </div>
        <Field label="Almacén" required error={errors.almacen_id}>
          <select className="input" value={f.almacen_id || ''} onChange={set('almacen_id')}>
            {almacenes?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
        <Field label="Documento" hint="Factura, guía de remisión o referencia">
          <input className="input" value={f.documento_ref || ''} onChange={set('documento_ref')} placeholder="F001-000123" />
        </Field>
        <Field label="Observaciones" className="sm:col-span-3"><input className="input" value={f.observaciones || ''} onChange={set('observaciones')} /></Field>
      </div>

      <div className="mt-5 rounded-md border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-sm font-medium text-slate-700">Productos</span>
          <button className="btn-secondary btn-sm" onClick={() => setLineas((l) => [...l, linea()])}><Plus className="h-4 w-4" /> Agregar</button>
        </div>
        {errors.items && <p className="px-3 pt-2 text-sm text-red-600">{errors.items}</p>}
        <div className="space-y-2 p-3">
          <div className="hidden grid-cols-12 gap-2 px-1 font-display text-[13px] font-semibold text-slate-500 sm:grid">
            <span className="col-span-6">Producto</span><span className="col-span-2 text-right">Cantidad</span><span className="col-span-2 text-right">Costo unit. (S/)</span><span className="col-span-2 text-right">Costo total</span>
          </div>
          {lineas.map((l) => {
            const prod = lista.find((p) => p.id === l.producto_id);
            return (
              <div key={l.key} className="grid grid-cols-12 items-start gap-2">
                <div className="col-span-12 sm:col-span-6">
                  <ProductSelect products={lista} value={l.producto_id} excludeIds={lineas.map((x) => x.producto_id).filter(Boolean)} error={errors[`p${l.key}`]}
                    onChange={(p) => setL(l.key, { producto_id: p.id, costo_unitario: l.costo_unitario || p.precio_compra })} />
                  {errors[`p${l.key}`] && <p className="mt-1 text-xs text-red-600">{errors[`p${l.key}`]}</p>}
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input type="number" min="0" step="any" placeholder={prod?.unidad_medida || 'Cant.'} className={`input text-right ${errors[`c${l.key}`] ? 'input-error' : ''}`} value={l.cantidad} onChange={(e) => setL(l.key, { cantidad: e.target.value })} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input type="number" min="0" step="0.01" placeholder="0.00" className={`input text-right ${errors[`u${l.key}`] ? 'input-error' : ''}`} value={l.costo_unitario} onChange={(e) => setL(l.key, { costo_unitario: e.target.value })} />
                </div>
                <div className="col-span-4 flex items-center justify-end gap-1 sm:col-span-2">
                  <span className="text-sm tabular-nums text-slate-700">{fmtMoney((Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0))}</span>
                  <button className="btn-ghost btn-sm text-red-600" disabled={lineas.length === 1} onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

function EntradaDetalle({ id, onClose, onChanged }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data: e, loading, reload } = useFetch(id ? `/entradas/${id}` : null, null, { enabled: !!id });
  const [anular, setAnular] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirmar() {
    setBusy(true);
    try {
      const { data } = await api.post(`/entradas/${id}/anular`, { motivo });
      toast.success(data.message);
      setAnular(false); setMotivo(''); reload(); onChanged();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  }

  return (
    <Modal open={!!id} onClose={onClose} size="lg" title={e ? `Entrada ${e.numero}` : 'Entrada'} subtitle={e ? (e.proveedor_nombre || e.documento_ref || 'Sin proveedor') : ''}
      footer={e && e.estado !== 'ANULADA' && can('SUPERVISOR') && <button className="btn-danger" onClick={() => setAnular(true)}><Ban className="h-4 w-4" /> Anular entrada</button>}>
      {loading || !e ? <LoadingBlock /> : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DetailItem label="Estado"><EstadoBadge estado={e.estado} /></DetailItem>
            <DetailItem label="Fecha">{fmtDate(e.fecha)}</DetailItem>
            <DetailItem label="Documento">{e.documento_ref}</DetailItem>
            <DetailItem label="Almacén">{e.almacen_nombre}</DetailItem>
            <DetailItem label="Registrado por">{e.usuario_nombre}</DetailItem>
            <DetailItem label="Registrado el">{fmtDateTime(e.created_at)}</DetailItem>
            {e.observaciones && <div className="col-span-2"><DetailItem label="Observaciones">{e.observaciones}</DetailItem></div>}
          </dl>
          {e.estado === 'ANULADA' && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">Anulada el {fmtDateTime(e.anulado_at)} por {e.anulado_por_nombre}. Motivo: {e.motivo_anulacion}</div>}
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="table-base">
              <thead><tr><th>SKU</th><th>Producto</th><th className="num">Cantidad</th><th className="num">Costo unit.</th><th className="num">Costo total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {e.detalles.map((d) => (
                  <tr key={d.id}><td><span className="code-tag">{d.sku}</span></td><td>{d.producto_nombre}</td><td className="num">{fmtNum(d.cantidad)} {d.unidad_medida}</td><td className="num">{fmtMoney(d.costo_unitario)}</td><td className="num">{fmtMoney(d.costo_total)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-slate-50 font-semibold"><td colSpan={4} className="text-right">Total</td><td className="num">{fmtMoney(e.total)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}
      <ConfirmDialog open={anular} danger title={`Anular entrada ${e?.numero}`} confirmText="Anular"
        message="Se retirará del stock disponible lo que ingresó con esta entrada. Solo es posible si ese stock no fue despachado."
        requireReason reason={motivo} setReason={setMotivo} loading={busy} onConfirm={confirmar} onClose={() => setAnular(false)} />
    </Modal>
  );
}

export default function Entradas() {
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [nueva, setNueva] = useState(false);
  const [ver, setVer] = useState(null);
  const dq = useDebounce(q);
  const { data: proveedores } = useFetch('/proveedores');
  const { data, loading, error, reload } = useFetch('/entradas', { q: dq, proveedor_id: proveedor, desde, hasta, page, limit: 15 });

  useEffect(() => setPage(1), [dq, proveedor, desde, hasta]);

  return (
    <>
      <PageHeader title="Entradas" subtitle="Ingreso de productos al almacén desde proveedores"
        actions={can('ALMACEN') && <button className="btn-primary" onClick={() => setNueva(true)}><Plus className="h-4 w-4" /> Nueva entrada</button>} />
      <TableCard
        toolbar={<>
          <SearchInput value={q} onChange={setQ} placeholder="N° entrada, documento o proveedor" className="lg:w-72" />
          <select className="input lg:w-60" value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores?.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
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
            <thead><tr><th>N° entrada</th><th>Fecha</th><th>Proveedor</th><th>Documento</th><th>Almacén</th><th className="num">Ítems</th><th className="num">Total</th><th>Usuario</th><th>Estado</th><th></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.data.map((e) => (
                <tr key={e.id} className="cursor-pointer" onClick={() => setVer(e.id)}>
                  <td><span className="code-tag">{e.numero}</span></td>
                  <td className="whitespace-nowrap">{fmtDate(e.fecha)}</td>
                  <td className="max-w-[220px] truncate">{e.proveedor_nombre || <span className="text-slate-400">Sin proveedor</span>}</td>
                  <td className="whitespace-nowrap text-slate-500">{e.documento_ref || '—'}</td>
                  <td className="whitespace-nowrap">{e.almacen_nombre}</td>
                  <td className="num">{e.items}</td>
                  <td className="num">{fmtMoney(e.total)}</td>
                  <td className="whitespace-nowrap text-slate-500">{e.usuario_nombre}</td>
                  <td><EstadoBadge estado={e.estado} /></td>
                  <td className="text-right"><button className="btn-ghost btn-sm" aria-label="Ver detalle"><Eye className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
      <EntradaForm open={nueva} onClose={() => setNueva(false)} onSaved={() => { setNueva(false); reload(); }} />
      <EntradaDetalle id={ver} onClose={() => setVer(null)} onChanged={reload} />
    </>
  );
}
