import { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const SIZES = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };

export default function Modal({ open, title, subtitle, onClose, size = 'md', children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" className={`flex max-h-[92vh] w-full flex-col rounded-t-md bg-white shadow-xl sm:rounded-md ${SIZES[size]}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
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
              <label className="label">Motivo <span className="text-red-500">*</span></label>
              <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explique por qué se realiza la operación" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
