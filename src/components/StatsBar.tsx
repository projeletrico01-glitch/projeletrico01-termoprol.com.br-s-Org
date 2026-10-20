import React from 'react';
import { Cable, CableType } from '../types';
import { CABLE_TYPES } from '../constants/cableTypes';

interface StatsBarProps {
  cables: Cable[];
  activeTypeFilter?: string;
  onSelectTypeFilter?: (type: string) => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  cables,
  activeTypeFilter = '',
  onSelectTypeFilter,
}) => {
  const totalCables = cables.length;
  const totalLength = cables.reduce((acc, c) => acc + (Number(c.length) || 0), 0);

  const powerCables = cables.filter((c) => c.type === 'Potência');
  const powerLength = powerCables.reduce((acc, c) => acc + (Number(c.length) || 0), 0);

  const signalAndControlCables = cables.filter((c) =>
    ['Sinal', 'Comunicação', 'Instrumentação', 'Comando'].includes(c.type)
  );
  const signalAndControlLength = signalAndControlCables.reduce(
    (acc, c) => acc + (Number(c.length) || 0),
    0
  );

  // Unique devices/locations involved
  const uniqueLocations = new Set<string>();
  cables.forEach((c) => {
    if (c.origin.trim()) uniqueLocations.add(c.origin.trim().split('/')[0].trim());
    if (c.destination.trim()) uniqueLocations.add(c.destination.trim().split('/')[0].trim());
  });

  // Type counts breakdown for the distribution bar
  const typeCounts = (Object.keys(CABLE_TYPES) as CableType[]).map((type) => {
    const matching = cables.filter((c) => c.type === type);
    const length = matching.reduce((acc, c) => acc + (Number(c.length) || 0), 0);
    return {
      type,
      count: matching.length,
      length,
      percentage: totalLength > 0 ? (length / totalLength) * 100 : 0,
    };
  }).filter(t => t.count > 0);

  return (
    <div className="space-y-3 mb-6 no-print">
      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Total de Cabos
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalCables}
            </span>
            <span className="text-xs text-slate-400">
              {totalCables === 1 ? 'circuito' : 'circuitos'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Comprimento Total
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalLength.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs font-semibold text-slate-500">metros</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Cabos de Potência
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-blue-700 tabular-nums">
              {powerCables.length}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              ({powerLength.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m)
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Comando, Sinal & Automação
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-teal-700 tabular-nums">
              {signalAndControlCables.length}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              ({signalAndControlLength.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m)
            </span>
          </div>
        </div>
      </div>

      {/* Distribution bar of meters by type */}
      {totalCables > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
            <span>Distribuição de Metragem por Tipo de Circuito</span>
            <span className="text-slate-400 tabular-nums">
              {uniqueLocations.size} equipamentos/painéis mapeados
            </span>
          </div>

          {/* Segmented bar */}
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {typeCounts.map((item) => (
              <div
                key={item.type}
                style={{
                  width: `${Math.max(item.percentage, 2)}%`,
                  backgroundColor: CABLE_TYPES[item.type]?.strokeColor || '#94a3b8',
                }}
                className="h-full transition-all duration-300 relative group cursor-pointer"
                title={`${item.type}: ${item.length.toFixed(1)} m (${item.percentage.toFixed(1)}%)`}
                onClick={() => onSelectTypeFilter && onSelectTypeFilter(activeTypeFilter === item.type ? '' : item.type)}
              />
            ))}
          </div>

          {/* Legend Items */}
          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap mt-2.5 text-xs">
            {typeCounts.map((item) => {
              const isSelected = activeTypeFilter === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => onSelectTypeFilter && onSelectTypeFilter(isSelected ? '' : item.type)}
                  className={`flex items-center gap-1.5 transition-colors text-left ${
                    isSelected ? 'font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: CABLE_TYPES[item.type]?.strokeColor }}
                  />
                  <span>{item.type}</span>
                  <span className="text-slate-400 tabular-nums text-[11px]">
                    ({item.length.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
