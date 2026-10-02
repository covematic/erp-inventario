import { useEffect, useId, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const SIZES = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };

const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Modal({ open, title, subtitle, onClose, size = 'md', children, footer }) {
  const caja = useRef(null);
  const tituloId = useId();
  const cerrar = useRef(onClose);
  cerrar.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const anterior = document.activeElement;
    // Foco inicial: primer campo del contenido; si no hay, el propio diálogo
    const t = setTimeout(() => {
      const el = caja.current;
      if (!el || el.contains(document.activeElement)) return;
      const tactil = window.matchMedia('(pointer: coarse)').matches;
      const campo = tactil ? null : el.querySelector('.modal-body input:not([disabled]):not([type=hidden]), .modal-body select:not([disabled]), .modal-body textarea:not([disabled])');
      (campo || el).focus({ preventScroll: true });
    }, 30);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); cerrar.current?.(); return; }
      if (e.key !== 'Tab' || !caja.current) return;
      // Mantener el foco dentro del diálogo
      const items = [...caja.current.querySelectorAll(ENFOCABLES)].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const primero = items[0];
      const ultimo = items[items.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      // Devolver el foco al control que abrió el diálogo
      if (anterior && document.contains(anterior)) anterior.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={caja} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={tituloId} className={`flex outline-none max-h-[92vh] w-full flex-col rounded-t-md bg-white shadow-xl sm:rounded-md ${SIZES[size]}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id={tituloId} className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600" aria-label="Cerrar">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="modal-body flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:rounded-b-md">{footer}</div>}
      </div>
    </div>
  );
}

/** Modal de confirmación. Si requireReason, pide un motivo obligatorio. */
export function ConfirmDialog({ open, title, message, confirmText = 'Confirmar', danger, loading, onConfirm, onClose, requireReason, reason, setReason }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading || (requireReason && !reason?.trim())}
          >
            {loading ? 'Procesando…' : confirmText}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <div className="h-fit rounded-full bg-red-100 p-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
        )}
        <div className="flex-1 text-sm text-slate-600">
          {message}
          {requireReason && (
            <div className="mt-3">
              <label className="label" htmlFor="motivo-confirmacion">Motivo <span className="text-red-600" aria-hidden="true">*</span></label>
              <textarea id="motivo-confirmacion" aria-required="true" className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explique por qué se realiza la operación" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
