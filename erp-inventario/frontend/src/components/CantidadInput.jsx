import { Minus, Plus } from 'lucide-react';

/** Cantidad con botones − y + (más fácil que el teclado en el celular). Escribir también funciona. */
export default function CantidadInput({ value, onChange, unidad, max, invalido, etiqueta = 'Cantidad' }) {
  const n = Number(value) || 0;
  const cambiar = (d) => {
    const v = Math.max(0, Math.round((n + d) * 1000) / 1000);
    onChange(String(max !== undefined && d > 0 ? Math.min(v, Math.max(max, n)) : v));
  };
  return (
    <div className={`flex items-stretch overflow-hidden rounded-md border bg-white ${invalido ? 'border-red-500' : 'border-slate-300'} focus-within:ring-2 focus-within:ring-brand-600/20`}>
      <button type="button" onClick={() => cambiar(-1)} disabled={n <= 0} className="flex w-11 shrink-0 items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40" aria-label={`Restar 1 a ${etiqueta.toLowerCase()}`}>
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>
      <div className="relative min-w-0 flex-1">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          aria-label={etiqueta}
          aria-invalid={invalido ? true : undefined}
          className={`h-full min-h-[48px] w-full border-x border-slate-200 px-2 pb-3 text-center text-base font-semibold tabular-nums text-slate-900 outline-none ${invalido ? 'bg-red-50 input-error' : ''}`}
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
        />
        {unidad && <span className="pointer-events-none absolute bottom-0.5 left-0 right-0 text-center text-xs leading-none text-slate-500" aria-hidden="true">{unidad}</span>}
      </div>
      <button type="button" onClick={() => cambiar(1)} className="flex w-11 shrink-0 items-center justify-center text-slate-700 hover:bg-slate-100" aria-label={`Sumar 1 a ${etiqueta.toLowerCase()}`}>
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
