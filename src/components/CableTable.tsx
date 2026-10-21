import React, { useState, useMemo } from 'react';
import { Cable, CableType } from '../types';
import { CABLE_TYPES } from '../constants/cableTypes';
import { 
  Search, 
  ArrowUpDown, 
  Edit3, 
  Copy, 
  Trash2, 
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  Download
} from 'lucide-react';

interface CableTableProps {
  cables: Cable[];
  onEditCable: (cable: Cable) => void;
  onDuplicateCable: (cable: Cable) => void;
  onDeleteCable: (id: string, code: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onBatchExportCSV: (cables: Cable[]) => void;
  onBatchExportPDF?: (cables: Cable[]) => void;
  activeFilterType: string;
  onFilterTypeChange: (type: string) => void;
  selectedCableId: string | null;
}

type SortField = 'code' | 'type' | 'origin' | 'destination' | 'length' | 'gauge';
type SortOrder = 'asc' | 'desc';

export const CableTable: React.FC<CableTableProps> = ({
  cables,
  onEditCable,
  onDuplicateCable,
  onDeleteCable,
  onBatchDelete,
  onBatchExportCSV,
  onBatchExportPDF,
  activeFilterType,
  onFilterTypeChange,
  selectedCableId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter and sort cables
  const filteredCables = useMemo(() => {
    let result = [...cables];

    // Filter by type
    if (activeFilterType) {
      result = result.filter((c) => c.type === activeFilterType);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) =>
        [
          c.code,
          c.type,
          c.origin,
          c.destination,
          c.gauge,
          c.conductors,
          c.voltage,
          c.signal,
          c.spec,
          c.notes,
        ].some((val) => String(val || '').toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'length') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      // Natural sort for cable codes like CAB-001, CAB-002, CAB-010
      if (sortField === 'code') {
        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
          : String(valB).localeCompare(String(valA), undefined, { numeric: true, sensitivity: 'base' });
      }

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return result;
  }, [cables, activeFilterType, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCables.length && filteredCables.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCables.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const isAllSelected = filteredCables.length > 0 && selectedIds.size === filteredCables.length;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
      {/* Header & Search Controls */}
      <div className="p-4 border-b border-slate-200/90 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Cabos Cadastrados
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lista técnica de condutores, roteamento e especificações elétricas
            </p>
          </div>

          {/* Batch Actions Toolbar when items are selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <span className="font-semibold text-slate-700 tabular-nums">
                {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
              </span>
              {onBatchExportPDF && (
                <button
                  type="button"
                  onClick={() => {
                    const selectedCables = cables.filter((c) => selectedIds.has(c.id));
                    onBatchExportPDF(selectedCables);
                  }}
                  className="text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 ml-2"
                  title="Exportar PDF apenas dos cabos selecionados"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Selecionados</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const selectedCables = cables.filter((c) => selectedIds.has(c.id));
                  onBatchExportCSV(selectedCables);
                }}
                className="text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1 ml-1"
                title="Exportar apenas cabos selecionados em CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onBatchDelete(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
                className="text-slate-600 hover:text-rose-700 font-medium flex items-center gap-1 ml-1"
                title="Excluir cabos selecionados"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Input & Type Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar código, origem, destino, bitola, sinal..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs text-slate-900 bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          <div className="relative sm:w-52">
            <select
              value={activeFilterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs text-slate-900 bg-white font-medium"
            >
              <option value="">Todos os Tipos ({cables.length})</option>
              {(Object.keys(CABLE_TYPES) as CableType[]).map((t) => {
                const count = cables.filter((c) => c.type === t).length;
                return (
                  <option key={t} value={t}>
                    {t} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto custom-scrollbar max-h-[580px] overflow-y-auto border-t border-slate-200">
        <table className="w-full border-collapse text-left min-w-[840px]">
          <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs shadow-2xs">
            <tr className="border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider select-none">
              <th className="py-2.5 px-3 w-10 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-slate-500 hover:text-slate-800"
                  title="Selecionar todos os cabos listados"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-sky-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                onClick={() => handleSort('code')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Identificação</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Tipo</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                onClick={() => handleSort('origin')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Origem → Destino (De-Para)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                onClick={() => handleSort('gauge')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Bitola / Condutores</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3">
                <span>Tensão / Sinal / Função</span>
              </th>
              <th 
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                onClick={() => handleSort('length')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Comprimento</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-center w-28">
                <span>Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
            {filteredCables.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="max-w-sm mx-auto space-y-2">
                    <Filter className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600">
                      Nenhum cabo encontrado
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {searchQuery || activeFilterType
                        ? 'Tente ajustar os filtros ou termo de pesquisa.'
                        : 'Comece preenchendo o formulário ao lado para cadastrar seu primeiro circuito.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCables.map((cable) => {
                const typeConfig = CABLE_TYPES[cable.type] || CABLE_TYPES['Outro'];
                const isSelected = selectedIds.has(cable.id);
                const isEditing = selectedCableId === cable.id;

                return (
                  <tr
                    key={cable.id}
                    className={`transition-colors hover:bg-sky-50/40 ${
                      isEditing ? 'bg-amber-50/70 border-l-2 border-l-amber-500' : ''
                    } ${isSelected ? 'bg-sky-50/60' : ''}`}
                  >
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(cable.id)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Identificação com indicador de cor no diagrama */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs border border-white"
                          style={{
                            backgroundColor: cable.lineColor || typeConfig.strokeColor,
                          }}
                          title={
                            cable.lineColor
                              ? `Cor personalizada no diagrama: ${cable.lineColor}`
                              : `Cor padrão do tipo (${cable.type})`
                          }
                        />
                        <span className="font-mono font-bold text-slate-900 tracking-tight">
                          {cable.code}
                        </span>
                      </div>
                      {cable.spec && (
                        <span className="block text-[11px] text-slate-400 truncate max-w-[150px] pl-4" title={cable.spec}>
                          {cable.spec}
                        </span>
                      )}
                    </td>

                    {/* Tipo com badge técnico */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${typeConfig.badgeBg}`}
                      >
                        {cable.type}
                      </span>
                    </td>

                    {/* De - Para */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 shrink-0">De:</span>
                          <span className="truncate max-w-[220px]" title={cable.origin}>
                            {cable.origin}
                          </span>
                        </div>
                        <div className="font-medium text-slate-700 flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 shrink-0">Para:</span>
                          <span className="truncate max-w-[220px]" title={cable.destination}>
                            {cable.destination}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Bitola / Condutores */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-medium text-slate-900">
                        {cable.gauge || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans">
                        {cable.conductors || '—'}
                      </div>
                    </td>

                    {/* Tensão / Sinal */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        {cable.voltage || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]" title={cable.signal}>
                        {cable.signal || '—'}
                      </div>
                    </td>

                    {/* Comprimento */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {Number(cable.length || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-slate-400 text-[11px] ml-1">m</span>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditCable(cable)}
                          className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-100/60 rounded-md transition-colors"
                          title="Editar cabo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateCable(cable)}
                          className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-100/60 rounded-md transition-colors"
                          title="Duplicar cabo (criar cópia com próximo código)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCable(cable.id, cable.code)}
                          className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100/60 rounded-md transition-colors"
                          title="Excluir cabo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary */}
      {filteredCables.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/90 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <span>
            Exibindo <strong className="text-slate-800 tabular-nums">{filteredCables.length}</strong> de{' '}
            <strong className="text-slate-800 tabular-nums">{cables.length}</strong> cabos
          </span>
          <span className="tabular-nums font-mono text-slate-600">
            Subtotal filtrado:{' '}
            <strong className="text-slate-900">
              {filteredCables
                .reduce((s, c) => s + (Number(c.length) || 0), 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{' '}
              m
            </strong>
          </span>
        </div>
      )}
    </div>
  );
};
