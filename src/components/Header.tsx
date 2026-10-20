import React, { useRef } from 'react';
import { 
  Cable as CableIcon, 
  Plus, 
  Download, 
  Upload, 
  Printer, 
  Trash2, 
  FileSpreadsheet, 
  FileJson,
  FileText,
  Layers,
  Sparkles
} from 'lucide-react';
import { ProjectData } from '../types';

interface HeaderProps {
  project: ProjectData;
  onUpdateProjectInfo: (fields: Partial<ProjectData>) => void;
  onNewCable: () => void;
  onExportPDF: () => void;
  onExportDiagramPDF?: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onExportDiagramSVG?: () => void;
  onOpenImport: () => void;
  onPrint: () => void;
  onClearAll: () => void;
  onLoadSample: () => void;
  activeView: 'list' | 'diagram';
  onChangeView: (view: 'list' | 'diagram') => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onUpdateProjectInfo,
  onNewCable,
  onExportPDF,
  onExportDiagramPDF,
  onExportCSV,
  onExportJSON,
  onExportDiagramSVG,
  onOpenImport,
  onPrint,
  onClearAll,
  onLoadSample,
  activeView,
  onChangeView,
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-md sticky top-0 z-30 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-3.5 flex-wrap md:flex-nowrap">
          {/* Zone 1: Termoprol Brand & Industrial Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white px-2.5 py-1 rounded-lg flex items-center shadow-xs border border-white/20 transition-transform hover:scale-[1.02]">
              <img
                src="/termoprol-logo.png"
                alt="Termoprol - Tecnologia em refrigeração"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                  Cadastro de Cabos
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                  v1.2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Engenharia Elétrica & Automação Industrial
              </p>
            </div>
          </div>

          {/* Zone 2: Project Metadata Input */}
          <div className="flex items-center gap-2 flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <input
                type="text"
                value={project.projectName}
                onChange={(e) => onUpdateProjectInfo({ projectName: e.target.value })}
                placeholder="Nome do projeto (ex.: Linha de Envase 02)"
                className="w-full bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-850 text-white text-sm px-3 py-1.5 rounded-md border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-all placeholder:text-slate-500"
                title="Nome do Projeto Atual"
              />
            </div>
          </div>

          {/* Zone 3: Navigation Views & Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-medium">
              <button
                type="button"
                onClick={() => onChangeView('list')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeView === 'list'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>Tabela & Cadastro</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeView('diagram')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeView === 'diagram'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Diagrama Esquemático</span>
              </button>
            </div>

            {/* Primary Action: New Cable */}
            <button
              type="button"
              onClick={onNewCable}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-3.5 py-1.5 rounded-md text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="whitespace-nowrap">Novo Cabo</span>
            </button>

            {/* Direct PDF Export Action */}
            <button
              type="button"
              onClick={onExportPDF}
              className="bg-rose-700 hover:bg-rose-600 text-white font-medium px-3 py-1.5 rounded-md text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-colors"
              title="Exportar documento completo em PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar PDF</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-md text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
                title="Mais opções de exportação"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Exportar</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportPDF();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-rose-300 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-rose-400" />
                    <span>Exportar Documento PDF (Completo)</span>
                  </button>
                  {onExportDiagramPDF && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        onExportDiagramPDF();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-rose-300 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-rose-300" />
                      <span>PDF do Diagrama (Folha Técnica A4)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportCSV();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-emerald-300 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Exportar CSV / Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportJSON();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-amber-300 flex items-center gap-2"
                  >
                    <FileJson className="w-4 h-4 text-amber-400" />
                    <span>Backup Completo (JSON)</span>
                  </button>
                  {onExportDiagramSVG && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        onExportDiagramSVG();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-indigo-300 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-indigo-400" />
                      <span>Desenho do Diagrama (.SVG)</span>
                    </button>
                  )}
                  <div className="border-t border-slate-800 my-1"></div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onPrint();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-sky-300 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4 text-sky-400" />
                    <span>Imprimir Lista (Ctrl+P)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Import Button */}
            <button
              type="button"
              onClick={onOpenImport}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
              title="Restaurar backup JSON"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Restaurar</span>
            </button>

            {/* Clear All / Sample Actions */}
            {project.cables.length === 0 ? (
              <button
                type="button"
                onClick={onLoadSample}
                className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors"
                title="Carregar projeto industrial exemplo com cabos de potência, comando, sinal e rede"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Carregar Exemplo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClearAll}
                className="bg-slate-800 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-900/60 px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors"
                title="Apagar todos os registros do projeto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
