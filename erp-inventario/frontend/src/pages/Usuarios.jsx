import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import api, { errorMessage, fieldErrors } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { PageHeader, TableCard, LoadingBlock, ErrorBlock, Badge, Field } from '../components/ui';
import { ROLES, fmtDate } from '../utils/format';
import { enfocarPrimerError } from '../utils/foco';

function UsuarioForm({ open, usuario, roles, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) { setErrors({}); setF(usuario ? { ...usuario, password: '' } : { nombre: '', email: '', password: '', rol_id: roles?.[1]?.id || '', activo: true }); }
  }, [open, usuario, roles]);

  async function submit() {
    const e = {};
    if (!f.nombre?.trim()) e.nombre = 'El nombre es obligatorio';
    if (!/^\S+@\S+\.\S+$/.test(f.email || '')) e.email = 'Correo inválido';
    if (!usuario && (f.password || '').length < 6) e.password = 'Mínimo 6 caracteres';
    if (usuario && f.password && f.password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (!f.rol_id) e.rol_id = 'Seleccione un rol';
    setErrors(e);
    if (Object.keys(e).length) { enfocarPrimerError(); return; }
    setSaving(true);
    const body = { nombre: f.nombre, email: f.email, rol_id: Number(f.rol_id), activo: f.activo, ...(f.password ? { password: f.password } : {}) };
    try {
      if (usuario) await api.put(`/usuarios/${usuario.id}`, body); else await api.post('/usuarios', body);
      toast.success(usuario ? 'Usuario actualizado' : 'Usuario creado');
      onSaved();
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title={usuario ? 'Editar usuario' : 'Nuevo usuario'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></>}>
      <div className="space-y-4">
        <Field label="Nombre" required error={errors.nombre}><input className="input" value={f.nombre || ''} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
        <Field label="Correo" required error={errors.email}><input type="email" className="input" value={f.email || ''} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label={usuario ? 'Nueva contraseña' : 'Contraseña'} required={!usuario} error={errors.password} hint={usuario ? 'Déjela vacía para mantener la actual' : null}>
          <input type="password" className="input" value={f.password || ''} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" />
        </Field>
        <Field label="Rol" required error={errors.rol_id}>
          <select className="input" value={f.rol_id || ''} onChange={(e) => setF({ ...f, rol_id: e.target.value })}>
            <option value="">Seleccione…</option>
            {roles?.map((r) => <option key={r.id} value={r.id}>{ROLES[r.nombre]} — {r.descripcion}</option>)}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded" checked={!!f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Usuario activo</label>
      </div>
    </Modal>
  );
}

export default function Usuarios() {
  const { data, loading, error, reload } = useFetch('/usuarios');
  const { data: roles } = useFetch('/usuarios/roles');
  const [form, setForm] = useState({ open: false, usuario: null });
  const tono = { ADMIN: 'purple', ALMACEN: 'blue', SUPERVISOR: 'amber' };
  return (
    <>
      <PageHeader title="Usuarios y roles" subtitle="Administración de accesos al sistema"
        actions={<button className="btn-primary" onClick={() => setForm({ open: true, usuario: null })}><Plus className="h-4 w-4" /> Nuevo usuario</button>} />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {[['ADMIN', 'Acceso completo: usuarios, productos, catálogos, inventario y reportes.'],
          ['ALMACEN', 'Registra entradas, guías de salida y devoluciones. Consulta inventario y Kardex.'],
          ['SUPERVISOR', 'Consulta inventario y movimientos, aprueba anulaciones y ajustes, gestiona proyectos y reportes.']].map(([r, d]) => (
          <div key={r} className="card p-4"><Badge tone={tono[r]}>{ROLES[r]}</Badge><p className="mt-2 text-sm text-slate-600">{d}</p></div>
        ))}
      </div>
      <TableCard>
        {loading && !data ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : (
          <table className="table-base">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Creado</th><th></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-slate-900">{u.nombre}</td><td>{u.email}</td>
                  <td><Badge tone={tono[u.rol]}>{ROLES[u.rol]}</Badge></td>
                  <td>{u.activo ? <Badge tone="green">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                  <td>{fmtDate(u.created_at)}</td>
                  <td className="text-right"><button className="btn-ghost btn-sm" onClick={() => setForm({ open: true, usuario: u })} aria-label="Editar"><Pencil className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
      <UsuarioForm open={form.open} usuario={form.usuario} roles={roles} onClose={() => setForm({ open: false, usuario: null })} onSaved={() => { setForm({ open: false, usuario: null }); reload(); }} />
    </>
  );
}
