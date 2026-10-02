import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageMinus, PackagePlus, Undo2, Search, Bell, FileBarChart, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Tareas del día según el rol: lo primero que ve el usuario al entrar. */
export function AccionesRapidas({ alertas = 0 }) {
  const { can, user } = useAuth();
  const operador = can('ALMACEN');
  const acciones = operador
    ? [
      { to: '/salidas/nueva', label: 'Nueva guía de salida', detalle: 'Despachar a proyecto o área', icon: PackageMinus, principal: true },
      { to: '/entradas', state: { nuevo: true }, label: 'Registrar entrada', detalle: 'Lo que llega del proveedor', icon: PackagePlus },
      { to: '/devoluciones', state: { nuevo: true }, label: 'Registrar devolución', detalle: 'Material que regresa', icon: Undo2 },
      { to: '/inventario', label: 'Consultar stock', detalle: 'Buscar un producto', icon: Search },
    ]
    : [
      { to: '/alertas', label: 'Revisar alertas', detalle: alertas ? `${alertas} por atender` : 'Sin pendientes', icon: Bell, principal: alertas > 0 },
      { to: '/reportes', label: 'Ver reportes', detalle: 'Exportar a Excel o CSV', icon: FileBarChart },
      { to: '/inventario', label: 'Consultar stock', detalle: 'Disponible y comprometido', icon: Search },
    ];
  const nombre = user?.nombre?.split(' ')[0];
  return (
    <section aria-labelledby="titulo-acciones" className="mb-5">
      <h2 id="titulo-acciones" className="mb-2 text-lg font-semibold text-slate-900">{nombre ? `Hola, ${nombre}. ¿Qué vas a registrar?` : '¿Qué vas a registrar?'}</h2>
      <div className={`grid gap-2.5 ${acciones.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {acciones.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            state={a.state}
            className={`flex min-h-[72px] items-center gap-3 rounded-md border p-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
              a.principal ? 'border-beam-600 bg-beam-500 text-slate-900 hover:bg-beam-400' : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
            }`}
          >
            <a.icon aria-hidden="true" className="h-6 w-6 shrink-0" />
            <span className="min-w-0">
              <span className="block font-semibold leading-tight">{a.label}</span>
              <span className={`block text-xs ${a.principal ? 'text-slate-800' : 'text-slate-500'}`}>{a.detalle}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const CLAVE = 'erp_primeros_pasos_oculto';
const leerOculto = () => { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } };

/** Guía para un sistema recién instalado. Desaparece sola al completar los pasos o si el usuario la oculta. */
export function PrimerosPasos({ kpis }) {
  const { can } = useAuth();
  const [oculto, setOculto] = useState(leerOculto);
  const pasos = [
    { hecho: kpis.total_productos > 0, titulo: 'Registra tus productos', texto: 'Incluye el stock que ya tienes en «Stock inicial».', to: '/productos', state: { nuevo: true }, cta: 'Nuevo producto', visible: can() },
    { hecho: kpis.proyectos_activos > 0, titulo: 'Crea tus proyectos', texto: 'Son los destinos de las guías de salida.', to: '/proyectos', cta: 'Ver proyectos', visible: can('SUPERVISOR') },
    { hecho: kpis.salidas + kpis.salidas_pendientes > 0, titulo: 'Despacha tu primera guía', texto: 'El sistema valida el stock antes de que salga.', to: '/salidas/nueva', cta: 'Nueva guía', visible: can('ALMACEN') },
  ].filter((p) => p.visible);
  const completos = pasos.filter((p) => p.hecho).length;
  if (oculto || pasos.length === 0 || completos === pasos.length) return null;
  const ocultar = () => { setOculto(true); try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento */ } };

  return (
    <section aria-labelledby="titulo-pasos" className="card mb-5 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 id="titulo-pasos" className="text-lg font-semibold text-slate-900">Primeros pasos</h2>
          <p className="text-sm text-slate-500">{completos} de {pasos.length} listos para empezar a trabajar con el inventario real.</p>
        </div>
        <button type="button" onClick={ocultar} className="btn-ghost tap-icon -m-1 shrink-0" aria-label="Ocultar primeros pasos"><X aria-hidden="true" className="h-4 w-4" /></button>
      </div>
      <ol className="grid gap-2.5 md:grid-cols-3">
        {pasos.map((p, i) => (
          <li key={p.titulo} className={`flex items-start gap-3 rounded-md border p-3 ${p.hecho ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${p.hecho ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
              {p.hecho ? <Check aria-hidden="true" className="h-4 w-4" /> : i + 1}
              <span className="sr-only">{p.hecho ? 'Completado: ' : `Paso ${i + 1}: `}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${p.hecho ? 'text-emerald-900 line-through decoration-emerald-600/50' : 'text-slate-900'}`}>{p.titulo}</p>
              <p className="text-sm text-slate-500">{p.texto}</p>
              {!p.hecho && <Link to={p.to} state={p.state} className="tap mt-1 text-sm font-semibold text-brand-700 hover:underline">{p.cta}</Link>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
