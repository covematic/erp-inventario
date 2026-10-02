import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { enfocarPrimerError } from '../utils/foco';
import api, { errorMessage, fieldErrors } from '../api/client';
import useFetch, { useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal, { ConfirmDialog } from '../components/Modal';
import { PageHeader, TableCard, SearchInput, LoadingBlock, ErrorBlock, EmptyState, Badge, Field } from '../components/ui';

const CONFIG = {
  categorias: {
    titulo: 'Categorías', singular: 'categoría',
    campos: [{ key: 'nombre', label: 'Nombre', required: true }, { key: 'descripcion', label: 'Descripción' }],
  },
  proveedores: {
    titulo: 'Proveedores', singular: 'proveedor',
    campos: [
      { key: 'ruc', label: 'RUC', required: true, pattern: /^\d{8,20}$/, patternMsg: 'Solo dígitos (8 a 20)' },
      { key: 'razon_social', label: 'Razón social', required: true },
      { key: 'contacto', label: 'Contacto' }, { key: 'telefono', label: 'Teléfono' },
      { key: 'email', label: 'Correo', pattern: /^\S+@\S+\.\S+$/, patternMsg: 'Correo inválido' }, { key: 'direccion', label: 'Dirección' },
    ],
  },
  almacenes: {
    titulo: 'Almacenes', singular: 'almacén',
    campos: [{ key: 'codigo', label: 'Código', required: true }, { key: 'nombre', label: 'Nombre', required: true }, { key: 'ubicacion', label: 'Ubicación' }],
  },
  areas: {
    titulo: 'Áreas', singular: 'área',
    campos: [{ key: 'nombre', label: 'Nombre', required: true }],
  },
};

function CatalogoForm({ tabla, registro, open, onClose, onSaved }) {
  const cfg = CONFIG[tabla];
  const toast = useToast();
  const [f, setF] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    const base = Object.fromEntries(cfg.campos.map((c) => [c.key, registro?.[c.key] ?? '']));
    setF({ ...base, activo: registro ? registro.activo : true });
  }, [open, registro, cfg]);

  async function submit() {
    const e = {};
    for (const c of cfg.campos) {
      const v = String(f[c.key] || '').trim();
      if (c.required && !v) e[c.key] = `${c.label} es obligatorio`;
      else if (v && c.pattern && !c.pattern.test(v)) e[c.key] = c.patternMsg;
    }
    setErrors(e);
    if (Object.keys(e).length) { enfocarPrimerError(); return; }
    setSaving(true);
    try {
      if (registro) await api.put(`/${tabla}/${registro.id}`, f); else await api.post(`/${tabla}`, f);
      toast.success(`${cfg.singular[0].toUpperCase()}${cfg.singular.slice(1)} guardado(a)`);
      onSaved();
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title={`${registro ? 'Editar' : 'Nuevo(a)'} ${cfg.singular}`}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></>}>
      <div className="space-y-4">
        {cfg.campos.map((c) => (
          <Field key={c.key} label={c.label} required={c.required} error={errors[c.key]}>
            <input className={`input ${errors[c.key] ? 'input-error' : ''}`} value={f[c.key] || ''} onChange={(e) => setF({ ...f, [c.key]: e.target.value })} />
          </Field>
        ))}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded" checked={!!f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Activo</label>
      </div>
    </Modal>
  );
}

export default function Catalogos() {
  const { can } = useAuth();
  const toast = useToast();
  const [tabla, setTabla] = useState('categorias');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch(`/${tabla}`, { q: dq });
  const [form, setForm] = useState({ open: false, registro: null });
  const [borrar, setBorrar] = useState(null);
  const cfg = CONFIG[tabla];
  const esAdmin = can();

  async function eliminar() {
    try {
      const { data: r } = await api.delete(`/${tabla}/${borrar.id}`);
      r.eliminado ? toast.success(r.message) : toast.warning(r.message);
      setBorrar(null); reload();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  return (
    <>
      <PageHeader title="Catálogos" subtitle="Datos maestros usados por productos y movimientos"
        actions={esAdmin && <button className="btn-primary" onClick={() => setForm({ open: true, registro: null })}><Plus className="h-4 w-4" /> Nuevo(a) {cfg.singular}</button>} />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {Object.entries(CONFIG).map(([k, c]) => (
          <button key={k} onClick={() => { setTabla(k); setQ(''); }}
            className={`min-h-[44px] whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tabla === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {c.titulo}
          </button>
        ))}
      </div>
      <TableCard toolbar={<SearchInput value={q} onChange={setQ} className="lg:w-80" />}>
        {loading && !data ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : data.length === 0 ? (q
          ? <EmptyState title="Sin coincidencias" text="Pruebe con otra búsqueda." />
          : <EmptyState title={`Aún no hay ${cfg.titulo.toLowerCase()}`} text="Puede crearlos aquí o directamente desde los formularios de productos y entradas con «+ Nuevo»."
              action={esAdmin && <button className="btn-primary" onClick={() => setForm({ open: true, registro: null })}><Plus aria-hidden="true" className="h-4 w-4" /> Nuevo(a) {cfg.singular}</button>} />) : (
          <table className="table-base">
            <thead><tr>{cfg.campos.map((c) => <th key={c.key}>{c.label}</th>)}<th>Estado</th>{esAdmin && <th></th>}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r) => (
                <tr key={r.id} className={r.activo ? '' : 'opacity-60'}>
                  {cfg.campos.map((c, i) => <td key={c.key} className={i === 0 ? 'font-medium text-slate-900' : ''}>{r[c.key] || '—'}</td>)}
                  <td>{r.activo ? <Badge tone="green">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                  {esAdmin && <td><div className="flex justify-end gap-1">
                    <button className="btn-ghost btn-sm" onClick={() => setForm({ open: true, registro: r })} aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                    <button className="btn-ghost btn-sm text-red-600" onClick={() => setBorrar(r)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
      <CatalogoForm tabla={tabla} registro={form.registro} open={form.open} onClose={() => setForm({ open: false, registro: null })} onSaved={() => { setForm({ open: false, registro: null }); reload(); }} />
      <ConfirmDialog open={!!borrar} danger title={`Eliminar ${cfg.singular}`} confirmText="Eliminar" onConfirm={eliminar} onClose={() => setBorrar(null)}
        message="Si el registro está en uso se desactivará en lugar de eliminarse, para mantener la integridad de los datos." />
    </>
  );
}
