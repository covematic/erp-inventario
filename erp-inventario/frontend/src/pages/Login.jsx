import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Warehouse, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { useEsperaLarga } from '../components/ui';

const DEMO = [
  ['Administrador', 'admin@erp.com', 'admin123'],
  ['Almacén', 'almacen@erp.com', 'almacen123'],
  ['Supervisor', 'supervisor@erp.com', 'supervisor123'],
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const esperaLarga = useEsperaLarga(loading);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Ingrese su correo y contraseña');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-beam-500 text-slate-900">
            <Warehouse className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold leading-none">ERP Inventario</p>
            <p className="text-sm text-slate-400">Control de almacén, guías y devoluciones</p>
          </div>
        </div>
        <form onSubmit={submit} className="rounded-md bg-white p-6 sm:p-8" noValidate>
          <h1 className="text-xl font-semibold text-slate-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-500">Ingrese con su cuenta de usuario</p>
          {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="email">Correo</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <button className="btn-primary w-full py-2.5" disabled={loading}>
              <LogIn aria-hidden="true" className="h-4 w-4" /> {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
            {esperaLarga && (
              <p role="status" className="text-center text-sm text-slate-600">
                El sistema se está activando. La primera vez del día puede tardar hasta un minuto.
              </p>
            )}
          </div>
          {import.meta.env.DEV && <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="mb-2 text-sm font-medium text-slate-500">Usuarios de prueba</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEMO.map(([rol, e, p]) => (
                <button type="button" key={e} onClick={() => { setEmail(e); setPassword(p); }} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50">
                  {rol}
                </button>
              ))}
            </div>
          </div>}
        </form>
      </div>
    </div>
  );
}
