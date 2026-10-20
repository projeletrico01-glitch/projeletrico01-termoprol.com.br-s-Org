import React from 'react';
import { ProjectData } from '../types';
import { CABLE_TYPES } from '../constants/cableTypes';
import { computeDiagramLayout } from '../utils/diagramLayout';

interface PrintReportProps {
  project: ProjectData;
}

export const PrintReport: React.FC<PrintReportProps> = ({ project }) => {
  const totalLength = project.cables.reduce(
    (sum, c) => sum + (Number(c.length) || 0),
    0
  );

  const layout = React.useMemo(() => {
    if (project.cables.length === 0) return null;
    return computeDiagramLayout(project.cables, {
      defaultShape: project.defaultShape,
      nodeShapes: project.nodeShapes,
      symbolScale: project.symbolScale || 0.85,
      nodeScales: project.nodeScales,
      nodePositions: project.nodePositions,
    });
  }, [project]);

  return (
    <div className="hidden print:block p-4 bg-white text-slate-900 font-sans">
      {/* ==========================================
          FOLHA 1: TABELA TÉCNICA DE CABOS
      ========================================== */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-end">
        <div className="flex items-center gap-4">
          <img
            src="/termoprol-logo.png"
            alt="Termoprol - Tecnologia em refrigeração"
            className="h-10 w-auto object-contain"
          />
          <div className="border-l-2 border-slate-300 pl-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-950">
              CADASTRO TÉCNICO DE CABOS & FIAÇÃO
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              PROJETO: <strong>{project.projectName || 'Sem identificação'}</strong>
            </p>
          </div>
        </div>
        <div className="text-right text-[10px] text-slate-600 space-y-0.5 font-mono">
          <div>DATA: {new Date().toLocaleDateString('pt-BR')}</div>
          <div>TOTAL DE CIRCUITOS: {project.cables.length}</div>
          <div>METRAGEM TOTAL: {totalLength.toFixed(2)} m</div>
        </div>
      </div>

      {/* Summary table */}
      <table className="w-full text-[10px] border border-slate-300 mb-4 print-table">
        <thead>
          <tr className="bg-slate-100 font-bold">
            <th className="p-1 border border-slate-300">Item</th>
            <th className="p-1 border border-slate-300">Identificação</th>
            <th className="p-1 border border-slate-300">Tipo</th>
            <th className="p-1 border border-slate-300">Origem (De)</th>
            <th className="p-1 border border-slate-300">Destino (Para)</th>
            <th className="p-1 border border-slate-300">Bitola</th>
            <th className="p-1 border border-slate-300">Condutores</th>
            <th className="p-1 border border-slate-300">Tensão / Função</th>
            <th className="p-1 border border-slate-300 text-right">Comprimento</th>
            <th className="p-1 border border-slate-300">Especificação / Obs.</th>
          </tr>
        </thead>
        <tbody>
          {project.cables.map((c, idx) => (
            <tr key={c.id} className="border-b border-slate-200">
              <td className="p-1 text-center font-mono border border-slate-300">
                {idx + 1}
              </td>
              <td className="p-1 font-bold font-mono border border-slate-300">
                {c.code}
              </td>
              <td className="p-1 border border-slate-300">{c.type}</td>
              <td className="p-1 border border-slate-300">{c.origin}</td>
              <td className="p-1 border border-slate-300">{c.destination}</td>
              <td className="p-1 font-mono border border-slate-300">
                {c.gauge || '—'}
              </td>
              <td className="p-1 border border-slate-300">
                {c.conductors || '—'}
              </td>
              <td className="p-1 border border-slate-300">
                {c.voltage ? `${c.voltage} · ` : ''}
                {c.signal || '—'}
              </td>
              <td className="p-1 font-mono text-right border border-slate-300">
                {Number(c.length || 0).toFixed(2)} m
              </td>
              <td className="p-1 text-[9px] border border-slate-300">
                {c.spec ? `${c.spec}. ` : ''}
                {c.notes || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signature block */}
      <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-[10px] text-center">
        <div>
          <div className="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
          <span>Responsável Técnico / Engenharia</span>
        </div>
        <div>
          <div className="border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
          <span>Aprovação / Fiscalização de Obra</span>
        </div>
      </div>

      {/* ==========================================
          FOLHA 2: DIAGRAMA ESQUEMÁTICO VETORIAL DE INTERLIGAÇÃO
      ========================================== */}
      {project.cables.length > 0 && layout && (
        <div style={{ pageBreakBefore: 'always' }} className="pt-4">
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-end">
            <div className="flex items-center gap-4">
              <img
                src="/termoprol-logo.png"
                alt="Termoprol - Tecnologia em refrigeração"
                className="h-9 w-auto object-contain"
              />
              <div className="border-l-2 border-slate-300 pl-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-950">
                  DIAGRAMA ESQUEMÁTICO DE INTERLIGAÇÃO & FIAÇÃO
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  PROJETO: <strong>{project.projectName || 'Sem identificação'}</strong>
                </p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-600 space-y-0.5 font-mono">
              <div>FOLHA: 02 / DIAGRAMA ESQUEMÁTICO</div>
              <div>DATA: {new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          {/* High-Resolution Printable SVG Diagram */}
          <div className="border-2 border-slate-800 rounded-md p-3 mb-4 bg-white">
            {(() => {
              const margin = 20;
              const viewBox = `${layout.bounds.minX - margin} ${layout.bounds.minY - margin} ${
                layout.bounds.width + margin * 2
              } ${layout.bounds.height + margin * 2}`;

              return (
                <svg
                  viewBox={viewBox}
                  className="w-full max-h-[440px]"
                  style={{ display: 'block' }}
                >
                  {/* Grid pattern */}
                  <defs>
                    <pattern id="print-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect
                    x={layout.bounds.minX - margin}
                    y={layout.bounds.minY - margin}
                    width={layout.bounds.width + margin * 2}
                    height={layout.bounds.height + margin * 2}
                    fill="url(#print-grid)"
                  />

                  {/* Wire Routes */}
                  {layout.wireRoutes.map(({ cable, route }) => {
                    const typeCfg = CABLE_TYPES[cable.type] || CABLE_TYPES['Outro'];
                    const wireColor = cable.lineColor || typeCfg.strokeColor;
                    const arrowId = `print-arrow-${cable.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

                    let strokeDash: string | undefined = undefined;
                    if (cable.lineStyle === 'dashed' || (!cable.lineStyle && cable.type === 'Comunicação')) {
                      strokeDash = '5 4';
                    } else if (cable.lineStyle === 'dotted') {
                      strokeDash = '2 3';
                    }

                    return (
                      <g key={cable.id}>
                        <defs>
                          <marker
                            id={arrowId}
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={wireColor} />
                          </marker>
                        </defs>
                        <path
                          d={route.pathData}
                          fill="none"
                          stroke={wireColor}
                          strokeWidth="2"
                          strokeDasharray={strokeDash}
                          markerEnd={`url(#${arrowId})`}
                        />
                        {(() => {
                          const badge = route.badge || {
                            x: route.midPoint.x,
                            y: route.midPoint.y,
                            width: 56,
                            height: 16,
                            fontSize: 8,
                          };
                          return (
                            <g transform={`translate(${badge.x}, ${badge.y})`}>
                              <rect
                                x={-badge.width / 2}
                                y={-badge.height / 2}
                                width={badge.width}
                                height={badge.height}
                                rx="3.5"
                                fill="#ffffff"
                                stroke={wireColor}
                                strokeWidth="1.2"
                              />
                              <text
                                x="0"
                                y="3"
                                textAnchor="middle"
                                fontSize={badge.fontSize}
                                fontFamily="JetBrains Mono, monospace"
                                fontWeight="bold"
                                fill="#0f172a"
                              >
                                {cable.code}
                              </text>
                            </g>
                          );
                        })()}
                      </g>
                    );
                  })}

                  {/* Nodes with custom geometric shapes */}
                  {layout.nodes.map((n) => {
                    const w = n.width;
                    const h = n.height;

                    return (
                      <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                        {n.shape === 'circle' || n.shape === 'capsule' ? (
                          <rect x="0" y="0" width={w} height={h} rx={h / 2} ry={h / 2} fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
                        ) : n.shape === 'hexagon' ? (
                          <polygon points={`12,0 ${w - 12},0 ${w},${h / 2} ${w - 12},${h} 12,${h} 0,${h / 2}`} fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
                        ) : n.shape === 'diamond' ? (
                          <polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
                        ) : n.shape === 'rect' ? (
                          <rect x="0" y="0" width={w} height={h} fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
                        ) : (
                          <rect x="0" y="0" width={w} height={h} rx="4" ry="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
                        )}

                        <text
                          x={w / 2}
                          y={h / 2 + 3}
                          textAnchor="middle"
                          fontSize={n.fontSize}
                          fontFamily="Plus Jakarta Sans, sans-serif"
                          fontWeight="bold"
                          fill="#0f172a"
                        >
                          {n.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>

          {/* Diagram Interconnection Matrix De-Para */}
          <div className="border border-slate-300 rounded p-3 mb-4">
            <h3 className="font-bold text-xs text-slate-800 mb-2 border-b border-slate-200 pb-1">
              Relação de Circuitos do Diagrama
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {project.cables.map((c) => (
                <div
                  key={c.id}
                  className="border border-slate-300 rounded p-1.5 text-[9px] bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{
                        backgroundColor:
                          c.lineColor ||
                          (CABLE_TYPES[c.type] || CABLE_TYPES['Outro']).strokeColor,
                      }}
                    />
                    <strong className="font-mono">{c.code}</strong>
                  </div>
                  <div className="truncate max-w-[150px] text-slate-600">
                    {c.origin} → {c.destination}
                  </div>
                  <span className="font-mono text-slate-700 font-semibold shrink-0">
                    {c.length} m
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom engineering note */}
          <div className="text-[10px] text-slate-500 flex justify-between border-t border-slate-300 pt-2">
            <span>Desenho Técnico de Interligação • Cadastro de Cabos</span>
            <span>Documentação Técnica de Engenharia Elétrica</span>
          </div>
        </div>
      )}
    </div>
  );
};
