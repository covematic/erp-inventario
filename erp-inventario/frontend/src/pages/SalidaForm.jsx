import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Truck, Clock, AlertTriangle, FolderKanban, Building2 } from 'lucide-react';
import api, { errorMessage, fieldErrors } from '../api/client';
import useFetch from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import ProductSelect from '../components/ProductSelect';
import CantidadInput from '../components/CantidadInput';
import { ConfirmDialog } from '../components/Modal';
import { PageHeader, Field, LoadingBlock } from '../components/ui';
import { CampoLista, SinOpciones } from '../components/ListaObligatoria';
import { fmtNum, hoy, MOTIVOS_SALIDA } from '../utils/format';
import { enfocarPrimerError } from '../utils/foco';

let lineId = 1;
const nuevaLinea = () => ({ key: lineId++, producto_id: null, cantidad: '' });

export default function SalidaForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: almacenes, setData: setAlmacenes } = useFetch('/almacenes', { activo: 'true' });
  const { data: proyectos, setData: setProyectos } = useFetch('/proyectos', { estado: 'ACTIVO' });
  const { data: areas, setData: setAreas } = useFetch('/areas', { activo: 'true' });
  const { data: productos } = useFetch('/productos', { activo: 'true', limit: 1000 });

  const [f, setF] = useState({
    fecha: hoy(), numero_guia: '', almacen_id: '', tipo_destino: 'PROYECTO', proyecto_id: '', area_id: '',
    motivo: 'PROYECTO', responsable: '', requiere_devolucion: false, fecha_retorno_estimada: '', observaciones: '',
  });
  const [lineas, setLineas] = useState([nuevaLinea()]);
  const [errors, setErrors] = useState({});
  const [faltantes, setFaltantes] = useState({});
  const [confirm, setConfirm] = useState(null); // 'despachar' | 'pendiente'
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (almacenes?.length && !f.almacen_id) {
      let ultimo = null;
      try { ultimo = localStorage.getItem('erp_ultimo_almacen'); } catch { /* sin almacenamiento */ }
      const existe = almacenes.find((a) => String(a.id) === ultimo);
      setF((x) => ({ ...x, almacen_id: existe ? ultimo : String(almacenes[0].id) }));
    }
  }, [almacenes, f.almacen_id]);

  // Stock disponible en el almacén seleccionado
  const { data: stockAlm } = useFetch('/inventario/stock', { almacen_id: f.almacen_id }, { enabled: !!f.almacen_id });
  const dispPorProducto = useMemo(() => Object.fromEntries((stockAlm || []).map((s) => [s.producto_id, Number(s.disponible)])), [stockAlm]);
  const listaProductos = useMemo(
    () => (productos?.data || []).map((p) => ({ ...p, stock_disponible: dispPorProducto[p.id] ?? 0 })),
    [productos, dispPorProducto]
  );

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setDestino = (tipo) => setF((x) => ({
    ...x, tipo_destino: tipo,
    motivo: tipo === 'PROYECTO' ? 'PROYECTO' : (x.motivo === 'PROYECTO' ? 'CONSUMO_INTERNO' : x.motivo),
  }));
  const setLinea = (key, cambios) => {
    setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
    setFaltantes({});
  };

  function onProyecto(e) {
    const id = e.target.value;
    const p = proyectos?.find((x) => String(x.id) === id);
    setF((x) => ({ ...x, proyecto_id: id, responsable: x.responsable || p?.responsable || '' }));
  }

  function validar() {
    const e = {};
    if (!f.fecha) e.fecha = 'La fecha es obligatoria';
    if (!f.almacen_id) e.almacen_id = 'Seleccione el almacén';
    if (f.tipo_destino === 'PROYECTO' && !f.proyecto_id) e.proyecto_id = 'Seleccione el proyecto';
    if (f.tipo_destino === 'AREA' && !f.area_id) e.area_id = 'Seleccione el área solicitante';
    if (!f.responsable.trim()) e.responsable = 'Indique quién recibe los productos';
    if (f.requiere_devolucion && f.fecha_retorno_estimada && f.fecha_retorno_estimada < f.fecha) e.fecha_retorno_estimada = 'No puede ser anterior a la fecha de la guía';
    const validas = lineas.filter((l) => l.producto_id || l.cantidad !== '');
    if (!validas.length) e.items = 'Agregue al menos un producto';
    validas.forEach((l, i) => {
      if (!l.producto_id) e[`linea_${l.key}_producto`] = 'Seleccione el producto';
      if (!(Number(l.cantidad) > 0)) e[`linea_${l.key}_cantidad`] = 'Cantidad mayor a 0';
      else if (l.producto_id && Number(l.cantidad) > (dispPorProducto[l.producto_id] ?? 0)) {
        e[`linea_${l.key}_cantidad`] = `Excede el disponible (${fmtNum(dispPorProducto[l.producto_id] ?? 0)})`;
        e.stock = true;
      }
      if (i >= 0 && l.producto_id && validas.filter((x) => x.producto_id === l.producto_id).length > 1) e[`linea_${l.key}_producto`] = 'Producto repetido';
    });
    return e;
  }

  function pedirConfirmacion(tipo) {
    const e = validar();
    setErrors(e);
    if (Object.keys(e).length) {
      enfocarPrimerError();
      toast.error(e.stock ? 'Hay productos con cantidad mayor al stock disponible. No se puede registrar la salida.' : 'Revise los campos marcados');
      return;
    }
    setConfirm(tipo);
  }

  async function guardar() {
    setSaving(true);
    const body = {
      ...f,
      almacen_id: Number(f.almacen_id),
      proyecto_id: f.tipo_destino === 'PROYECTO' ? Number(f.proyecto_id) : null,
      area_id: f.tipo_destino === 'AREA' ? Number(f.area_id) : null,
      fecha_retorno_estimada: f.requiere_devolucion ? f.fecha_retorno_estimada || null : null,
      despachar: confirm === 'despachar',
      items: lineas.filter((l) => l.producto_id).map((l) => ({ producto_id: l.producto_id, cantidad: Number(l.cantidad) })),
    };
    try {
      const { data } = await api.post('/salidas', body);
      try { localStorage.setItem('erp_ultimo_almacen', String(body.almacen_id)); } catch { /* sin almacenamiento */ }
      toast.success(data.message);
      navigate('/salidas', { state: { abrir: data.id } });
    } catch (err) {
      const det = err.response?.data?.details;
      if (err.response?.status === 409 && Array.isArray(det)) {
        setFaltantes(Object.fromEntries(det.map((d) => [d.producto_id, d.disponible])));
      }
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
      setConfirm(null);
    } finally {
      setSaving(false);
    }
  }

  if (!almacenes || !productos) return <LoadingBlock />;
  const usados = lineas.map((l) => l.producto_id).filter(Boolean);
  const totalUnidades = lineas.reduce((a, l) => a + (Number(l.cantidad) || 0), 0);
  const destino = f.tipo_destino === 'PROYECTO'
    ? proyectos?.find((p) => String(p.id) === f.proyecto_id)?.nombre
    : areas?.find((a) => String(a.id) === f.area_id)?.nombre;

  return (
    <>
      <PageHeader
        title="Nueva guía de salida"
        subtitle="Registre los productos requeridos del almacén para un proyecto o un área"
        actions={<button className="btn-secondary" onClick={() => navigate('/salidas')}><ArrowLeft className="h-4 w-4" /> Volver</button>}
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="card space-y-4 p-5 xl:col-span-1">
          <h2 className="font-semibold text-slate-900">Datos de la guía</h2>
          <div>
            <span className="label">Destino <span className="text-red-600">*</span></span>
            <div className="grid grid-cols-2 gap-2">
              {[['PROYECTO', 'Proyecto', FolderKanban], ['AREA', 'Área interna', Building2]].map(([v, l, Icon]) => (
                <button key={v} type="button" onClick={() => setDestino(v)}
                  className={`tap flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${f.tipo_destino === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  <Icon className="h-4 w-4" /> {l}
                </button>
              ))}
            </div>
          </div>
          {f.tipo_destino === 'PROYECTO' ? (
            <CampoLista tipo="proyecto" opciones={proyectos} label="Proyecto" error={errors.proyecto_id}
              onCreado={(p) => { setProyectos((l) => [...(l || []), p]); setF((x) => ({ ...x, proyecto_id: String(p.id), responsable: x.responsable || p.responsable || '' })); }}>
              <select className={`input ${errors.proyecto_id ? 'input-error' : ''}`} value={f.proyecto_id} onChange={onProyecto}>
                <option value="">Seleccione…</option>
                {proyectos?.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
              </select>
            </CampoLista>
          ) : (
            <CampoLista tipo="area" opciones={areas} label="Área solicitante" error={errors.area_id}
              onCreado={(a) => { setAreas((l) => [...(l || []), a]); setF((x) => ({ ...x, area_id: String(a.id) })); }}>
              <select className={`input ${errors.area_id ? 'input-error' : ''}`} value={f.area_id} onChange={set('area_id')}>
                <option value="">Seleccione…</option>
                {areas?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </CampoLista>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" required error={errors.fecha}>
              <input type="date" className="input" value={f.fecha} onChange={set('fecha')} max={hoy()} />
            </Field>
            <Field label="N° guía física" hint="Opcional">
              <input className="input" value={f.numero_guia} onChange={set('numero_guia')} placeholder="GR-001" />
            </Field>
          </div>
          <div className={`grid gap-3 ${almacenes.length ? 'grid-cols-2' : ''}`}>
            <CampoLista tipo="almacen" opciones={almacenes} label="Almacén" error={errors.almacen_id}
              onCreado={(a) => { setAlmacenes((l) => [...(l || []), a]); setF((x) => ({ ...x, almacen_id: String(a.id) })); }}>
              <select className="input" value={f.almacen_id} onChange={(e) => { set('almacen_id')(e); setFaltantes({}); }}>
                {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </CampoLista>
            <Field label="Motivo" required>
              <select className="input" value={f.motivo} onChange={set('motivo')}>
                {Object.entries(MOTIVOS_SALIDA).filter(([k]) => f.tipo_destino === 'PROYECTO' || k !== 'PROYECTO').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Responsable que recibe" required error={errors.responsable}>
            <input className={`input ${errors.responsable ? 'input-error' : ''}`} value={f.responsable} onChange={set('responsable')} />
          </Field>
          <div className="rounded-md border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={f.requiere_devolucion} onChange={set('requiere_devolucion')} />
              Requiere devolución (herramientas o préstamo)
            </label>
            {f.requiere_devolucion && (
              <Field label="Fecha de retorno estimada" error={errors.fecha_retorno_estimada} className="mt-3" hint="Se alertará si vence sin devolución">
                <input type="date" className="input" value={f.fecha_retorno_estimada} min={f.fecha} onChange={set('fecha_retorno_estimada')} />
              </Field>
            )}
          </div>
          <Field label="Observaciones">
            <textarea className="input" rows={2} value={f.observaciones} onChange={set('observaciones')} />
          </Field>
        </div>

        <div className="card flex flex-col xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <div>
              <h2 className="font-semibold text-slate-900">Productos requeridos</h2>
              <p className="text-xs text-slate-500">El stock mostrado corresponde al almacén seleccionado</p>
            </div>
            <button className="btn-secondary btn-sm shrink-0" onClick={() => setLineas((l) => [...l, nuevaLinea()])}><Plus aria-hidden="true" className="h-4 w-4" /> Agregar producto</button>
          </div>
          {errors.items && <p className="mx-5 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.items}</p>}
          {listaProductos.length === 0 ? (
            <div className="p-5"><SinOpciones tipo="producto" mensaje="Aún no hay productos registrados, por eso no hay nada que despachar." /></div>
          ) : stockAlm && !stockAlm.some((s) => Number(s.disponible) > 0) && (
            <div className="mx-5 mt-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-700" />
              <span className="flex-1">Este almacén no tiene stock disponible. Registre una entrada o elija otro almacén antes de despachar.</span>
              <Link to="/entradas" state={{ nuevo: true }} className="btn-secondary btn-sm">Registrar entrada</Link>
            </div>
          )}
          <div className={`flex-1 space-y-3 p-5 ${listaProductos.length === 0 ? 'hidden' : ''}`}>
            {lineas.map((l, i) => {
              const disp = l.producto_id ? (dispPorProducto[l.producto_id] ?? 0) : null;
              const prod = listaProductos.find((p) => p.id === l.producto_id);
              const excede = l.producto_id && Number(l.cantidad) > disp;
              const falta = faltantes[l.producto_id] !== undefined;
              return (
                <div key={l.key} className={`grid grid-cols-12 items-start gap-3 rounded-md border p-3 ${excede || falta ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
                  <span className="col-span-12 text-xs font-medium text-slate-500 sm:col-span-1 sm:pt-2.5">#{i + 1}</span>
                  <div className="col-span-12 sm:col-span-6">
                    <ProductSelect products={listaProductos} value={l.producto_id} excludeIds={usados} showStock
                      error={errors[`linea_${l.key}_producto`]} onChange={(p) => setLinea(l.key, { producto_id: p.id })} />
                    {errors[`linea_${l.key}_producto`] && <p className="mt-1 text-xs text-red-600">{errors[`linea_${l.key}_producto`]}</p>}
                  </div>
                  <div className="col-span-7 sm:col-span-3">
                    <CantidadInput
                      value={l.cantidad}
                      unidad={prod?.unidad_medida}
                      max={disp ?? undefined}
                      etiqueta={prod ? `Cantidad de ${prod.nombre}` : 'Cantidad requerida'}
                      invalido={!!errors[`linea_${l.key}_cantidad`] || excede}
                      onChange={(v) => setLinea(l.key, { cantidad: v })}
                    />
                    {disp !== null && (
                      <p className={`mt-1 text-xs ${excede ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                        {excede && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                        Disponible: {fmtNum(disp)} {prod?.unidad_medida}
                      </p>
                    )}
                  </div>
                  <div className="col-span-5 flex justify-end sm:col-span-2">
                    <button className="btn-ghost text-red-600 hover:bg-red-50" disabled={lineas.length === 1} onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Quitar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-b-md">
            <p className="text-sm text-slate-600">{usados.length} producto(s) · {fmtNum(totalUnidades)} unidades</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => pedirConfirmacion('pendiente')} disabled={saving}>
                <Clock className="h-4 w-4" /> Guardar pendiente
              </button>
              <button className="btn-primary" onClick={() => pedirConfirmacion('despachar')} disabled={saving}>
                <Truck className="h-4 w-4" /> Registrar y despachar
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'despachar' ? 'Confirmar despacho' : 'Guardar guía pendiente'}
        confirmText={confirm === 'despachar' ? 'Despachar' : 'Guardar y reservar'}
        loading={saving}
        onConfirm={guardar}
        onClose={() => setConfirm(null)}
        message={
          <div className="space-y-2">
            <p>Destino: <b>{destino}</b> · {usados.length} producto(s), {fmtNum(totalUnidades)} unidades.</p>
            {confirm === 'despachar'
              ? <p>El stock se descontará ahora y la guía quedará registrada en el Kardex. Una guía despachada no puede editarse; solo anularse o recibir devoluciones.</p>
              : <p>Las cantidades quedarán <b>reservadas</b> (stock comprometido) hasta que se despache o se anule la guía.</p>}
          </div>
        }
      />
    </>
  );
}
