import { useState } from 'react';
import { Plus } from 'lucide-react';
import { enfocarPrimerError } from '../utils/foco';
import api, { errorMessage, fieldErrors } from '../api/client';
import { useToast } from '../context/ToastContext';

/**
 * Mini formulario para crear una categoría o un proveedor sin salir del producto.
 * campos: [{ key, label, placeholder, validar(v) → mensaje|null }]
 */
export function CreacionRapida({ titulo, encabezado, aviso, campos, endpoint, fijos = {}, onCreado, onCancelar }) {
  const toast = useToast();
  const [v, setV] = useState(() => Object.fromEntries(campos.map((c) => [c.key, ''])));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function guardar() {
    const e = {};
    for (const c of campos) {
      const msg = c.validar?.(v[c.key].trim());
      if (msg) e[c.key] = msg;
    }
    setErrors(e);
    if (Object.keys(e).length) { enfocarPrimerError(); return; }
    setSaving(true);
    try {
      const body = { ...fijos, ...Object.fromEntries(campos.map((c) => [c.key, v[c.key].trim()])) };
      const { data } = await api.post(endpoint, body);
      toast.success(aviso || `${titulo} creado(a)`);
      onCreado(data);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-brand-200 bg-brand-50/50 p-3">
      <p className="text-sm font-semibold text-brand-700">{encabezado || `Nueva ${titulo.toLowerCase()}`}</p>
      {campos.map((c, i) => (
        <div key={c.key}>
          <input
            autoFocus={i === 0}
            className={`input ${errors[c.key] ? 'input-error' : ''}`}
            aria-label={c.placeholder}
            aria-invalid={errors[c.key] ? true : undefined}
            placeholder={c.placeholder}
            value={v[c.key]}
            onChange={(e) => setV({ ...v, [c.key]: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardar(); } }}
          />
          {errors[c.key] && <p role="alert" className="mt-1 text-xs text-red-700">{errors[c.key]}</p>}
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="btn-primary btn-sm" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Crear y usar'}</button>
      </div>
    </div>
  );
}

export const CAMPOS_CATEGORIA = [
  { key: 'nombre', placeholder: 'Nombre de la categoría (ej. Herramientas)', validar: (x) => (!x ? 'Escriba el nombre' : null) },
];
export const CAMPOS_PROVEEDOR = [
  { key: 'razon_social', placeholder: 'Razón social', validar: (x) => (!x ? 'Escriba la razón social' : null) },
  { key: 'ruc', placeholder: 'RUC (solo números)', validar: (x) => (!/^\d{8,20}$/.test(x) ? 'El RUC debe tener solo dígitos (8 a 20)' : null) },
];

export function EtiquetaConAccion({ label, required, accion, onAccion }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <span className="text-sm font-medium text-slate-700">{label} {required && <span className="text-red-600">*</span>}</span>
      {accion && <button type="button" onClick={onAccion} className="tap -my-3 -mr-2 inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-brand-700 hover:text-brand-800"><Plus className="h-3.5 w-3.5" /> {accion}</button>}
    </div>
  );
}

