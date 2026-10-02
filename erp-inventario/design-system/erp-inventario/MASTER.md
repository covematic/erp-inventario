# ERP Inventario: sistema de diseño (MASTER)

Fuente única de verdad para la interfaz. Si existe `pages/<pantalla>.md`, sus reglas prevalecen sobre este archivo para esa pantalla.
Auditado con UI UX Pro Max v2.13 (octubre 2026).

## Identidad: almacén industrial

La interfaz toma su lenguaje del propio almacén: piso de concreto, racks azules, vigas naranjas y etiquetas amarillas de ubicación.

| Token (Tailwind) | Valor | Uso |
|---|---|---|
| `slate-100` (piso) | `#ECEEEA` | Fondo de página |
| `slate-900` (grafito) | `#1B2420` | Texto principal, barra lateral, logo |
| `slate-500` | `#5F685E` | Texto secundario (4.96:1 sobre piso; no aclarar) |
| `brand-600` (rack azul) | `#1F4F95` | Enlaces, estado activo, foco |
| `beam-500` (viga naranja) | `#EE7A1E` | **Solo** la acción principal; siempre con texto grafito (7:1) |
| `label-400` (etiqueta) | `#F5CF3A` | Clase `.code-tag` para SKU y números de documento |
| `red-600` / `red-700` | `#DC2626` / `#B91C1C` | Errores (nunca `red-500` para texto) |

Gráficos (validados para daltonismo): entradas `#2E63B8`, salidas `#E8741C`, devoluciones `#12917E`.

**Tipografía:** Barlow (texto) y Barlow Condensed (títulos, números grandes, encabezados de tabla). Sin etiquetas en mayúsculas sostenidas.

**Forma:** esquinas cortas (`rounded-md`), paneles planos con borde fino, sin sombras decorativas.

## Reglas obligatorias (verificadas en auditoría)

1. **Contraste:** texto normal ≥ 4.5:1 y grande ≥ 3:1. `slate-400` solo para íconos o sobre fondo grafito, nunca para texto sobre superficies claras.
2. **Zonas táctiles:** ≥ 44×44 px en pantallas táctiles (`@media (pointer: coarse)`) y ≥ 24×24 px con mouse. Usar `.tap` o `.tap-icon` para enlaces y botones de ícono.
3. **Texto:** mínimo 12 px; 16 px en campos en el celular (evita el zoom de iOS).
4. **Formularios:** todo campo va dentro de `<Field>`, que vincula la etiqueta (`htmlFor`), `aria-invalid`, `aria-describedby` y anuncia el error. Fuera de `Field`: `aria-label` explícito. Tras un envío fallido, llamar a `enfocarPrimerError()`.
5. **Modales:** usar `<Modal>`, que tiene título vinculado, foco atrapado, cierre con Escape y devolución del foco al cerrar.
6. **Avisos:** `useToast()`. El contenedor es una región `aria-live`; los errores usan `role="alert"`.
7. **Navegación:** barra lateral en ≥ 1024 px, barra inferior de 5 opciones en el celular. Enlace "Saltar al contenido" y foco en `<main>` al cambiar de pantalla.
8. **Tablas:** clase `.table-base`. En el celular se convierten en tarjetas (`useResponsiveTables`); la primera columna es el título de la tarjeta.
9. **Color nunca solo:** los estados llevan texto o ícono (por ejemplo `StockBadge`: ● Agotado).
10. **Movimiento:** se respeta `prefers-reduced-motion`; transiciones solo de color y opacidad.

## Lista antes de entregar una pantalla

- [ ] Probada a 375 px y 1440 px, sin desplazamiento horizontal
- [ ] Contraste ≥ 4.5:1 en todo texto
- [ ] Zonas táctiles ≥ 44 px (celular) y ≥ 24 px (PC)
- [ ] Todos los campos tienen nombre accesible y los errores están junto al campo
- [ ] Usable solo con teclado (Tab, Enter, Escape) y con foco visible
- [ ] Una sola acción principal naranja por pantalla

## Facilidad de uso (octubre 2026)

1. **Inicio orientado a tareas:** `AccionesRapidas` muestra las acciones del rol; `PrimerosPasos` guía la puesta en marcha y desaparece al completarse.
2. **Estados vacíos útiles:** distinguir "sin resultados por filtro" (ofrecer limpiar) de "aún no hay datos" (botón para crear el primero).
3. **Filtros progresivos:** en el celular solo se ve la búsqueda; el resto va tras "Filtros (n)" con "Limpiar filtros". Pasar `onLimpiar` a `TableCard`.
4. **Esperas explicadas:** `LoadingBlock` y el login avisan tras 4 s que el servidor se está activando.
5. **Menos tecleo:** cantidades con `CantidadInput` (− / +), y se recuerda el último almacén usado.
