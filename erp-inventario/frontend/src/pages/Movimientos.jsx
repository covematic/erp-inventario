import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch, { useDebounce } from '../hooks/useFetch';
import { PageHeader, TableCard, SearchInput, LoadingBlock, ErrorBlock, EmptyState, Pagination, TipoMovBadge, EstadoProductoBadge } from '../components/ui';
import { fmtNum, fmtMoney, fmtDateTime, TIPO_MOV } from '../utils/format';

export default function Movimientos() {
  const [documento, setDocumento] = useState('');
  const [producto, setProducto] = useState('');
  const [tipo, setTipo] = useState('');
  const [usuario, setUsuario] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const dd = useDebounce(documento);
  const { data: productos } = useFetch('/productos', { limit: 1000 });
  const { data: usuarios } = useFetch('/usuarios/basico');
  const { data, loading, error, reload } = useFetch('/inventario/movimientos', {
    documento: dd, producto_id: producto, tipo, usuario_id: usuario, desde, hasta, page, limit: 25,
  });

  useEffect(() => setPage(1), [dd, producto, tipo, usuario, desde, hasta]);
  const limpiar = () => { setDocumento(''); setProducto(''); setTipo(''); setUsuario(''); setDesde(''); setHasta(''); };

  return (
    <>
      <PageHeader title="Historial de movimientos" subtitle="Entradas, salidas, devoluciones, ajustes y anulaciones de todos los productos" />
      <TableCard
        toolbar={<div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-7">
          <SearchInput value={documento} onChange={setDocumento} placeholder="N° documento" />
          <select className="input lg:col-span-2" value={producto} onChange={(e) => setProducto(e.target.value)}>
            <option value="">Todos los productos</option>
            {productos?.data.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.nombre}</option>)}
          </select>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_MOV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input" value={usuario} onChange={(e) => setUsuario(e.target.value)}>
            <option value="">Todos los usuarios</option>
            {usuarios?.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
          <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" title="Desde" />
          <div className="flex gap-2">
            <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" title="Hasta" />
            <button className="btn-ghost btn-sm" onClick={limpiar}>Limpiar</button>
          </div>
        </div>}
        footer={data && <Pagination page={page} limit={data.limit} total={data.total} onPage={setPage} />}
      >
        {loading && !data ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : data.data.length === 0 ? <EmptyState /> : (
          <table className="table-base">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Documento</th><th>Producto</th><th>Almacén</th><th className="num">Entrada</th><th className="num">Salida</th><th className="num">Devolución</th><th className="num">Saldo</th><th className="num">Valor</th><th>Usuario</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.data.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-slate-600">{fmtDateTime(m.fecha)}</td>
                  <td><TipoMovBadge tipo={m.tipo} /></td>
                  <td className="font-mono text-xs" title={m.observacion || ''}>{m.documento_numero}</td>
                  <td className="max-w-[240px]"><Link to={`/kardex/${m.producto_id}?almacen_id=${m.almacen_id}`} className="block truncate hover:text-brand-700">{m.producto_nombre}</Link><span className="text-xs text-slate-500">{m.sku}</span></td>
                  <td className="whitespace-nowrap text-slate-500">{m.almacen_nombre}</td>
                  <td className="num text-emerald-700">{Number(m.cantidad_entrada) ? fmtNum(m.cantidad_entrada) : ''}</td>
                  <td className="num">{Number(m.cantidad_salida) ? fmtNum(m.cantidad_salida) : ''}</td>
                  <td className="num text-violet-700">{Number(m.cantidad_devolucion) ? <>{fmtNum(m.cantidad_devolucion)} {m.estado_stock !== 'DISPONIBLE' && <EstadoProductoBadge estado={m.estado_stock} />}</> : ''}</td>
                  <td className="num font-medium">{fmtNum(m.saldo)}</td>
                  <td className="num">{fmtMoney(m.valor)}</td>
                  <td className="whitespace-nowrap text-slate-500">{m.usuario_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
    </>
  );
}
