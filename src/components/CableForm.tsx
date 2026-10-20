import React, { useState, useEffect } from 'react';
import { Cable, CableType } from '../types';
import { 
  CABLE_TYPES, 
  COMMON_GAUGES, 
  COMMON_CONDUCTORS, 
  COMMON_VOLTAGES,
  PRESET_LINE_COLORS 
} from '../constants/cableTypes';
import { RefreshCw, Save, PlusCircle, X, Palette, Check } from 'lucide-react';

interface CableFormProps {
  editingCable: Cable | null;
  onSaveCable: (cable: Omit<Cable, 'id'>, id?: string) => void;
  onCancelEdit: () => void;
  existingCables: Cable[];
  nextSuggestedCode: string;
}

export const CableForm: React.FC<CableFormProps> = ({
  editingCable,
  onSaveCable,
  onCancelEdit,
  existingCables,
  nextSuggestedCode,
}) => {
  const [code, setCode] = useState('');
  const [type, setType] = useState<CableType>('Potência');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [gauge, setGauge] = useState('');
  const [conductors, setConductors] = useState('');
  const [voltage, setVoltage] = useState('');
  const [signal, setSignal] = useState('');
  const [spec, setSpec] = useState('');
  const [length, setLength] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [lineColor, setLineColor] = useState<string>('');
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extract unique origins and destinations for datalists and quick selection
  const existingOrigins = React.useMemo(() => {
    return Array.from(new Set(existingCables.map((c) => c.origin.trim()).filter(Boolean))).sort();
  }, [existingCables]);

  const existingDestinations = React.useMemo(() => {
    return Array.from(new Set(existingCables.map((c) => c.destination.trim()).filter(Boolean))).sort();
  }, [existingCables]);

  // Sync form when editingCable changes or on initial load
  useEffect(() => {
    if (editingCable) {
      setCode(editingCable.code);
      setType(editingCable.type);
      setOrigin(editingCable.origin);
      setDestination(editingCable.destination);
      setGauge(editingCable.gauge);
      setConductors(editingCable.conductors);
      setVoltage(editingCable.voltage);
      setSignal(editingCable.signal);
      setSpec(editingCable.spec);
      setLength(editingCable.length ? String(editingCable.length) : '');
      setNotes(editingCable.notes);
      setLineColor(editingCable.lineColor || '');
      setLineStyle(editingCable.lineStyle || 'solid');
      setErrorMsg(null);
    } else {
      resetForm();
    }
  }, [editingCable, nextSuggestedCode]);

  const resetForm = () => {
    setCode(nextSuggestedCode);
    setType('Potência');
    setOrigin('');
    setDestination('');
    setGauge('2,5 mm²');
    setConductors('3F + PE');
    setVoltage('380 Vca');
    setSignal('');
    setSpec('');
    setLength('');
    setNotes('');
    setLineColor('');
    setLineStyle('solid');
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent, createNextAfterSave = false) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setErrorMsg('Informe a identificação do cabo (ex.: CAB-001).');
      return;
    }
    if (!origin.trim()) {
      setErrorMsg('Informe o ponto de origem.');
      return;
    }
    if (!destination.trim()) {
      setErrorMsg('Informe o ponto de destino.');
      return;
    }

    // Check duplicate code
    const duplicate = existingCables.find(
      (c) =>
        c.code.trim().toLowerCase() === cleanCode.toLowerCase() &&
        c.id !== editingCable?.id
    );
    if (duplicate) {
      setErrorMsg(`Já existe um cabo com o código "${cleanCode}".`);
      return;
    }

    setErrorMsg(null);

    const cableData: Omit<Cable, 'id'> = {
      code: cleanCode,
      type,
      origin: origin.trim(),
      destination: destination.trim(),
      gauge: gauge.trim(),
      conductors: conductors.trim(),
      voltage: voltage.trim(),
      signal: signal.trim(),
      spec: spec.trim(),
      length: length ? parseFloat(length.replace(',', '.')) || 0 : 0,
      notes: notes.trim(),
      lineColor: lineColor ? lineColor : undefined,
      lineStyle: lineStyle !== 'solid' ? lineStyle : undefined,
      sourcePort: editingCable?.sourcePort,
      targetPort: editingCable?.targetPort,
      updatedAt: new Date().toISOString(),
    };

    onSaveCable(cableData, editingCable?.id);

    if (createNextAfterSave) {
      // Clear destination & length, advance code
      setDestination('');
      setLength('');
      setNotes('');
      // Code will be refreshed by nextSuggestedCode or auto-increment
      const match = cleanCode.match(/^CAB-(\d+)$/i);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        setCode(`CAB-${String(nextNum).padStart(3, '0')}`);
      } else {
        setCode('');
      }
    } else {
      if (editingCable) {
        onCancelEdit();
      } else {
        resetForm();
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>{editingCable ? 'Editar Cabo' : 'Cadastrar Novo Cabo'}</span>
            {editingCable && (
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                {editingCable.code}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {editingCable
              ? 'Atualize os dados técnicos e clique em Salvar.'
              : 'Preencha os dados do circuito elétrico ou de automação.'}
          </p>
        </div>

        {editingCable && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            title="Cancelar edição"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-3.5 text-xs">
        {/* Identificação & Tipo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="code" className="font-semibold text-slate-700">
                Identificação <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setCode(nextSuggestedCode)}
                className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5"
                title="Sugerir próximo código sequencial"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Auto</span>
              </button>
            </div>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex.: CAB-001"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none font-mono font-medium text-slate-900 bg-white"
            />
          </div>

          <div>
            <label htmlFor="type" className="font-semibold text-slate-700 block mb-1">
              Tipo de Circuito <span className="text-rose-500">*</span>
            </label>
            <select
              id="type"
              required
              value={type}
              onChange={(e) => {
                const newType = e.target.value as CableType;
                setType(newType);
                // Smart auto-fill suggestions based on selected type
                if (newType === 'Comunicação' && !gauge) setGauge('Cat6 Industrial');
                if (newType === 'Instrumentação' && !gauge) setGauge('0,75 mm²');
                if (newType === 'Aterramento' && !gauge) setGauge('16 mm²');
              }}
              className="w-full px-2 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white font-medium text-slate-900"
            >
              {(Object.keys(CABLE_TYPES) as CableType[]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Origem e Destino com Auto-complete e Datalists */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="origin" className="font-semibold text-slate-700 block mb-1">
              Origem (Painel / Borne) <span className="text-rose-500">*</span>
            </label>
            <input
              id="origin"
              type="text"
              required
              list="origins-datalist"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Ex.: QD-01 / borne X1"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white text-slate-900"
            />
            <datalist id="origins-datalist">
              {existingOrigins.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            {existingOrigins.length > 0 && !origin && (
              <div className="flex gap-1 flex-wrap mt-1">
                {existingOrigins.slice(0, 3).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrigin(o)}
                    className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1 py-0.5 rounded cursor-pointer truncate max-w-[110px]"
                    title={`Usar ${o}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="destination" className="font-semibold text-slate-700 block mb-1">
              Destino (Carga / Sensor) <span className="text-rose-500">*</span>
            </label>
            <input
              id="destination"
              type="text"
              required
              list="destinations-datalist"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex.: Motor Bomba B-01"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white text-slate-900"
            />
            <datalist id="destinations-datalist">
              {existingDestinations.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            {existingDestinations.length > 0 && !destination && (
              <div className="flex gap-1 flex-wrap mt-1">
                {existingDestinations.slice(0, 3).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDestination(d)}
                    className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1 py-0.5 rounded cursor-pointer truncate max-w-[110px]"
                    title={`Usar ${d}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bitola e Condutores */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="gauge" className="font-semibold text-slate-700 block mb-1">
              Bitola / Seção
            </label>
            <input
              id="gauge"
              type="text"
              value={gauge}
              onChange={(e) => setGauge(e.target.value)}
              placeholder="Ex.: 2,5 mm²"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white text-slate-900"
            />
            {/* Quick chips for gauge */}
            <div className="flex gap-1 flex-wrap mt-1">
              {['1,5 mm²', '2,5 mm²', '4 mm²', '10 mm²'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGauge(g)}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="conductors" className="font-semibold text-slate-700 block mb-1">
              Condutores / Vias
            </label>
            <input
              id="conductors"
              type="text"
              value={conductors}
              onChange={(e) => setConductors(e.target.value)}
              placeholder="Ex.: 3F+PE / 4 x 1,5"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white text-slate-900"
            />
            <div className="flex gap-1 flex-wrap mt-1">
              {['3F + PE', '3F+N+PE', '4 x 1,5', '1P x 0,75'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConductors(c)}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tensão e Sinal */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="voltage" className="font-semibold text-slate-700 block mb-1">
              Tensão Nominal
            </label>
            <input
              id="voltage"
              type="text"
              value={voltage}
              onChange={(e) => setVoltage(e.target.value)}
              placeholder="Ex.: 24 Vcc / 380 Vca"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="signal" className="font-semibold text-slate-700 block mb-1">
              Sinal / Função
            </label>
            <input
              id="signal"
              type="text"
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              placeholder="Ex.: DI1, 4–20 mA, Motor"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white text-slate-900"
            />
          </div>
        </div>

        {/* Especificação e Comprimento */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="spec" className="font-semibold text-slate-700 block mb-1">
              Especificação Técnica
            </label>
            <input
              id="spec"
              type="text"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="Ex.: Blindado, PP flexível"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="length" className="font-semibold text-slate-700 block mb-1">
              Comprimento (metros)
            </label>
            <input
              id="length"
              type="number"
              step="0.01"
              min="0"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="0,00"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none font-mono bg-white text-slate-900"
            />
          </div>
        </div>

        {/* Cor e Estilo da Linha no Diagrama Esquemático */}
        <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
              <Palette className="w-3.5 h-3.5 text-sky-600" />
              <span>Cor da Linha no Diagrama</span>
            </label>
            <span className="text-[10px] text-slate-400">Opcional</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Botão Padrão do Tipo */}
            <button
              type="button"
              onClick={() => setLineColor('')}
              className={`px-2 py-1 rounded border text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                !lineColor
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Usa a cor padrão do tipo do circuito"
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/50"
                style={{ backgroundColor: (CABLE_TYPES[type] || CABLE_TYPES['Outro']).strokeColor }}
              />
              <span>Padrão do Tipo</span>
            </button>

            {/* Chips de Cores Predefinidas */}
            {PRESET_LINE_COLORS.map((preset) => {
              const isSelected = lineColor.toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setLineColor(preset.color)}
                  className={`w-5 h-5 rounded-full transition-transform relative flex items-center justify-center cursor-pointer ${
                    isSelected ? 'ring-2 ring-offset-1 ring-sky-500 scale-110 shadow-xs' : 'hover:scale-110 opacity-90 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: preset.color }}
                  title={`${preset.label} - ${preset.description}`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </button>
              );
            })}

            {/* Cor Livre */}
            <label
              className="flex items-center gap-1 text-[11px] font-medium text-slate-600 px-1.5 py-0.5 rounded border border-dashed border-slate-300 hover:border-slate-400 cursor-pointer bg-white"
              title="Escolher cor personalizada livre"
            >
              <input
                type="color"
                value={lineColor || (CABLE_TYPES[type] || CABLE_TYPES['Outro']).strokeColor}
                onChange={(e) => setLineColor(e.target.value)}
                className="w-4 h-4 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-[10px]">Livre</span>
            </label>
          </div>

          {/* Estilo da Linha */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
            <span className="text-slate-600 font-medium">Estilo do Traço:</span>
            {(['solid', 'dashed', 'dotted'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setLineStyle(st)}
                className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
                  lineStyle === st
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'solid' && '— Sólida'}
                {st === 'dashed' && '- - Tracejada'}
                {st === 'dotted' && '··· Pontilhada'}
              </button>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div>
          <label htmlFor="notes" className="font-semibold text-slate-700 block mb-1">
            Observações / Rota / Eletrocalha
          </label>
          <textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: Passagem por leito elétrico setor B, aterrar blindagem no painel."
            className="w-full px-2.5 py-1.5 rounded-md border border-slate-350 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none resize-y bg-white text-slate-900"
          />
        </div>

        {/* Form Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{editingCable ? 'Atualizar Cabo' : 'Salvar Cabo'}</span>
          </button>

          {!editingCable && (
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              title="Salvar este cabo e preparar o próximo código"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Salvar + Próximo</span>
            </button>
          )}

          <button
            type="button"
            onClick={editingCable ? onCancelEdit : resetForm}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-3 rounded-lg transition-colors text-center"
          >
            {editingCable ? 'Cancelar' : 'Limpar'}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center pt-1">
          Dados salvos localmente de forma contínua no navegador.
        </p>
      </form>
    </div>
  );
};
