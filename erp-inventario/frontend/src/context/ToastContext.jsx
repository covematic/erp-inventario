import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);
let nextId = 1;

const ESTILOS = {
  success: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-800', iconCls: 'text-emerald-600' },
  error: { icon: XCircle, cls: 'border-red-200 bg-red-50 text-red-800', iconCls: 'text-red-600' },
  warning: { icon: AlertTriangle, cls: 'border-amber-200 bg-amber-50 text-amber-800', iconCls: 'text-amber-600' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((type, message) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => remove(id), type === 'error' ? 8000 : 4500);
  }, [remove]);

  const toast = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    warning: (m) => push('warning', m),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const { icon: Icon, cls, iconCls } = ESTILOS[t.type];
          return (
            <div key={t.id} role="status" className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg ${cls}`}>
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconCls}`} />
              <p className="flex-1 leading-snug">{t.message}</p>
              <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
