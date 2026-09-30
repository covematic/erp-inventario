import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fmtNum } from '../utils/format';

/**
 * Selector de producto con búsqueda por SKU o nombre.
 * products: [{ id, sku, nombre, unidad_medida, stock_disponible }]
 */
export default function ProductSelect({ products, value, onChange, showStock, excludeIds = [], error, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const selected = products.find((p) => p.id === value);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products
      .filter((p) => p.id === value || !excludeIds.includes(p.id))
      .filter((p) => !t || p.sku.toLowerCase().includes(t) || p.nombre.toLowerCase().includes(t))
      .slice(0, 60);
  }, [products, q, excludeIds, value]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setQ(''); }}
        className={`input flex items-center justify-between text-left ${error ? 'input-error' : ''}`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>
          {selected ? `${selected.sku} · ${selected.nombre}` : 'Seleccione un producto'}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[280px] rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="p-2">
            <input autoFocus className="input" placeholder="Buscar por SKU o nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <ul className="max-h-64 overflow-y-auto pb-1">
            {filtered.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Sin coincidencias</li>}
            {filtered.map((p) => {
              const agotado = showStock && Number(p.stock_disponible) <= 0;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(p); setOpen(false); }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50 ${p.id === value ? 'bg-brand-50' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{p.nombre}</span>
                      <span className="text-xs text-slate-500">{p.sku}</span>
                    </span>
                    {showStock && (
                      <span className={`shrink-0 text-xs tabular-nums ${agotado ? 'text-red-600' : 'text-slate-500'}`}>
                        {agotado ? 'Agotado' : `${fmtNum(p.stock_disponible)} ${p.unidad_medida}`}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
