import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderKanban, PackagePlus, PackageMinus, Undo2, Warehouse, History,
  Bell, FileBarChart, Users, Settings2, LogOut, Menu, X, BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import InstallApp from './InstallApp';
import BottomNav from './BottomNav';
import useResponsiveTables from '../hooks/useResponsiveTables';
import { ROLES } from '../utils/format';

const NAV = [
  { section: 'General' },
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/alertas', label: 'Alertas', icon: Bell, badge: true },
  { section: 'Operaciones' },
  { to: '/entradas', label: 'Entradas', icon: PackagePlus },
  { to: '/salidas', label: 'Guías de salida', icon: PackageMinus },
  { to: '/devoluciones', label: 'Devoluciones', icon: Undo2 },
  { section: 'Inventario' },
  { to: '/inventario', label: 'Control de stock', icon: Warehouse },
  { to: '/kardex', label: 'Kardex', icon: BookOpen },
  { to: '/movimientos', label: 'Historial', icon: History },
  { section: 'Maestros' },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { to: '/catalogos', label: 'Catálogos', icon: Settings2 },
  { section: 'Gestión', roles: ['SUPERVISOR'] },
  { to: '/reportes', label: 'Reportes', icon: FileBarChart, roles: ['SUPERVISOR'] },
  { section: 'Administración', roles: [] },
  { to: '/usuarios', label: 'Usuarios', icon: Users, roles: [] },
];

export default function Layout() {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  useResponsiveTables();
  const principal = useRef(null);
  const primeraCarga = useRef(true);

  useEffect(() => {
    setOpen(false);
    // Al cambiar de pantalla, el lector de pantalla empieza por el contenido nuevo
    if (primeraCarga.current) primeraCarga.current = false;
    else principal.current?.focus({ preventScroll: true });
    api.get('/dashboard/alertas').then((r) => setAlertCount(r.data.total)).catch(() => {});
  }, [location.pathname]);

  const visibles = NAV.filter((n) => !n.roles || can(...n.roles));

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-beam-500 text-slate-900">
          <Warehouse className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-none text-white">ERP Inventario</p>
          <p className="text-xs text-slate-400">Gestión de almacén</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {visibles.map((n) =>
          n.section ? (
            <p key={n.section} className="px-3 pb-1 pt-4 font-display text-[13px] font-medium text-slate-400">{n.section}</p>
          ) : (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_theme(colors.beam.500)]' : 'hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <n.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{n.label}</span>
              {n.badge && alertCount > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">{alertCount}<span className="sr-only"> alertas</span></span>
              )}
            </NavLink>
          )
        )}
      </nav>
      <InstallApp />
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
            {user?.nombre?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.nombre}</p>
            <p className="text-xs text-slate-400">{ROLES[user?.rol]}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="rounded-md p-2.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <a href="#contenido" className="sr-only z-[70] rounded-md bg-beam-500 px-4 py-3 font-semibold text-slate-900 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú principal" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%]">
            {sidebar}
            <button onClick={() => setOpen(false)} className="absolute right-2 top-3 inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-300 hover:text-white" aria-label="Cerrar menú">
              <X className="h-5 w-5" />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header style={{ paddingTop: 'env(safe-area-inset-top)' }} className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100" aria-label="Abrir menú" aria-expanded={open}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-beam-500 text-slate-900"><Warehouse className="h-4 w-4" /></span>
          <span className="font-display text-xl font-semibold text-slate-900">ERP Inventario</span>
        </header>
        <main id="contenido" ref={principal} tabIndex={-1} className="mx-auto max-w-[1400px] outline-none px-3 pb-28 pt-4 sm:px-6 sm:py-6 lg:px-8 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav onMenu={() => setOpen(true)} alertCount={alertCount} />
    </div>
  );
}
