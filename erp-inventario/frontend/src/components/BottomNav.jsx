import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PackageMinus, Undo2, Warehouse, Menu } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/salidas', label: 'Salidas', icon: PackageMinus },
  { to: '/devoluciones', label: 'Devolución', icon: Undo2 },
  { to: '/inventario', label: 'Stock', icon: Warehouse },
];

/** Barra de navegación inferior para celulares (como en las apps nativas). */
export default function BottomNav({ onMenu, alertCount }) {
  const cls = ({ isActive }) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-600' : 'text-slate-500'}`;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="flex">
        {ITEMS.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={cls}>
            <i.icon className="h-6 w-6" />
            {i.label}
          </NavLink>
        ))}
        <button onClick={onMenu} className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
          <Menu className="h-6 w-6" />
          Más
          {alertCount > 0 && <span className="absolute right-[calc(50%-18px)] top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
        </button>
      </div>
    </nav>
  );
}
