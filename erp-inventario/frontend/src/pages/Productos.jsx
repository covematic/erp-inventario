import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Power, BookOpen } from 'lucide-react';
import api, { errorMessage, fieldErrors } from '../api/client';
import useFetch, { useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal, { ConfirmDialog } from '../components/Modal';
import { PageHeader, TableCard, SearchInput, LoadingBlock, ErrorBlock, EmptyState, Pagination, StockBadge, Badge, Field } from '../components/ui';
import { fmtNum, fmtMoney } from '../utils/format';

const VACIO = {
  sku: '', nombre: '', descripcion: '', categoria_id: '', proveedor_id: '', unidad_medida: 'UND',
  precio_compra: '', precio_venta: '', stock_minimo: '', activo: true,
};
const UNIDADES = ['UND', 'PAR', 'CAJA', 'ROLLO', 'GLN', 'KG', 'M', 'M2', 'LT', 'PQT', 'JGO'];

function validar(f) {
  const e = {};
  if (!f.sku.trim()) e.sku = 'El código/SKU es obligatorio';
  else if (!/^[A-Za-z0-9._-]+$/.test(f.sku.trim())) e.sku = 'Solo letras, números, punto, guion y guion bajo';
  if (!f.nombre.trim()) e.nombre = 'El nombre es obligatorio';
  if (!f.categoria_id) e.categoria_id = 'Seleccione una categoría';
  if (!f.unidad_medida) e.unidad_medida = 'Seleccione la unidad';
  for (const [k, label] of [['precio_compra', 'El precio de compra'], ['precio_venta', 'El precio de venta'], ['stock_minimo', 'El stock mínimo']]) {
    if (f[k] === '' || f[k] === null) e[k] = `${label} es obligatorio`;
    else if (Number.isNaN(Number(f[k])) || Number(f[k]) < 0) e[k] = `${label} debe ser un número mayor o igual a 0`;
  }
  return e;
}

function ProductoForm({ open, producto, categorias, proveedores, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(VACIO);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(producto ? {
      ...VACIO, ...producto,
      descripcion: producto.descripcion || '', proveedor_id: producto.proveedor_id || '',
    } : VACIO);
  }, [open, producto]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = validar(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const body = {
      sku: f.sku.trim(), nombre: f.nombre.trim(), descripcion: f.descripcion, categoria_id: Number(f.categoria_id),
      proveedor_id: f.proveedor_id ? Number(f.proveedor_id) : null, unidad_medida: f.unidad_medida,
      precio_compra: Number(f.precio_compra), precio_venta: Number(f.precio_venta), stock_minimo: Number(f.stock_minimo), activo: f.activo,
    };
    try {
      if (producto) await api.put(`/productos/${producto.id}`, body);
      else await api.post('/productos', body);
      toast.success(producto ? 'Producto actualizado' : 'Producto registrado');
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const margen = Number(f.precio_venta) > 0 && Number(f.precio_compra) > 0
    ? ((Number(f.precio_venta) - Number(f.precio_compra)) / Number(f.precio_venta)) * 100 : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={producto ? 'Editar producto' : 'Nuevo producto'}
      subtitle={producto ? `${producto.sku} · el stock se modifica solo con movimientos` : 'El stock inicial se registra con una entrada'}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </>}
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Código / SKU" required error={errors.sku}>
          <input className={`input uppercase ${errors.sku ? 'input-error' : ''}`} value={f.sku} onChange={set('sku')} placeholder="ELE-CAB-12" />
        </Field>
        <Field label="Unidad de medida" required error={errors.unidad_medida}>
          <select className="input" value={f.unidad_medida} onChange={set('unidad_medida')}>
            {UNIDADES.map((u) => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Nombre" required error={errors.nombre} className="sm:col-span-2">
          <input className={`input ${errors.nombre ? 'input-error' : ''}`} value={f.nombre} onChange={set('nombre')} />
        </Field>
        <Field label="Descripción" className="sm:col-span-2">
          <textarea className="input" rows={2} value={f.descripcion} onChange={set('descripcion')} />
        </Field>
        <Field label="Categoría" required error={errors.categoria_id}>
          <select className={`input ${errors.categoria_id ? 'input-error' : ''}`} value={f.categoria_id} onChange={set('categoria_id')}>
            <option value="">Seleccione…</option>
            {categorias.filter((c) => c.activo || c.id === Number(f.categoria_id)).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Proveedor">
          <select className="input" value={f.proveedor_id} onChange={set('proveedor_id')}>
            <option value="">Sin proveedor</option>
            {proveedores.filter((p) => p.activo || p.id === Number(f.proveedor_id)).map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
          </select>
        </Field>
        <Field label="Precio de compra (S/)" required error={errors.precio_compra}>
          <input type="number" min="0" step="0.01" className={`input ${errors.precio_compra ? 'input-error' : ''}`} value={f.precio_compra} onChange={set('precio_compra')} />
        </Field>
        <Field label="Precio de venta (S/)" required error={errors.precio_venta} hint={margen !== null ? `Margen ${margen.toFixed(1)}%` : null}>
          <input type="number" min="0" step="0.01" className={`input ${errors.precio_venta ? 'input-error' : ''}`} value={f.precio_venta} onChange={set('precio_venta')} />
        </Field>
        <Field label="Stock mínimo" required error={errors.stock_minimo} hint="Se genera una alerta al llegar a este nivel">
          <input type="number" min="0" step="1" className={`input ${errors.stock_minimo ? 'input-error' : ''}`} value={f.stock_minimo} onChange={set('stock_minimo')} />
        </Field>
        <Field label="Estado">
          <label className="flex h-[38px] items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={f.activo} onChange={set('activo')} /> Producto activo
          </label>
        </Field>
      </form>
    </Modal>
  );
}

export default function Productos() {
  const { can } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estadoStock, setEstadoStock] = useState(params.get('estado_stock') || '');
  const [activo, setActivo] = useState('true');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch('/productos', { q: dq, categoria_id: categoria, estado_stock: estadoStock, activo, page, limit: 15 });
  const { data: categorias } = useFetch('/categorias');
  const { data: proveedores } = useFetch('/proveedores');
  const [form, setForm] = useState({ open: false, producto: null });
  const [borrar, setBorrar] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(1), [dq, categoria, estadoStock, activo]);
  const esAdmin = can();

  async function toggle(p) {
    try {
      await api.patch(`/productos/${p.id}/estado`, { activo: !p.activo });
      toast.success(p.activo ? 'Producto desactivado' : 'Producto activado');
      reload();
    } catch (err) { toast.error(errorMessage(err)); }
  }

  async function eliminar() {
    setBusy(true);
    try {
      const { data: r } = await api.delete(`/productos/${borrar.id}`);
      r.eliminado ? toast.success(r.message) : toast.warning(r.message);
      setBorrar(null);
      reload();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Catálogo de productos y su stock actual"
        actions={esAdmin && <button className="btn-primary" onClick={() => setForm({ open: true, producto: null })}><Plus className="h-4 w-4" /> Nuevo producto</button>}
      />
      <TableCard
        toolbar={<>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar por SKU, nombre o descripción" className="lg:w-80" />
          <select className="input lg:w-52" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className="input lg:w-44" value={estadoStock} onChange={(e) => setEstadoStock(e.target.value)}>
            <option value="">Todo el stock</option>
            <option value="NORMAL">Stock normal</option>
            <option value="BAJO">Stock bajo</option>
            <option value="AGOTADO">Agotados</option>
          </select>
          <select className="input lg:w-36" value={activo} onChange={(e) => setActivo(e.target.value)}>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
            <option value="">Todos</option>
          </select>
        </>}
        footer={data && <Pagination page={page} limit={data.limit} total={data.total} onPage={setPage} />}
      >
        {loading && !data ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : data.data.length === 0 ? (
          <EmptyState text="Ajuste los filtros o registre un producto nuevo." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>SKU</th><th>Producto</th><th>Categoría</th><th className="num">Disponible</th><th className="num">Mínimo</th>
                <th>Stock</th><th className="num">P. compra</th><th className="num">P. venta</th><th>Estado</th><th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.data.map((p) => (
                <tr key={p.id} className={p.activo ? '' : 'opacity-60'}>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>
                    <p className="font-medium text-slate-900">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.proveedor_nombre || 'Sin proveedor'} · {p.unidad_medida}</p>
                  </td>
                  <td className="whitespace-nowrap">{p.categoria_nombre}</td>
                  <td className={`num font-semibold ${p.estado_stock === 'AGOTADO' ? 'text-red-600' : p.estado_stock === 'BAJO' ? 'text-amber-700' : 'text-slate-900'}`}>
                    {fmtNum(p.stock_disponible)}
                    {(Number(p.stock_danado) + Number(p.stock_defectuoso) > 0) && (
                      <span className="block text-[11px] font-normal text-slate-500">+{fmtNum(Number(p.stock_danado) + Number(p.stock_defectuoso))} no aptas</span>
                    )}
                  </td>
                  <td className="num text-slate-500">{fmtNum(p.stock_minimo)}</td>
                  <td><StockBadge estado={p.estado_stock} /></td>
                  <td className="num">{fmtMoney(p.precio_compra)}</td>
                  <td className="num">{fmtMoney(p.precio_venta)}</td>
                  <td>{p.activo ? <Badge tone="green">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Link to={`/kardex/${p.id}`} className="btn-ghost btn-sm" title="Ver Kardex"><BookOpen className="h-4 w-4" /></Link>
                      {esAdmin && <>
                        <button className="btn-ghost btn-sm" title="Editar" onClick={() => setForm({ open: true, producto: p })}><Pencil className="h-4 w-4" /></button>
                        <button className="btn-ghost btn-sm" title={p.activo ? 'Desactivar' : 'Activar'} onClick={() => toggle(p)}><Power className="h-4 w-4" /></button>
                        <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50" title="Eliminar" onClick={() => setBorrar(p)}><Trash2 className="h-4 w-4" /></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      <ProductoForm
        open={form.open}
        producto={form.producto}
        categorias={categorias || []}
        proveedores={proveedores || []}
        onClose={() => setForm({ open: false, producto: null })}
        onSaved={() => { setForm({ open: false, producto: null }); reload(); }}
      />
      <ConfirmDialog
        open={!!borrar}
        danger
        title="Eliminar producto"
        message={<>¿Eliminar <b>{borrar?.nombre}</b>? Si tiene movimientos registrados se desactivará en lugar de eliminarse, para conservar su Kardex.</>}
        confirmText="Eliminar"
        loading={busy}
        onConfirm={eliminar}
        onClose={() => setBorrar(null)}
      />
    </>
  );
}
