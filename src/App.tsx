import React, { useState, useEffect, useCallback } from 'react';
import { Cable, ProjectData } from './types';
import { SAMPLE_CABLES } from './constants/cableTypes';
import { 
  loadProject, 
  saveProject, 
  generateNextCode, 
  exportToCSV, 
  exportToJSON 
} from './utils/storage';
import { exportProjectToPDF, exportDiagramOnlyToPDF } from './utils/pdfExport';
import { Header, AppViewMode } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { CableForm } from './components/CableForm';
import { CableTable } from './components/CableTable';
import { SchematicDiagram } from './components/SchematicDiagram';
import { ImportModal } from './components/ImportModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PrintReport } from './components/PrintReport';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<ProjectData>(() => loadProject());
  const [editingCable, setEditingCable] = useState<Cable | null>(null);
  const [activeView, setActiveView] = useState<AppViewMode>('workstation');
  const [activeFilterType, setActiveFilterType] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // Save changes to localStorage
  const updateProject = useCallback((updater: (prev: ProjectData) => ProjectData) => {
    setProject((prev) => {
      const next = updater(prev);
      saveProject(next);
      return next;
    });
  }, []);

  // Next suggested cable code
  const nextSuggestedCode = generateNextCode(project.cables);

  // Handlers
  const handleUpdateProjectInfo = (fields: Partial<ProjectData>) => {
    updateProject((prev) => ({
      ...prev,
      ...fields,
    }));
  };

  const handleSaveCable = (cableData: Omit<Cable, 'id'>, id?: string) => {
    updateProject((prev) => {
      if (id) {
        // Edit existing
        const updated = prev.cables.map((c) =>
          c.id === id ? { ...cableData, id, updatedAt: new Date().toISOString() } : c
        );
        showToast(`Cabo ${cableData.code} atualizado com sucesso.`);
        return { ...prev, cables: updated };
      } else {
        // Create new
        const newCable: Cable = {
          ...cableData,
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        showToast(`Cabo ${cableData.code} cadastrado com sucesso.`);
        return { ...prev, cables: [...prev.cables, newCable] };
      }
    });
    setEditingCable(null);
  };

  const handleDeleteCable = (id: string, code: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Cabo',
      message: `Tem certeza que deseja excluir o cabo "${code}"? Esta ação removerá o circuito da lista e do diagrama.`,
      onConfirm: () => {
        updateProject((prev) => ({
          ...prev,
          cables: prev.cables.filter((c) => c.id !== id),
        }));
        if (editingCable?.id === id) {
          setEditingCable(null);
        }
        showToast(`Cabo ${code} excluído.`);
      },
    });
  };

  const handleDuplicateCable = (cable: Cable) => {
    const newCode = generateNextCode(project.cables);
    const newCable: Cable = {
      ...cable,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      code: newCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateProject((prev) => ({
      ...prev,
      cables: [...prev.cables, newCable],
    }));
    showToast(`Cabo ${cable.code} duplicado como ${newCode}.`);
  };

  const handleBatchDelete = (ids: string[]) => {
    setConfirmDialog({
      isOpen: true,
      title: `Excluir ${ids.length} Cabos Selecionados`,
      message: `Tem certeza que deseja excluir os ${ids.length} circuitos selecionados?`,
      onConfirm: () => {
        const idSet = new Set(ids);
        updateProject((prev) => ({
          ...prev,
          cables: prev.cables.filter((c) => !idSet.has(c.id)),
        }));
        if (editingCable && idSet.has(editingCable.id)) {
          setEditingCable(null);
        }
        showToast(`${ids.length} cabos excluídos com sucesso.`);
      },
    });
  };

  const handleBatchExportCSV = (selectedCables: Cable[]) => {
    exportToCSV(selectedCables, `${project.projectName || 'cabos'}_selecionados`);
    showToast(`${selectedCables.length} cabos exportados para CSV.`);
  };

  const handleBatchExportPDF = (selectedCables: Cable[]) => {
    try {
      exportProjectToPDF({
        ...project,
        projectName: `${project.projectName || 'Cabos'} - Seleção`,
        cables: selectedCables,
      });
      showToast(`${selectedCables.length} cabos selecionados exportados para PDF!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar PDF.', 'info');
    }
  };

  const handleExportPDF = () => {
    if (project.cables.length === 0) {
      showToast('Cadastre ao menos um cabo antes de exportar o PDF.', 'info');
      return;
    }
    try {
      exportProjectToPDF(project);
      showToast('Documento PDF completo gerado e baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      showToast('Erro ao exportar PDF. Tente a opção de impressão.', 'info');
    }
  };

  const handleExportDiagramOnly = () => {
    if (project.cables.length === 0) {
      showToast('Cadastre ao menos um cabo antes de exportar o diagrama.', 'info');
      return;
    }
    try {
      exportDiagramOnlyToPDF(project);
      showToast('PDF exclusivo do Diagrama Esquemático gerado em alta resolução!');
    } catch (err) {
      console.error('Erro ao gerar PDF do diagrama:', err);
      showToast('Erro ao exportar o PDF do diagrama.', 'info');
    }
  };

  const handleCableColorChange = (cableId: string, color: string | undefined) => {
    updateProject((prev) => ({
      ...prev,
      cables: prev.cables.map((c) => (c.id === cableId ? { ...c, lineColor: color } : c)),
    }));
  };

  const handleCableLineStyleChange = (cableId: string, lineStyle: 'solid' | 'dashed' | 'dotted') => {
    updateProject((prev) => ({
      ...prev,
      cables: prev.cables.map((c) => (c.id === cableId ? { ...c, lineStyle } : c)),
    }));
  };

  const handleExportCSV = () => {
    if (project.cables.length === 0) {
      showToast('Cadastre ao menos um cabo antes de exportar.', 'info');
      return;
    }
    exportToCSV(project.cables, project.projectName);
    showToast('Planilha CSV exportada com formatação Excel (PT-BR).');
  };

  const handleExportJSON = () => {
    exportToJSON(project);
    showToast('Backup completo em JSON gerado para download.');
  };

  const handleConfirmImport = (data: ProjectData) => {
    updateProject(() => data);
    setEditingCable(null);
    showToast(`Backup restaurado! ${data.cables.length} circuitos carregados.`);
  };

  const handleClearAll = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Apagar Todos os Cabos',
      message: 'Atenção: Esta ação apagará permanentemente todos os circuitos e configurações deste projeto no seu navegador. Recomendamos exportar um backup antes.',
      onConfirm: () => {
        updateProject((prev) => ({
          ...prev,
          cables: [],
        }));
        setEditingCable(null);
        showToast('Todos os cabos foram apagados do projeto.');
      },
    });
  };

  const handleLoadSample = () => {
    updateProject((prev) => ({
      ...prev,
      projectName: prev.projectName || 'Painel CCM-01 & Automação Industrial',
      cables: SAMPLE_CABLES,
    }));
    showToast('Projeto industrial de exemplo carregado!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        project={project}
        onUpdateProjectInfo={handleUpdateProjectInfo}
        onNewCable={() => {
          setEditingCable(null);
          if (activeView === 'diagram') {
            setActiveView('workstation');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onExportPDF={handleExportPDF}
        onExportDiagramPDF={handleExportDiagramOnly}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onOpenImport={() => setIsImportModalOpen(true)}
        onPrint={handlePrint}
        onClearAll={handleClearAll}
        onLoadSample={handleLoadSample}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      {/* Main Workspace Container - Desktop Computer Screen Optimized */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-6 2xl:px-8 py-4 sm:py-6 no-print">
        {/* Statistics Bar */}
        <StatsBar
          cables={project.cables}
          activeTypeFilter={activeFilterType}
          onSelectTypeFilter={setActiveFilterType}
        />

        {/* View 1: Modo Computador (Estação de Trabalho Dividida Lado a Lado) */}
        {activeView === 'workstation' && (
          <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] xl:grid-cols-[520px_1fr] 2xl:grid-cols-[580px_1fr] gap-6 items-start">
            {/* Left Column: Form & Table */}
            <div className="space-y-6">
              <CableForm
                editingCable={editingCable}
                onSaveCable={handleSaveCable}
                onCancelEdit={() => setEditingCable(null)}
                existingCables={project.cables}
                nextSuggestedCode={nextSuggestedCode}
              />

              <CableTable
                cables={project.cables}
                onEditCable={(cable) => {
                  setEditingCable(cable);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDuplicateCable={handleDuplicateCable}
                onDeleteCable={handleDeleteCable}
                onBatchDelete={handleBatchDelete}
                onBatchExportCSV={handleBatchExportCSV}
                onBatchExportPDF={handleBatchExportPDF}
                activeFilterType={activeFilterType}
                onFilterTypeChange={setActiveFilterType}
                selectedCableId={editingCable?.id || null}
              />
            </div>

            {/* Right Column: Live Schematic Diagram perfectly fitted to screen */}
            <div className="lg:sticky lg:top-20">
              <SchematicDiagram
                cables={project.cables}
                onEditCable={(cable) => {
                  setEditingCable(cable);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                activeFilterType={activeFilterType}
                defaultShape={project.defaultShape || 'rounded-rect'}
                nodeShapes={project.nodeShapes || {}}
                symbolScale={project.symbolScale || 0.85}
                nodeScales={project.nodeScales || {}}
                nodePositions={project.nodePositions || {}}
                projectName={project.projectName}
                isFullPage={true}
                onChangeDefaultShape={(shape) =>
                  updateProject((prev) => ({ ...prev, defaultShape: shape }))
                }
                onChangeNodeShape={(nodeName, shape) =>
                  updateProject((prev) => ({
                    ...prev,
                    nodeShapes: { ...(prev.nodeShapes || {}), [nodeName]: shape },
                  }))
                }
                onChangeSymbolScale={(scale) =>
                  updateProject((prev) => ({ ...prev, symbolScale: scale }))
                }
                onChangeNodeScale={(nodeName, scale) =>
                  updateProject((prev) => ({
                    ...prev,
                    nodeScales: { ...(prev.nodeScales || {}), [nodeName]: scale },
                  }))
                }
                onChangeNodePositions={(positions) =>
                  updateProject((prev) => ({
                    ...prev,
                    nodePositions: positions,
                  }))
                }
                onChangeCablePorts={(cableId, sourcePort, targetPort) =>
                  updateProject((prev) => ({
                    ...prev,
                    cables: prev.cables.map((c) =>
                      c.id === cableId ? { ...c, sourcePort, targetPort } : c
                    ),
                  }))
                }
                onChangeCableColor={handleCableColorChange}
                onChangeCableLineStyle={handleCableLineStyleChange}
                onExportDiagramPDF={handleExportDiagramOnly}
              />
            </div>
          </div>
        )}

        {/* View 2: Table & Form (Visualização Clássica de Lista) */}
        {activeView === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr] gap-6 items-start">
            {/* Form Column */}
            <div className="lg:sticky lg:top-20">
              <CableForm
                editingCable={editingCable}
                onSaveCable={handleSaveCable}
                onCancelEdit={() => setEditingCable(null)}
                existingCables={project.cables}
                nextSuggestedCode={nextSuggestedCode}
              />
            </div>

            {/* Table & Diagram Preview Column */}
            <div className="space-y-6">
              <CableTable
                cables={project.cables}
                onEditCable={(cable) => {
                  setEditingCable(cable);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDuplicateCable={handleDuplicateCable}
                onDeleteCable={handleDeleteCable}
                onBatchDelete={handleBatchDelete}
                onBatchExportCSV={handleBatchExportCSV}
                onBatchExportPDF={handleBatchExportPDF}
                activeFilterType={activeFilterType}
                onFilterTypeChange={setActiveFilterType}
                selectedCableId={editingCable?.id || null}
              />

              {/* Schematic Diagram Preview directly in list view */}
              <SchematicDiagram
                cables={project.cables}
                onEditCable={(cable) => {
                  setEditingCable(cable);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                activeFilterType={activeFilterType}
                defaultShape={project.defaultShape || 'rounded-rect'}
                nodeShapes={project.nodeShapes || {}}
                symbolScale={project.symbolScale || 0.85}
                nodeScales={project.nodeScales || {}}
                nodePositions={project.nodePositions || {}}
                projectName={project.projectName}
                isFullPage={false}
                onChangeDefaultShape={(shape) =>
                  updateProject((prev) => ({ ...prev, defaultShape: shape }))
                }
                onChangeNodeShape={(nodeName, shape) =>
                  updateProject((prev) => ({
                    ...prev,
                    nodeShapes: { ...(prev.nodeShapes || {}), [nodeName]: shape },
                  }))
                }
                onChangeSymbolScale={(scale) =>
                  updateProject((prev) => ({ ...prev, symbolScale: scale }))
                }
                onChangeNodeScale={(nodeName, scale) =>
                  updateProject((prev) => ({
                    ...prev,
                    nodeScales: { ...(prev.nodeScales || {}), [nodeName]: scale },
                  }))
                }
                onChangeNodePositions={(positions) =>
                  updateProject((prev) => ({
                    ...prev,
                    nodePositions: positions,
                  }))
                }
                onChangeCablePorts={(cableId, sourcePort, targetPort) =>
                  updateProject((prev) => ({
                    ...prev,
                    cables: prev.cables.map((c) =>
                      c.id === cableId ? { ...c, sourcePort, targetPort } : c
                    ),
                  }))
                }
                onChangeCableColor={handleCableColorChange}
                onChangeCableLineStyle={handleCableLineStyleChange}
                onExportDiagramPDF={handleExportDiagramOnly}
              />
            </div>
          </div>
        )}

        {/* View 3: Full Diagram Mode (Tela Cheia) */}
        {activeView === 'diagram' && (
          <div className="space-y-4">
            <SchematicDiagram
              cables={project.cables}
              onEditCable={(cable) => {
                setEditingCable(cable);
                setActiveView('workstation');
              }}
              activeFilterType={activeFilterType}
              defaultShape={project.defaultShape || 'rounded-rect'}
              nodeShapes={project.nodeShapes || {}}
              symbolScale={project.symbolScale || 0.85}
              nodeScales={project.nodeScales || {}}
              nodePositions={project.nodePositions || {}}
              projectName={project.projectName}
              isFullPage={true}
              onChangeDefaultShape={(shape) =>
                updateProject((prev) => ({ ...prev, defaultShape: shape }))
              }
              onChangeNodeShape={(nodeName, shape) =>
                updateProject((prev) => ({
                  ...prev,
                  nodeShapes: { ...(prev.nodeShapes || {}), [nodeName]: shape },
                }))
              }
              onChangeSymbolScale={(scale) =>
                updateProject((prev) => ({ ...prev, symbolScale: scale }))
              }
              onChangeNodeScale={(nodeName, scale) =>
                updateProject((prev) => ({
                  ...prev,
                  nodeScales: { ...(prev.nodeScales || {}), [nodeName]: scale },
                }))
              }
              onChangeNodePositions={(positions) =>
                updateProject((prev) => ({
                  ...prev,
                  nodePositions: positions,
                }))
              }
              onChangeCablePorts={(cableId, sourcePort, targetPort) =>
                updateProject((prev) => ({
                  ...prev,
                  cables: prev.cables.map((c) =>
                    c.id === cableId ? { ...c, sourcePort, targetPort } : c
                  ),
                }))
              }
              onChangeCableColor={handleCableColorChange}
              onChangeCableLineStyle={handleCableLineStyleChange}
              onExportDiagramPDF={handleExportDiagramOnly}
            />
          </div>
        )}
      </main>

      {/* Engineering Footer */}
      <footer className="mt-auto py-5 border-t border-slate-200/90 text-center text-xs text-slate-500 bg-white no-print">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 2xl:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Cadastro de Cabos • Sistema Técnico de Fiação & Automação Termoprol</span>
          <span className="text-[11px] text-slate-400">
            Armazenamento contínuo local • Exporte backups regularmente
          </span>
        </div>
      </footer>

      {/* Hidden Print Report for window.print() */}
      <PrintReport project={project} />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleConfirmImport}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
