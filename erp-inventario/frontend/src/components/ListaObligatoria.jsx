import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CreacionRapida, CAMPOS_CATEGORIA, CAMPOS_PROVEEDOR } from './CreacionRapida';
import { Field } from './ui';
import { hoy } from '../utils/format';

const obligatorio = (msg) => (x) => (!x ? msg : null);

/**
 * Qué se necesita para que una lista obligatoria tenga opciones:
 * quién puede crearlas, cómo crearlas aquí mismo y adónde ir si no se puede.
 */
export const LISTAS = {
  almacen: {
    plural: 'almacenes', nuevo: 'Nuevo almacén', aviso: 'Almacén registrado', rol: [], endpoint: '/almacenes',
    campos: [
      { key: 'nombre', placeholder: 'Nombre del almacén (ej. Almacén central)', validar: obligatorio('Escriba el nombre') },
      { key: 'codigo', placeholder: 'Código corto (ej. ALM-01)', validar: obligatorio('Escriba un código') },
    ],
    pedir: 'Pida a un administrador que registre uno en Catálogos → Almacenes.',
  },
  area: {
    plural: 'áreas', nuevo: 'Nueva área', aviso: 'Área registrada', rol: [], endpoint: '/areas',
    campos: [{ key: 'nombre', placeholder: 'Nombre del área (ej. Mantenimiento)', validar: obligatorio('Escriba el nombre') }],
    pedir: 'Pida a un administrador que registre una en Catálogos → Áreas.',
  },
  proyecto: {
    plural: 'proyectos activos', nuevo: 'Nuevo proyecto', aviso: 'Proyecto registrado', rol: ['SUPERVISOR'], endpoint: '/proyectos',
    campos: [
      { key: 'nombre', placeholder: 'Nombre del proyecto', validar: obligatorio('Escriba el nombre') },
      { key: 'codigo', placeholder: 'Código (ej. PRY-001)', validar: obligatorio('Escriba un código') },
      { key: 'responsable', placeholder: 'Responsable en obra', validar: obligatorio('Indique el responsable') },
    ],
    fijos: () => ({ fecha_inicio: hoy(), estado: 'ACTIVO' }),
    pedir: 'Pida a un supervisor que cree el proyecto en Proyectos. Mientras tanto puede despachar a un área interna.',
  },
  categoria: {
    plural: 'categorías', nuevo: 'Nueva categoría', aviso: 'Categoría registrada', rol: [], endpoint: '/categorias', campos: CAMPOS_CATEGORIA,
    pedir: 'Pida a un administrador que registre una en Catálogos → Categorías.',
  },
  proveedor: {
    plural: 'proveedores', nuevo: 'Nuevo proveedor', aviso: 'Proveedor registrado', rol: [], endpoint: '/proveedores', campos: CAMPOS_PROVEEDOR,
    pedir: 'Pida a un administrador que registre uno en Catálogos → Proveedores.',
  },
  producto: {
    plural: 'productos activos', rol: [], irA: { to: '/productos', state: { nuevo: true }, texto: 'Registrar producto' },
    pedir: 'Pida a un administrador que registre los productos.',
  },
  guiaDevolvible: {
    plural: 'guías despachadas con productos por devolver', rol: ['ALMACEN'],
    irA: { to: '/salidas/nueva', texto: 'Nueva guía de salida' },
    explicacion: 'Una devolución siempre parte de una guía de salida ya despachada. Cuando despache una, aparecerá aquí.',
  },
  rol: {
    plural: 'roles', rol: [],
    explicacion: 'Los roles se crean al instalar el sistema. Reinicie el servidor para que se vuelvan a crear.',
  },
};

/** Aviso que reemplaza a una lista obligatoria vacía: explica por qué y ofrece cómo resolverlo. */
export function SinOpciones({ tipo, onCreado, mensaje }) {
  const { can } = useAuth();
  const [creando, setCreando] = useState(false);
  const cfg = LISTAS[tipo];
  const puede = can(...cfg.rol);

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
      <p className="flex gap-2 font-medium">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <span>{mensaje || `Aún no hay ${cfg.plural}, por eso no hay nada que elegir.`}</span>
      </p>
      {cfg.explicacion && <p className="mt-1 pl-6 text-amber-900">{cfg.explicacion}</p>}
      {puede && cfg.endpoint && !creando && (
        <button type="button" className="btn-secondary btn-sm mt-2 ml-6" onClick={() => setCreando(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" /> {cfg.nuevo} aquí
        </button>
      )}
      {puede && cfg.irA && (
        <Link to={cfg.irA.to} state={cfg.irA.state} className="btn-secondary btn-sm mt-2 ml-6">{cfg.irA.texto}</Link>
      )}
      {!puede && cfg.pedir && <p className="mt-1 pl-6 text-amber-900">{cfg.pedir}</p>}
      {creando && (
        <CreacionRapida encabezado={cfg.nuevo} aviso={cfg.aviso} titulo={cfg.nuevo} endpoint={cfg.endpoint} campos={cfg.campos} fijos={cfg.fijos?.()}
          onCancelar={() => setCreando(false)}
          onCreado={(nuevo) => { setCreando(false); onCreado?.(nuevo); }} />
      )}
    </div>
  );
}

/**
 * Campo de lista obligatoria. Úselo para todo <select> requerido cuyas opciones vengan de la base de datos:
 * mientras carga muestra la lista; si llega vacía, muestra SinOpciones en lugar de una lista imposible de elegir.
 * opciones: undefined = cargando; [] = vacía.
 */
export function CampoLista({ tipo, opciones, onCreado, mensaje, label, required = true, error, hint, className = '', children }) {
  if (Array.isArray(opciones) && opciones.length === 0) {
    return (
      <div className={className}>
        <span className="label">{label} {required && <span className="text-red-600" aria-hidden="true">*</span>}</span>
        <SinOpciones tipo={tipo} onCreado={onCreado} mensaje={mensaje} />
        {error && <p role="alert" className="mt-1 text-xs font-medium text-red-700">{error}</p>}
      </div>
    );
  }
  return <Field label={label} required={required} error={error} hint={hint} className={className} cargando={!opciones}>{children}</Field>;
}
