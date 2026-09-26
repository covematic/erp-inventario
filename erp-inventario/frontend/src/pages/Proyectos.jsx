import { useEffect, useState } from 'react';
import { Plus, Pencil, Eye, Trash2 } from 'lucide-react';
import api, { errorMessage, fieldErrors } from '../api/client';
import useFetch, { useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal, { ConfirmDialog } from '../components/Modal';
import { PageHeader, TableCard, SearchInput, LoadingBlock, ErrorBlock, EmptyState, EstadoBadge, Field, DetailItem } from '../components/ui';
import { fmtNum, fmtMoney, fmtDate, hoy } from '../utils/format';

const VACIO = { codigo: '', nombre: '', cliente: '', responsable: '', ubicacion: '', fecha_inicio: hoy(), fecha_fin: '', estado: 'ACTIVO' };

function ProyectoForm({ open, proyecto, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(VACIO);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) { setErrors({}); setF(proyecto ? { ...VACIO, ...proyecto, cliente: proyecto.cliente || '', ubicacion: proyecto.ubicacion || '', fecha_fin: proyecto.fecha_fin || '' } : { ...VACIO, fecha_inicio: hoy() }); }
  }, [open, proyecto]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    const e = {};
    if (!f.codigo.trim()) e.codigo = 'El código es obligatorio';
    if (!f.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!f.responsable.trim()) e.responsable = 'El responsable es obligatorio';
    if (!f.fecha_inicio) e.fecha_inicio = 'La fecha de inicio es obligatoria';
    if (f.fecha_fin && f.fecha_fin < f.fecha_inicio) e.fecha_fin = 'No puede ser anterior al inicio';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const body = { codigo: f.codigo, nombre: f.nombre, cliente: f.cliente, responsable: f.responsable, ubicacion: f.ubicacion, fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin || null, estado: f.estado };
    try {
      if (proyecto) await api.put(`/proyectos/${proyecto.id}`, body); else await api.post('/proyectos', body);
      toast.success(proyecto ? 'Proyecto actualizado' : 'Proyecto registrado');
      onSaved();
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" required error={errors.codigo}><input className={`input uppercase ${errors.codigo ? 'input-error' : ''}`} value={f.codigo} onChange={set('codigo')} placeholder="PRY-004" /></Field>
        <Field label="Estado"><select className="input" value={f.estado} onChange={set('estado')}><option value="ACTIVO">Activo</option><option value="CERRADO">Cerrado</option></select></Field>
        <Field label="Nombre del proyecto" required error={errors.nombre} className="sm:col-span-2"><input className={`input ${errors.nombre ? 'input-error' : ''}`} value={f.nombre} onChange={set('nombre')} /></Field>
        <Field label="Cliente"><input className="input" value={f.cliente} onChange={set('cliente')} /></Field>
        <Field label="Responsable / residente" required error={errors.responsable}><input className={`input ${errors.responsable ? 'input-error' : ''}`} value={f.responsable} onChange={set('responsable')} /></Field>
        <Field label="Ubicación" className="sm:col-span-2"><input className="input" value={f.ubicacion} onChange={set('ubicacion')} /></Field>
        <Field label="Fecha de inicio" required error={errors.fecha_inicio}><input type="date" className="input" value={f.fecha_inicio} onChange={set('fecha_inicio')} /></Field>
        <Field label="Fecha de fin" error={errors.fecha_fin}><input type="date" className="input" value={f.fecha_fin} min={f.fecha_inicio} onChange={set('fecha_fin')} /></Field>
      </div>
    </Modal>
  );
}

function ProyectoDetalle({ id, onClose }) {
  const { data: p, loading } = useFetch(id ? `/proyectos/${id}` : null, null, { enabled: !!id });
  const total = p?.consumo.reduce((a, c) => a + Number(c.valor), 0) || 0;
  return (
    <Modal open={!!id} onClose={onClose} size="xl" title={p ? `${p.codigo} · ${p.nombre}` : 'Proyecto'} subtitle={p?.cliente}>
      {loading || !p ? <LoadingBlock /> : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <DetailItem label="Estado"><EstadoBadge estado={p.estado} /></DetailItem>
            <DetailItem label="Responsable">{p.responsable}</DetailItem>
            <DetailItem label="Ubicación">{p.ubicacion}</DetailItem>
            <DetailItem label="Periodo">{fmtDate(p.fecha_inicio)} – {p.fecha_fin ? fmtDate(p.fecha_fin) : 'en curso'}</DetailItem>
            <DetailItem label="Consumo neto"><span className="font-semibold">{fmtMoney(total)}</span></DetailItem>
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Materiales consumidos</h3>
            {p.consumo.length === 0 ? <p className="text-sm text-slate-500">Aún no hay guías despachadas para este proyecto.</p> : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="table-base">
                  <thead><tr><th>SKU</th><th>Producto</th><th className="num">Despachado</th><th className="num">Devuelto</th><th className="num">Consumo neto</th><th className="num">Valor</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {p.consumo.map((c) => (
                      <tr key={c.producto_id}><td className="font-mono text-xs">{c.sku}</td><td>{c.nombre}</td><td className="num">{fmtNum(c.despachado)}</td><td className="num text-violet-700">{Number(c.devuelto) ? fmtNum(c.devuelto) : '—'}</td><td className="num font-medium">{fmtNum(c.consumido)} {c.unidad_medida}</td><td className="num">{fmtMoney(c.valor)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Guías de salida ({p.guias.length})</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="table-base">
                <thead><tr><th>N° salida</th><th>Guía física</th><th>Fecha</th><th>Responsable</th><th className="num">Ítems</th><th className="num">Valor</th><th>Estado</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {p.guias.map((g) => (
                    <tr key={g.id}><td className="font-mono text-xs">{g.numero}</td><td>{g.numero_guia || '—'}</td><td>{fmtDate(g.fecha)}</td><td>{g.responsable}</td><td className="num">{g.items}</td><td className="num">{fmtMoney(g.valor)}</td><td><EstadoBadge estado={g.estado} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Proyectos() {
  const { can } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch('/proyectos', { q: dq, estado });
  const [form, setForm] = useState({ open: false, proyecto: null });
  const [ver, setVer] = useState(null);
  const [borrar, setBorrar] = useState(null);

  async function eliminar() {
    try { const { data: r } = await api.delete(`/proyectos/${borrar.id}`); r.eliminado ? toast.success(r.message) : toast.warning(r.message); setBorrar(null); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <>
      <PageHeader title="Proyectos" subtitle="Obras y proyectos que reciben materiales mediante guías de salida"
        actions={can('SUPERVISOR') && <button className="btn-primary" onClick={() => setForm({ open: true, proyecto: null })}><Plus className="h-4 w-4" /> Nuevo proyecto</button>} />
      <TableCard toolbar={<>
        <SearchInput value={q} onChange={setQ} placeholder="Código, nombre, cliente o responsable" className="lg:w-80" />
        <select className="input lg:w-40" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos</option><option value="ACTIVO">Activos</option><option value="CERRADO">Cerrados</option></select>
      </>}>
        {loading && !data ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : data.length === 0 ? <EmptyState /> : (
          <table className="table-base">
            <thead><tr><th>Código</th><th>Proyecto</th><th>Responsable</th><th>Inicio</th><th className="num">Guías</th><th className="num">Consumo neto</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs font-medium">{p.codigo}</td>
                  <td><p className="font-medium text-slate-900">{p.nombre}</p><p className="text-xs text-slate-500">{p.cliente || '—'}</p></td>
                  <td className="whitespace-nowrap">{p.responsable}</td>
                  <td className="whitespace-nowrap">{fmtDate(p.fecha_inicio)}</td>
                  <td className="num">{p.guias}</td>
                  <td className="num">{fmtMoney(p.valor_consumido)}</td>
                  <td><EstadoBadge estado={p.estado} /></td>
                  <td><div className="flex justify-end gap-1">
                    <button className="btn-ghost btn-sm" onClick={() => setVer(p.id)} title="Ver detalle"><Eye className="h-4 w-4" /></button>
                    {can('SUPERVISOR') && <button className="btn-ghost btn-sm" onClick={() => setForm({ open: true, proyecto: p })} title="Editar"><Pencil className="h-4 w-4" /></button>}
                    {can() && <button className="btn-ghost btn-sm text-red-600" onClick={() => setBorrar(p)} title="Eliminar"><Trash2 className="h-4 w-4" /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
      <ProyectoForm open={form.open} proyecto={form.proyecto} onClose={() => setForm({ open: false, proyecto: null })} onSaved={() => { setForm({ open: false, proyecto: null }); reload(); }} />
      <ProyectoDetalle id={ver} onClose={() => setVer(null)} />
      <ConfirmDialog open={!!borrar} danger title="Eliminar proyecto" confirmText="Eliminar" onConfirm={eliminar} onClose={() => setBorrar(null)}
        message={<>¿Eliminar <b>{borrar?.nombre}</b>? Si tiene guías registradas se marcará como cerrado.</>} />
    </>
  );
}
