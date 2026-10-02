import { Children, cloneElement, isValidElement, useId } from 'react';
import { Loader2, Inbox, ChevronLeft, ChevronRight, Search, AlertCircle } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-brand-600 ${className}`} />;
}

export function LoadingBlock({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertCircle className="h-8 w-8 text-red-600" />
      <p className="max-w-md text-sm text-slate-600">{message}</p>
      {onRetry && <button className="btn-secondary btn-sm" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

export function EmptyState({ title = 'Sin resultados', text, action }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <Inbox className="h-9 w-9 text-slate-300" />
      <p className="font-medium text-slate-700">{title}</p>
      {text && <p className="max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[28px] font-bold leading-tight text-slate-900 sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap [&>*]:py-2.5 sm:[&>*]:py-2">{actions}</div>}
    </div>
  );
}

const TONOS = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  blue: 'bg-brand-50 text-brand-700 ring-brand-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
};

export function Badge({ tone = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONOS[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function StockBadge({ estado }) {
  if (estado === 'AGOTADO') return <Badge tone="red">● Agotado</Badge>;
  if (estado === 'BAJO') return <Badge tone="amber">● Stock bajo</Badge>;
  return <Badge tone="green">● Normal</Badge>;
}

const ESTADOS_DOC = {
  DESPACHADA: ['green', 'Despachada'],
  PENDIENTE: ['amber', 'Pendiente'],
  ANULADA: ['red', 'Anulada'],
  CONFIRMADA: ['green', 'Confirmada'],
  ACTIVO: ['green', 'Activo'],
  CERRADO: ['gray', 'Cerrado'],
};
export function EstadoBadge({ estado }) {
  const [tone, label] = ESTADOS_DOC[estado] || ['gray', estado];
  return <Badge tone={tone}>{label}</Badge>;
}

const TIPOS_MOV = {
  ENTRADA: ['green', 'Entrada'],
  SALIDA: ['blue', 'Salida'],
  DEVOLUCION: ['purple', 'Devolución'],
  AJUSTE: ['orange', 'Ajuste'],
  ANULACION: ['red', 'Anulación'],
};
export function TipoMovBadge({ tipo }) {
  const [tone, label] = TIPOS_MOV[tipo] || ['gray', tipo];
  return <Badge tone={tone}>{label}</Badge>;
}

const ESTADO_PROD = { BUENO: ['green', 'Bueno'], DANADO: ['orange', 'Dañado'], DEFECTUOSO: ['red', 'Defectuoso'], DISPONIBLE: ['green', 'Disponible'] };
export function EstadoProductoBadge({ estado }) {
  const [tone, label] = ESTADO_PROD[estado] || ['gray', estado];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Campo de formulario con etiqueta y mensaje de error. */
const CONTROLES = ['input', 'select', 'textarea'];

/** Busca el primer input/select/textarea (hasta 2 niveles) y le agrega id y atributos de accesibilidad. */
function vincularControl(nodo, extra, nivel = 0) {
  if (!isValidElement(nodo) || nivel > 2) return [nodo, false];
  if (CONTROLES.includes(nodo.type)) return [cloneElement(nodo, { ...extra, id: nodo.props.id || extra.id }), true];
  if (typeof nodo.type !== 'string' || !nodo.props.children) return [nodo, false];
  let hecho = false;
  const hijos = Children.map(nodo.props.children, (h) => {
    if (hecho) return h;
    const [nuevo, ok] = vincularControl(h, extra, nivel + 1);
    hecho = ok;
    return nuevo;
  });
  return [hecho ? cloneElement(nodo, {}, hijos) : nodo, hecho];
}

/** Campo de formulario: la etiqueta queda vinculada al control y el error se anuncia y se conecta con él. */
export function Field({ label, error, required, hint, children, className = '' }) {
  const id = useId();
  const msgId = `${id}-msg`;
  const [control, vinculado] = vincularControl(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? msgId : undefined,
    'aria-required': required ? true : undefined,
  });
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={vinculado ? id : undefined}>
          {label} {required && <span className="text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      {control}
      {error
        ? <p id={msgId} role="alert" className="mt-1 text-xs font-medium text-red-700">{error}</p>
        : hint ? <p id={msgId} className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input type="search" aria-label={placeholder.replace(/…$/, '')} className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function Pagination({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return total ? <div className="px-4 py-3 text-xs text-slate-500">{total} registro(s)</div> : null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
      <span className="text-xs text-slate-500">
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-xs text-slate-600">Página {page} de {pages}</span>
        <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Siguiente">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'blue', hint, onClick }) {
  // tone marca solo el ícono; el número siempre va en tinta para que se lea primero
  const tones = {
    blue: 'text-brand-600', green: 'text-emerald-700', amber: 'text-amber-600',
    red: 'text-red-600', purple: 'text-violet-600', slate: 'text-slate-500',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`card flex min-w-0 flex-col gap-1 p-3 text-left sm:p-4 ${onClick ? 'transition-colors hover:border-slate-400' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {Icon && <Icon className={`h-[18px] w-[18px] shrink-0 ${tones[tone]}`} />}
      </div>
      <p className="truncate font-display text-[26px] font-semibold leading-none tabular-nums text-slate-900 sm:text-[32px]">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </Tag>
  );
}

/** Contenedor de tabla con scroll horizontal en pantallas pequeñas. */
export function TableCard({ children, toolbar, footer }) {
  return (
    <div className="overflow-hidden max-md:bg-transparent md:card">
      {toolbar && <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 max-md:mb-1 md:rounded-none md:border-0 md:border-b lg:flex-row lg:items-center">{toolbar}</div>}
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}

export function DetailItem({ label, children }) {
  return (
    <div>
      <dt className="text-[13px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children || '—'}</dd>
    </div>
  );
}
