import React, { useState, useRef } from 'react';
import { Upload, FileJson, AlertTriangle, X, Check } from 'lucide-react';
import { ProjectData } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (data: ProjectData) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
}) => {
  const [parsedData, setParsedData] = useState<ProjectData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        if (!Array.isArray(json.cables)) {
          throw new Error('O arquivo não contém uma lista válida de cabos ("cables").');
        }

        const project: ProjectData = {
          projectName: json.projectName || '',
          projectCode: json.projectCode || '',
          author: json.author || '',
          company: json.company || '',
          cables: json.cables.map((c: any, idx: number) => ({
            id: c.id ? String(c.id) : `imported-${idx}-${Date.now()}`,
            code: String(c.code || `CAB-${String(idx + 1).padStart(3, '0')}`),
            type: c.type || 'Potência',
            origin: String(c.origin || ''),
            destination: String(c.destination || ''),
            gauge: String(c.gauge || ''),
            conductors: String(c.conductors || ''),
            voltage: String(c.voltage || ''),
            signal: String(c.signal || ''),
            spec: String(c.spec || ''),
            length: Number(c.length) || 0,
            notes: String(c.notes || ''),
            updatedAt: c.updatedAt || new Date().toISOString(),
          })),
          updatedAt: new Date().toISOString(),
        };

        setParsedData(project);
      } catch (err: any) {
        setErrorMsg(err.message || 'Arquivo JSON inválido.');
        setParsedData(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Falha ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (!parsedData) return;
    onConfirmImport(parsedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Restaurar Backup</h3>
              <p className="text-xs text-slate-500">Importe um arquivo JSON salvo anteriormente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-sky-50/20"
          >
            <FileJson className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="font-semibold text-slate-700">
              Clique para selecionar o arquivo .json
            </p>
            <p className="text-slate-400 text-[11px] mt-1">
              {fileName || 'Backup compatível com Cadastro de Cabos'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedData && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Check className="w-4 h-4" />
                <span>Arquivo reconhecido com sucesso</span>
              </div>
              <div className="text-slate-600 pl-5 space-y-0.5">
                <div>
                  Projeto: <strong>{parsedData.projectName || '(Sem nome)'}</strong>
                </div>
                <div>
                  Total de cabos:{' '}
                  <strong className="font-mono">{parsedData.cables.length}</strong> circuitos
                </div>
                <div>
                  Metragem:{' '}
                  <strong className="font-mono">
                    {parsedData.cables
                      .reduce((s, c) => s + (Number(c.length) || 0), 0)
                      .toFixed(1)}{' '}
                    m
                  </strong>
                </div>
              </div>
              <p className="text-[11px] text-amber-700 mt-2 pl-5">
                Atenção: A restauração substituirá os dados atuais do navegador.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!parsedData}
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            Restaurar Dados
          </button>
        </div>
      </div>
    </div>
  );
};
