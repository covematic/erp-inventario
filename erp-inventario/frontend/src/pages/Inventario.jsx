import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, BookOpen } from 'lucide-react';
import api, { errorMessage, fieldErrors } from '../api/client';
import useFetch, { useDebounce } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ProductSelect from '../components/ProductSelect';
import { PageHeader, TableCard, SearchInput, LoadingBlock, ErrorBlock, EmptyState, StockBadge, Field, StatCard } from '../components/ui';
import { fmtNum, fmtMoney, hoy, TIPO_AJUSTE } from '../utils/format';

function AjusteForm({ open, onClose, onSaved, almacenes, productos }) {
  const toast = useToast();
  const [f, setF] = useState({ fecha: hoy(), producto_id: null, almacen_id: '', tipo: 'INCREMENTO', cantidad: '', motivo: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const almacenId = f.almacen_id || almacenes?.[0]?.id;
  const { data: stockSel } = useFetch('/inventario/stock', { almacen_id: almacenId }, { enabled: open && !!almacenId });
  const actual = stockSel?.find((s) => s.producto_id === f.producto_id);
  const campo = { INCREMENTO: 'disponible', DISMINUCION: 'disponible', BAJA_DANADO: 'danado', BAJA_DEFECTUOSO: 'defectuoso' }[f.tipo];

  async function submit() {
    const e = {};
    if (!f.producto_id) e.producto_id = 'Seleccione el producto';
    if (!(Number(f.cantidad) > 0)) e.cantidad = 'La cantidad debe ser mayor a 0';
    else if (f.tipo !== 'INCREMENTO' && actual && Number(f.cantidad) > Number(actual[campo])) e.cantidad = `No puede superar el stock ${campo} (${fmtNum(actual[campo])})`;
    if (!f.motivo.trim()) e.motivo = 'El motivo es obligatorio';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const { data } = await api.post('/inventario/ajustes', { ...f, almacen_id: Number(almacenId), cantidad: Number(f.cantidad) });
      toast.success(data.message);
      setF({ fecha: hoy(), producto_id: null, almacen_id: '', tipo: 'INCREMENTO', cantidad: '', motivo: '' });
      onSaved();
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajuste de inventario" subtitle="Corrección aprobada por supervisor; queda registrada en el Kardex"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Guardando…' : 'Registrar ajuste'}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Producto" required error={errors.producto_id} className="sm:col-span-2">
          <ProductSelect products={productos} value={f.producto_id} onChange={(p) => setF({ ...f, producto_id: p.id })} error={errors.producto_id} />
        </Field>
        <Field label="Almacén" required>
          <select className="input" value={almacenId || ''} onChange={(e) => setF({ ...f, almacen_id: e.target.value })}>
            {almacenes?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
        <Field label="Fecha" required><input type="date" className="input" value={f.fecha} max={hoy()} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Field>
        <Field label="Tipo de ajuste" required>
          <select className="input" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {Object.entries(TIPO_AJUSTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Cantidad" required error={errors.cantidad} hint={actual ? `Stock ${campo} actual: ${fmtNum(actual[campo])}` : null}>
          <input type="number" min="0" step="any" className={`input ${errors.cantidad ? 'input-error' : ''}`} value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} />
        </Field>
        <Field label="Motivo" required error={errors.motivo} className="sm:col-span-2">
          <textarea className={`input ${errors.motivo ? 'input-error' : ''}`} rows={2} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ej. diferencia en conteo físico, baja por deterioro" />
        </Field>
      </div>
    </Modal>
  );
}

export default function Inventario() {
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [almacen, setAlmacen] = useState('');
  const [estado, setEstado] = useState('');
  const [ajuste, setAjuste] = useState(false);
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch('/inventario/stock', { q: dq, categoria_id: categoria, almacen_id: almacen, estado });
  const { data: categorias } = useFetch('/categorias');
  const { data: almacenes } = useFetch('/almacenes', { activo: 'true' });
  const { data: productos } = useFetch('/productos', { activo: 'true', limit: 1000 });

  const tot = useMemo(() => (data || []).reduce((a, r) => ({
    disponible: a.disponible + Number(r.disponible), comprometido: a.comprometido + Number(r.comprometido),
    noApto: a.noApto + Number(r.danado) + Number(r.defectuoso), valor: a.valor + Number(r.valor),
  }), { disponible: 0, comprometido: 0, noApto: 0, valor: 0 }), [data]);

  return (
    <>
      <PageHeader title="Control de inventario" subtitle="Existencias por almacén: disponible, comprometido y no apto"
        actions={can('SUPERVISOR') && <button className="btn-secondary" onClick={() => setAjuste(true)}><SlidersHorizontal className="h-4 w-4" /> Ajuste</button>} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Disponible" value={fmtNum(tot.disponible)} hint="unidades despachables" />
        <StatCard label="Comprometido" value={fmtNum(tot.comprometido)} hint="reservado en guías pendientes" />
        <StatCard label="Dañado / defectuoso" value={fmtNum(tot.noApto)} hint="fuera del disponible" />
        <StatCard label="Valor (filtro actual)" value={fmtMoney(tot.valor)} hint="disponible + comprometido" />
      </div>

      <TableCard toolbar={<>
        <SearchInput value={q} onChange={setQ} placeholder="SKU o nombre" className="lg:w-64" />
        <select className="input lg:w-52" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>{categorias?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="input lg:w-48" value={almacen} onChange={(e) => setAlmacen(e.target.value)}>
          <option value="">Todos los almacenes</option>{almacenes?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <select className="input lg:w-52" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos</option><option value="BAJO">Stock bajo</option><option value="AGOTADO">Agotados</option>
          <option value="COMPROMETIDO">Con stock comprometido</option><option value="NO_APTO">Con dañados/defectuosos</option>
        </select>
      </>}>
        {loading && !data ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : data.length === 0 ? <EmptyState /> : (
          <table className="table-base">
            <thead><tr>
              <th>Producto</th><th>Almacén</th><th className="num">Stock actual</th><th className="num">Disponible</th><th className="num">Comprometido</th>
              <th className="num">Mínimo</th><th className="num">Dañado</th><th className="num">Defectuoso</th><th className="num">Valor</th><th>Estado</th><th></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r) => (
                <tr key={`${r.producto_id}-${r.almacen_id}`}>
                  <td><p className="font-medium text-slate-900">{r.nombre}</p><p className="text-xs text-slate-500">{r.sku} · {r.categoria_nombre}</p></td>
                  <td className="whitespace-nowrap text-slate-600">{r.almacen_nombre}</td>
                  <td className="num">{fmtNum(r.stock_actual)}</td>
                  <td className={`num font-semibold ${r.estado_stock === 'AGOTADO' ? 'text-red-600' : r.estado_stock === 'BAJO' ? 'text-amber-700' : 'text-slate-900'}`}>{fmtNum(r.disponible)}</td>
                  <td className="num">{Number(r.comprometido) ? <span className="text-brand-700">{fmtNum(r.comprometido)}</span> : '—'}</td>
                  <td className="num text-slate-500">{fmtNum(r.stock_minimo)}</td>
                  <td className="num">{Number(r.danado) ? <span className="text-orange-700">{fmtNum(r.danado)}</span> : '—'}</td>
                  <td className="num">{Number(r.defectuoso) ? <span className="text-red-700">{fmtNum(r.defectuoso)}</span> : '—'}</td>
                  <td className="num">{fmtMoney(r.valor)}</td>
                  <td><StockBadge estado={r.estado_stock} /></td>
                  <td><Link to={`/kardex/${r.producto_id}?almacen_id=${r.almacen_id}`} className="btn-ghost btn-sm" title="Kardex"><BookOpen className="h-4 w-4" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
      <AjusteForm open={ajuste} onClose={() => setAjuste(false)} onSaved={() => { setAjuste(false); reload(); }} almacenes={almacenes} productos={productos?.data || []} />
    </>
  );
}
