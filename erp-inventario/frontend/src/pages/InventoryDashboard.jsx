import React, { useState, useMemo } from 'react';

// Datos iniciales de demostración para herramientas, maquinaria y materiales
const INITIAL_ITEMS = [
  {
    id: 'MAQ-01',
    name: 'Retroexcavadora CAT 420F2',
    category: 'maquinaria',
    code: 'CAT-420-01',
    status: 'en_obra',
    location: 'Obra Central - Sector A',
    operator: 'Jorge Ramírez',
    meterReading: '1,420 hrs',
    unitCost: 85000,
    maintCostTotal: 4200,
  },
  {
    id: 'MAQ-02',
    name: 'Generador Eléctrico 15kVA Kohler',
    category: 'maquinaria',
    code: 'GEN-KOH-02',
    status: 'mantenimiento',
    location: 'Taller Base',
    operator: 'Sin asignar',
    meterReading: '680 hrs',
    unitCost: 12400,
    maintCostTotal: 950,
  },
  {
    id: 'HER-01',
    name: 'Rotomartillo SDS Max Bosch GBH 8-45',
    category: 'herramientas',
    code: 'ROT-BOS-10',
    status: 'en_obra',
    location: 'Cuadrilla Estructuras',
    operator: 'Marcos Silva',
    condition: 'Bueno',
    unitCost: 780,
  },
  {
    id: 'HER-02',
    name: 'Soldadora Inverter Miller 200A',
    category: 'herramientas',
    code: 'SOL-MIL-04',
    status: 'disponible',
    location: 'Bodega Principal - Estante 2',
    operator: 'En bodega',
    condition: 'Excelente',
    unitCost: 1450,
  },
  {
    id: 'MAT-01',
    name: 'Cemento Portland Tipo I (42.5 kg)',
    category: 'materiales',
    code: 'MAT-CEM-01',
    status: 'disponible',
    stock: 240,
    minStock: 80,
    unit: 'bolsas',
    unitCost: 8.50,
  },
  {
    id: 'MAT-02',
    name: 'Varilla de Acero 1/2" x 9m',
    category: 'materiales',
    code: 'MAT-ACE-12',
    status: 'critico',
    stock: 28,
    minStock: 100,
    unit: 'varillas',
    unitCost: 14.20,
  },
];

export default function InventoryDashboard() {
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrado reactivo
  const filteredItems = useMemo(() => {
    return INITIAL_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Resumen financiero y métricas
  const totals = useMemo(() => {
    const totalValue = INITIAL_ITEMS.reduce((acc, item) => {
      if (item.category === 'materiales') return acc + (item.unitCost * (item.stock || 0));
      return acc + item.unitCost;
    }, 0);
    const criticalCount = INITIAL_ITEMS.filter(i => i.status === 'critico' || i.status === 'mantenimiento').length;
    return { totalValue, criticalCount };
  }, []);

  return (
    <div className="min-h-screen bg-canvas p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Encabezado y Acciones Rápidas */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-borderSoft pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amberSafety-500 inline-block animate-pulse"></span>
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted">Gestión Operativa</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink-primary">Inventario y Costos</h1>
            <p className="text-sm text-ink-muted mt-1">Control de maquinaria activa, herramientas y consumibles.</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 text-sm font-semibold text-ink-primary bg-surface border border-borderSoft rounded-xl hover:bg-stone-100 transition">
              Salida a Obra
            </button>
            <button className="px-4 py-2.5 text-sm font-semibold text-white bg-amberSafety-600 rounded-xl hover:bg-amberSafety-500 shadow-sm transition">
              + Registrar Ingreso
            </button>
          </div>
        </header>

        {/* Tarjetas de Métricas de Costo y Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface p-5 rounded-2xl border border-borderSoft shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Valor de Activos</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink-primary num-tabular">
                ${totals.totalValue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-xs text-ink-dim mt-1 block">Inventario valorizado actual</span>
          </div>

          <div className="bg-surface p-5 rounded-2xl border border-borderSoft shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Total Activos Registrados</span>
            <div className="mt-2 text-2xl font-bold text-ink-primary num-tabular">
              {INITIAL_ITEMS.length} unidades
            </div>
            <span className="text-xs text-ink-dim mt-1 block">Maquinaria, equipos y lotes</span>
          </div>

          <div className="bg-surface p-5 rounded-2xl border border-borderSoft shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Atención Requerida</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-bold text-status-critical num-tabular">
                {totals.criticalCount}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium border border-rose-200">
                Alerta
              </span>
            </div>
            <span className="text-xs text-ink-dim mt-1 block">En taller o bajo stock mínimo</span>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          {/* Pestañas de Categoría */}
          <div className="inline-flex p-1 bg-stone-200/70 rounded-xl border border-borderSoft self-start">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'maquinaria', label: '🚜 Maquinaria' },
              { id: 'herramientas', label: '🔨 Herramientas' },
              { id: 'materiales', label: '📦 Materiales' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-surface text-ink-primary shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Campo de Búsqueda */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-borderSoft rounded-xl px-3.5 py-2 text-sm text-ink-primary placeholder-ink-dim focus:outline-none focus:ring-2 focus:ring-amberSafety-500/50"
            />
          </div>
        </div>

        {/* Cuadrícula de Activos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-surface rounded-2xl border border-borderSoft p-5 flex flex-col justify-between hover:border-ink-dim transition-all shadow-xs"
            >
              <div>
                {/* Código y Estado */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-stone-100 text-ink-muted border border-stone-200">
                    {item.code}
                  </span>
                  <StatusBadge status={item.status} />
                </div>

                <h3 className="font-semibold text-ink-primary text-base leading-snug">
                  {item.name}
                </h3>

                {/* Detalle contextual según la categoría */}
                <div className="mt-4 space-y-2 text-xs border-t border-borderSoft/60 pt-3">
                  {item.category === 'maquinaria' && (
                    <>
                      <div className="flex justify-between text-ink-muted">
                        <span>Ubicación:</span>
                        <span className="font-medium text-ink-primary">{item.location}</span>
                      </div>
                      <div className="flex justify-between text-ink-muted">
                        <span>Uso acumulado:</span>
                        <span className="num-tabular font-medium text-ink-primary">{item.meterReading}</span>
                      </div>
                      <div className="flex justify-between text-ink-muted">
                        <span>Mantenimiento total:</span>
                        <span className="num-tabular text-amberSafety-600 font-semibold">${item.maintCostTotal}</span>
                      </div>
                    </>
                  )}

                  {item.category === 'herramientas' && (
                    <>
                      <div className="flex justify-between text-ink-muted">
                        <span>Custodia / Asignado a:</span>
                        <span className="font-medium text-ink-primary">{item.operator}</span>
                      </div>
                      <div className="flex justify-between text-ink-muted">
                        <span>Condición:</span>
                        <span className="font-medium text-ink-primary">{item.condition}</span>
                      </div>
                      <div className="flex justify-between text-ink-muted">
                        <span>Ubicación:</span>
                        <span className="text-ink-primary">{item.location}</span>
                      </div>
                    </>
                  )}

                  {item.category === 'materiales' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-ink-muted">
                        <span>Disponibilidad:</span>
                        <span className="num-tabular font-semibold text-ink-primary">
                          {item.stock} / {item.minStock} {item.unit} (mín.)
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200">
                        <div
                          className={`h-full rounded-full ${
                            item.stock <= item.minStock ? 'bg-status-critical' : 'bg-status-available'
                          }`}
                          style={{ width: `${Math.min(100, (item.stock / (item.minStock * 2)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pie de tarjeta: Costos */}
              <div className="mt-5 pt-3 border-t border-borderSoft flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink-dim block">
                    {item.category === 'materiales' ? 'Costo Unitario' : 'Valor Activo'}
                  </span>
                  <span className="num-tabular text-sm font-bold text-ink-primary">
                    ${item.unitCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-borderSoft hover:bg-stone-100 transition text-ink-primary">
                  Detalles →
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    disponible: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    en_obra: 'bg-blue-50 text-blue-800 border-blue-200',
    mantenimiento: 'bg-amber-50 text-amber-800 border-amber-200',
    critico: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const labels = {
    disponible: 'Disponible',
    en_obra: 'En Obra',
    mantenimiento: 'En Taller',
    critico: 'Stock Crítico',
  };

  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${styles[status] || 'bg-stone-100 text-stone-600'}`}>
      {labels[status] || status}
    </span>
  );
}
