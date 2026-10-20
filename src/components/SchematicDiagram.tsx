import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Cable, NodeShape, PortPosition } from '../types';
import { CABLE_TYPES } from '../constants/cableTypes';
import { 
  SHAPE_OPTIONS, 
  SCALE_PRESETS,
  calculateNodeDimensions, 
  inferShapeFromName 
} from '../utils/shapeUtils';
import { calculateWireRoute } from '../utils/routingUtils';
import { computeDiagramLayout, exportDiagramToSVG, LayoutEquipmentNode } from '../utils/diagramLayout';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Activity, 
  Grid, 
  Edit, 
  ArrowRight,
  Shapes,
  Maximize2,
  Sparkles,
  Download,
  Palette,
  Check,
  FileText,
  Printer,
  Image as ImageIcon
} from 'lucide-react';
import { PRESET_LINE_COLORS } from '../constants/cableTypes';

interface SchematicDiagramProps {
  cables: Cable[];
  onEditCable: (cable: Cable) => void;
  activeFilterType?: string;
  defaultShape?: NodeShape;
  nodeShapes?: Record<string, NodeShape>;
  symbolScale?: number;
  nodeScales?: Record<string, number>;
  nodePositions?: Record<string, { x: number; y: number }>;
  projectName?: string;
  onChangeDefaultShape?: (shape: NodeShape) => void;
  onChangeNodeShape?: (nodeName: string, shape: NodeShape) => void;
  onChangeSymbolScale?: (scale: number) => void;
  onChangeNodeScale?: (nodeName: string, scale: number) => void;
  onChangeNodePositions?: (positions: Record<string, { x: number; y: number }>) => void;
  onChangeCablePorts?: (cableId: string, sourcePort: PortPosition, targetPort: PortPosition) => void;
  onChangeCableColor?: (cableId: string, color: string | undefined) => void;
  onChangeCableLineStyle?: (cableId: string, style: 'solid' | 'dashed' | 'dotted') => void;
  onExportDiagramPDF?: () => void;
}

type EquipmentNode = LayoutEquipmentNode;

export const SchematicDiagram: React.FC<SchematicDiagramProps> = ({
  cables,
  onEditCable,
  activeFilterType,
  defaultShape = 'rounded-rect',
  nodeShapes = {},
  symbolScale = 0.85,
  nodeScales = {},
  nodePositions: externalPositions = {},
  projectName,
  onChangeDefaultShape,
  onChangeNodeShape,
  onChangeSymbolScale,
  onChangeNodeScale,
  onChangeNodePositions,
  onChangeCablePorts,
  onChangeCableColor,
  onChangeCableLineStyle,
  onExportDiagramPDF,
}) => {
  const [viewMode, setViewMode] = useState<'topology' | 'blocks'>('topology');
  const [zoom, setZoom] = useState(1);
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);
  const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
  const [highlightNode, setHighlightNode] = useState<string | null>(null);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showScaleMenu, setShowScaleMenu] = useState(false);

  // Custom node positions
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(
    externalPositions
  );
  const [blockPositions, setBlockPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (externalPositions && Object.keys(externalPositions).length > 0) {
      setNodePositions(externalPositions);
    }
  }, [externalPositions]);

  const containerRef = useRef<HTMLDivElement>(null);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const scaleMenuRef = useRef<HTMLDivElement>(null);

  const draggingRef = useRef<{ 
    id: string; 
    startX: number; 
    startY: number; 
    origX: number; 
    origY: number; 
    mode: 'node' | 'block' 
  } | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
        setShowShapeMenu(false);
      }
      if (scaleMenuRef.current && !scaleMenuRef.current.contains(e.target as Node)) {
        setShowScaleMenu(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, []);

  // Filter cables if activeFilterType is provided
  const displayCables = useMemo(() => {
    if (!activeFilterType) return cables;
    return cables.filter((c) => c.type === activeFilterType);
  }, [cables, activeFilterType]);

  // Selected cable object from live cables
  const selectedCable = useMemo(() => {
    if (!selectedCableId) return null;
    return cables.find((c) => c.id === selectedCableId) || null;
  }, [selectedCableId, cables]);

  // Unified compact layout calculation
  const layout = useMemo(() => {
    return computeDiagramLayout(displayCables, {
      defaultShape,
      nodeShapes,
      symbolScale,
      nodeScales,
      nodePositions,
    });
  }, [displayCables, defaultShape, nodeShapes, symbolScale, nodeScales, nodePositions]);

  const equipmentNodes = layout.nodes;
  const wireRoutes = layout.wireRoutes;

  // Initial layout for block mode
  useEffect(() => {
    if (viewMode === 'blocks' && cables.length > 0) {
      const initial: Record<string, { x: number; y: number }> = {};
      const cols = 3;
      cables.forEach((c, idx) => {
        if (!blockPositions[c.id]) {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          initial[c.id] = {
            x: 20 + col * 260,
            y: 20 + row * 115,
          };
        }
      });
      if (Object.keys(initial).length > 0) {
        setBlockPositions((prev) => ({ ...prev, ...initial }));
      }
    }
  }, [viewMode, cables]);

  // Reset positions
  const handleResetPositions = () => {
    setNodePositions({});
    if (onChangeNodePositions) {
      onChangeNodePositions({});
    }
    setBlockPositions({});
    setZoom(1);
  };

  // Pointer drag handler for topology nodes
  const handleNodePointerDown = (e: React.PointerEvent, id: string, currentX: number, currentY: number, mode: 'node' | 'block') => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    draggingRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: currentX,
      origY: currentY,
      mode,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const { id, startX, startY, origX, origY, mode } = draggingRef.current;
    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;
    const nextX = Math.max(10, origX + dx);
    const nextY = Math.max(10, origY + dy);

    if (mode === 'node') {
      setNodePositions((prev) => ({
        ...prev,
        [id]: { x: nextX, y: nextY },
      }));
    } else {
      setBlockPositions((prev) => ({
        ...prev,
        [id]: { x: nextX, y: nextY },
      }));
    }
  };

  const handlePointerUp = () => {
    if (draggingRef.current && draggingRef.current.mode === 'node') {
      if (onChangeNodePositions) {
        onChangeNodePositions(nodePositions);
      }
    }
    draggingRef.current = null;
  };

  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth - 40;
    const containerH = containerRef.current.clientHeight - 40;
    const reqW = layout.bounds.width + 60;
    const reqH = layout.bounds.height + 60;
    const scaleFactor = Math.min(containerW / reqW, containerH / reqH, 1.25);
    setZoom(Math.max(0.3, Math.min(1.5, Math.round(scaleFactor * 100) / 100)));
  };

  const handlePrintTechnicalDoc = () => {
    document.body.classList.add('print-only-schematic');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-only-schematic');
    }, 1500);
  };

  const handleExportPNG = () => {
    const { nodes, wireRoutes, bounds } = layout;
    const margin = 24;
    const svgWidth = bounds.width + margin * 2;
    const svgHeight = bounds.height + margin * 2;
    const offsetX = -bounds.minX + margin;
    const offsetY = -bounds.minY + margin;

    let svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
  <defs>
    <pattern id="grid-png" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect width="100%" height="100%" fill="url(#grid-png)"/>
  <g transform="translate(${offsetX}, ${offsetY})">
`;

    wireRoutes.forEach(({ cable, route }) => {
      const typeCfg = CABLE_TYPES[cable.type] || CABLE_TYPES['Outro'];
      const wireColor = cable.lineColor || typeCfg.strokeColor;
      const arrowId = `png-arrow-${cable.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

      let strokeDash = '';
      if (cable.lineStyle === 'dashed' || (!cable.lineStyle && cable.type === 'Comunicação')) {
        strokeDash = 'stroke-dasharray="5 4"';
      } else if (cable.lineStyle === 'dotted') {
        strokeDash = 'stroke-dasharray="2 3"';
      }

      svgString += `  <defs>
    <marker id="${arrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${wireColor}" />
    </marker>
  </defs>
  <path d="${route.pathData}" fill="none" stroke="${wireColor}" stroke-width="2" marker-end="url(#${arrowId})" ${strokeDash}/>
`;

      const badge = route.badge || {
        x: route.midPoint.x,
        y: route.midPoint.y,
        width: 56,
        height: 17,
        fontSize: 8.5,
      };
      svgString += `  <g transform="translate(${badge.x}, ${badge.y})">
    <rect x="${-badge.width / 2}" y="${-badge.height / 2}" width="${badge.width}" height="${badge.height}" rx="3.5" fill="#ffffff" stroke="${wireColor}" stroke-width="1.3"/>
    <text x="0" y="3.2" text-anchor="middle" font-size="${badge.fontSize}" font-family="JetBrains Mono, monospace" font-weight="bold" fill="#0f172a">${cable.code}</text>
  </g>
`;
    });

    nodes.forEach((n) => {
      svgString += `  <g transform="translate(${n.x}, ${n.y})">
`;
      const w = n.width;
      const h = n.height;

      switch (n.shape) {
        case 'circle':
        case 'capsule':
          svgString += `    <rect x="0" y="0" width="${w}" height="${h}" rx="${h / 2}" ry="${h / 2}" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
          break;
        case 'hexagon': {
          const cut = 12;
          svgString += `    <polygon points="${cut},0 ${w - cut},0 ${w},${h / 2} ${w - cut},${h} ${cut},${h} 0,${h / 2}" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
          break;
        }
        case 'diamond':
          svgString += `    <polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
          break;
        case 'rect':
          svgString += `    <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
          break;
        case 'rounded-rect':
        default:
          svgString += `    <rect x="0" y="0" width="${w}" height="${h}" rx="5" ry="5" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
          break;
      }

      svgString += `    <text x="${w / 2}" y="${h / 2 + 3.5}" text-anchor="middle" font-size="${n.fontSize}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-weight="bold" fill="#0f172a">${n.name}</text>
  </g>
`;
    });

    svgString += `  </g>\n</svg>`;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const dpr = 2;
      const canvas = document.createElement('canvas');
      canvas.width = svgWidth * dpr;
      canvas.height = svgHeight * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const a = document.createElement('a');
      const safeName = (projectName || 'diagrama_esquematico')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_');
      a.download = `${safeName}_alta_resolucao.png`;
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = url;
  };

  if (cables.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-xl p-12 text-center text-slate-400">
        <Activity className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5] mb-3" />
        <h3 className="text-base font-bold text-slate-700">Diagrama Esquemático Vazio</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Cadastre os primeiros cabos no formulário para gerar o diagrama esquemático com a ligação entre os equipamentos.
        </p>
      </div>
    );
  }

  // Calculate canvas height and width (ultra-compact)
  const maxBlockY = Object.values(blockPositions).reduce((max, pos) => Math.max(max, pos.y), 0);
  
  const canvasHeight = Math.max(
    260,
    (viewMode === 'topology' ? layout.bounds.maxY : maxBlockY) + 50
  );
  const canvasWidth = Math.max(650, layout.bounds.maxX + 80);

  const selectedNodeData = selectedNodeName 
    ? equipmentNodes.find(n => n.name === selectedNodeName) 
    : null;

  // Render geometric shape inside node
  const renderShapeElement = (node: EquipmentNode, isSelected: boolean) => {
    const w = node.width;
    const h = node.height;
    const stroke = isSelected ? '#0284c7' : '#94a3b8';
    const strokeWidth = isSelected ? 2.5 : 1.5;

    switch (node.shape) {
      case 'hexagon':
        return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${w} ${h}`}>
            <polygon
              points={`14,0 ${w - 14},0 ${w},${h / 2} ${w - 14},${h} 14,${h} 0,${h / 2}`}
              fill="#ffffff"
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );
      case 'diamond':
        return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${w} ${h}`}>
            <polygon
              points={`${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}`}
              fill="#ffffff"
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );
      case 'circle':
      case 'capsule':
        return (
          <div
            style={{ width: `${w}px`, height: `${h}px` }}
            className={`absolute inset-0 rounded-full bg-white border-2 transition-all ${
              isSelected ? 'border-sky-500 shadow-md ring-2 ring-sky-200' : 'border-slate-350'
            }`}
          />
        );
      case 'rect':
        return (
          <div
            style={{ width: `${w}px`, height: `${h}px` }}
            className={`absolute inset-0 rounded-none bg-white border-2 transition-all ${
              isSelected ? 'border-sky-500 shadow-md ring-2 ring-sky-200' : 'border-slate-350'
            }`}
          />
        );
      case 'rounded-rect':
      default:
        return (
          <div
            style={{ width: `${w}px`, height: `${h}px` }}
            className={`absolute inset-0 rounded-lg bg-white border-2 transition-all ${
              isSelected ? 'border-sky-500 shadow-md ring-2 ring-sky-200' : 'border-slate-350'
            }`}
          />
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
      {/* Diagram Toolbar */}
      <div className="p-4 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/termoprol-logo.png"
            alt="Termoprol - Tecnologia em refrigeração"
            className="h-8 w-auto object-contain hidden sm:block"
          />
          <div className="sm:border-l sm:border-slate-200 sm:pl-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Diagrama Esquemático</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                Termoprol
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Símbolos com ajuste automático ao nome. Personalize portas de partida/chegada e tamanho.
            </p>
          </div>
        </div>

        {/* View Switcher, Scale, Shape & Zoom Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('topology')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'topology'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-sky-600" />
              <span>Interligação</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('blocks')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'blocks'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-indigo-600" />
              <span>Blocos de Cabos</span>
            </button>
          </div>

          {/* Symbol Size Scale Dropdown */}
          <div className="relative" ref={scaleMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowScaleMenu(!showScaleMenu);
                setShowShapeMenu(false);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ajustar escala e tamanho dos símbolos"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Tamanho:</span>
              <span className="font-semibold text-slate-900">
                {Math.round((symbolScale || 1.0) * 100)}%
              </span>
            </button>

            {showScaleMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Tamanho Geral dos Símbolos
                </div>
                {SCALE_PRESETS.map((p) => (
                  <button
                    key={p.scale}
                    type="button"
                    onClick={() => {
                      if (onChangeSymbolScale) onChangeSymbolScale(p.scale);
                      setShowScaleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors ${
                      symbolScale === p.scale ? 'bg-sky-50 font-semibold text-sky-900' : 'text-slate-700'
                    }`}
                  >
                    <span>{p.label} ({Math.round(p.scale * 100)}%)</span>
                    <span className="text-[10px] font-mono text-slate-400">{p.icon}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Geometric Shape Selector Dropdown */}
          <div className="relative" ref={shapeMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowShapeMenu(!showShapeMenu);
                setShowScaleMenu(false);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Escolher forma geométrica padrão dos símbolos"
            >
              <Shapes className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Forma:</span>
              <span className="font-semibold text-slate-900">
                {SHAPE_OPTIONS.find(s => s.id === defaultShape)?.label.split(' ')[0] || 'Forma'}
              </span>
            </button>

            {showShapeMenu && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Formas Geométricas Usuais
                </div>

                {SHAPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (onChangeDefaultShape) onChangeDefaultShape(opt.id);
                      setShowShapeMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors ${
                      defaultShape === opt.id ? 'bg-sky-50/60 font-semibold text-sky-900' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{opt.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {opt.description}
                      </p>
                    </div>
                    {defaultShape === opt.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-600 ml-2 shrink-0" />
                    )}
                  </button>
                ))}

                <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      equipmentNodes.forEach((node) => {
                        const autoShape = inferShapeFromName(node.name);
                        if (onChangeNodeShape) onChangeNodeShape(node.name, autoShape);
                      });
                      setShowShapeMenu(false);
                    }}
                    className="w-full text-left text-[11px] text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-sky-500" />
                    <span>Auto-atribuir por Tipo de Equipamento</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Zoom & Reset Buttons */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-slate-600">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
              className="p-1 hover:text-slate-900 hover:bg-slate-200/60 rounded cursor-pointer"
              title="Aumentar Zoom (+15%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 select-none tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.3))}
              className="p-1 hover:text-slate-900 hover:bg-slate-200/60 rounded cursor-pointer"
              title="Diminuir Zoom (-15%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitToScreen}
              className="p-1 hover:text-slate-900 hover:bg-slate-200/60 rounded cursor-pointer"
              title="Ajustar Diagrama à Tela (Auto-Fit)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetPositions}
              className="p-1 hover:text-slate-900 hover:bg-slate-200/60 rounded ml-0.5 cursor-pointer"
              title="Redefinir Posições & Zoom para Padrão"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exportar PDF do Diagrama */}
          {onExportDiagramPDF && (
            <button
              type="button"
              onClick={onExportDiagramPDF}
              className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exportar folha técnica exclusiva do diagrama em PDF A4 vetorial"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">PDF Diagrama</span>
            </button>
          )}

          {/* Baixar SVG standalone vector button */}
          <button
            type="button"
            onClick={() =>
              exportDiagramToSVG(displayCables, {
                projectName,
                defaultShape,
                nodeShapes,
                symbolScale,
                nodeScales,
                nodePositions,
              })
            }
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Baixar desenho vetorial puro do diagrama (.svg)"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">SVG</span>
          </button>

          {/* Exportar Imagem PNG em Alta Resolução */}
          <button
            type="button"
            onClick={handleExportPNG}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportar imagem do diagrama em alta resolução (PNG 300 DPI) para relatórios e manuais"
          >
            <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Imagem PNG</span>
          </button>

          {/* Imprimir Diagrama (Visualização Técnica Dedicada) */}
          <button
            type="button"
            onClick={handlePrintTechnicalDoc}
            className="bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Imprimir exclusivamente o Diagrama Esquemático em alta resolução para documentação técnica"
          >
            <Printer className="w-3.5 h-3.5 text-sky-700" />
            <span className="hidden sm:inline">Imprimir Técnico</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative tech-grid overflow-auto custom-scrollbar select-none"
        style={{ minHeight: '260px', maxHeight: '520px' }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            position: 'relative',
          }}
        >
          {viewMode === 'topology' ? (
            <>
              {/* SVG Connecting Wires Layer */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: 'visible' }}
              >
                {wireRoutes.map(({ cable, origNode, destNode, route }) => {
                  const typeCfg = CABLE_TYPES[cable.type] || CABLE_TYPES['Outro'];
                  const wireColor = cable.lineColor || typeCfg.strokeColor;
                  const isHighlighted =
                    selectedCableId === cable.id ||
                    highlightNode === origNode.id ||
                    highlightNode === destNode.id ||
                    selectedNodeName === origNode.name ||
                    selectedNodeName === destNode.name;
                  const arrowId = `wire-arrow-${cable.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

                  let strokeDash: string | undefined = undefined;
                  if (cable.lineStyle === 'dashed' || (!cable.lineStyle && cable.type === 'Comunicação')) {
                    strokeDash = '5 4';
                  } else if (cable.lineStyle === 'dotted') {
                    strokeDash = '2 3';
                  }

                  return (
                    <g key={cable.id} className="pointer-events-auto cursor-pointer">
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

                      {/* Invisible hover area for easy clicking */}
                      <path
                        d={route.pathData}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="16"
                        onClick={() => {
                          setSelectedCableId(cable.id);
                          setSelectedNodeName(null);
                        }}
                      />
                      {/* Active wire stroke */}
                      <path
                        d={route.pathData}
                        fill="none"
                        stroke={wireColor}
                        strokeWidth={isHighlighted ? 3 : 2}
                        strokeOpacity={isHighlighted ? 1 : 0.85}
                        strokeDasharray={strokeDash}
                        markerEnd={`url(#${arrowId})`}
                        onClick={() => {
                          setSelectedCableId(cable.id);
                          setSelectedNodeName(null);
                        }}
                      />
                      {/* Cable code label badge along wire */}
                      {(() => {
                        const badge = route.badge || {
                          x: route.midPoint.x,
                          y: route.midPoint.y,
                          width: 56,
                          height: 18,
                          fontSize: 8.5,
                        };
                        return (
                          <g
                            transform={`translate(${badge.x}, ${badge.y})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCableId(cable.id);
                              setSelectedNodeName(null);
                            }}
                            className="transition-transform hover:scale-110 cursor-pointer pointer-events-auto"
                          >
                            <rect
                              x={-badge.width / 2}
                              y={-badge.height / 2}
                              width={badge.width}
                              height={badge.height}
                              rx="4"
                              fill="#ffffff"
                              stroke={isHighlighted ? wireColor : (cable.lineColor ? wireColor : '#94a3b8')}
                              strokeWidth={isHighlighted ? 2.2 : (cable.lineColor ? 1.6 : 1.2)}
                              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                            />
                            <text
                              x="0"
                              y="3"
                              textAnchor="middle"
                              fontSize={badge.fontSize}
                              fontFamily="JetBrains Mono, monospace"
                              fontWeight="600"
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
              </svg>

              {/* Equipment Nodes: AUTO-DIMENSIONADO COM FORMA & PORTAS INTERATIVAS */}
              {equipmentNodes.map((node) => {
                const isSelected = highlightNode === node.id || selectedNodeName === node.name;
                const isHovered = highlightNode === node.id;

                return (
                  <div
                    key={node.id}
                    onPointerDown={(e) => handleNodePointerDown(e, node.id, node.x, node.y, 'node')}
                    onMouseEnter={() => setHighlightNode(node.id)}
                    onMouseLeave={() => setHighlightNode(null)}
                    onClick={() => {
                      setSelectedNodeName(node.name);
                      setSelectedCableId(null);
                    }}
                    style={{
                      transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                      width: `${node.width}px`,
                      height: `${node.height}px`,
                    }}
                    className="absolute z-10 cursor-grab active:cursor-grabbing select-none flex items-center justify-center p-1 group"
                  >
                    {/* Background geometric shape */}
                    {renderShapeElement(node, isSelected)}

                    {/* Centered label matching text width perfectly */}
                    <div
                      style={{ fontSize: `${node.fontSize}px` }}
                      className="relative z-10 font-bold text-slate-900 text-center px-3 truncate"
                      title={`${node.name}`}
                    >
                      {node.name}
                    </div>

                    {/* Visual Connection Port Handles on Hover */}
                    {(isHovered || isSelected) && (
                      <>
                        {/* Top Port */}
                        <div
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sky-500 border border-white shadow-xs pointer-events-none"
                          title="Porta Superior (Topo)"
                        />
                        {/* Bottom Port */}
                        <div
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sky-500 border border-white shadow-xs pointer-events-none"
                          title="Porta Inferior (Base)"
                        />
                        {/* Left Port */}
                        <div
                          className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rounded-full bg-sky-500 border border-white shadow-xs pointer-events-none"
                          title="Porta Esquerda"
                        />
                        {/* Right Port */}
                        <div
                          className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-sky-500 border border-white shadow-xs pointer-events-none"
                          title="Porta Direita"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            /* Block View Mode */
            displayCables.map((cable) => {
              const pos = blockPositions[cable.id] || { x: 20, y: 20 };
              const typeCfg = CABLE_TYPES[cable.type] || CABLE_TYPES['Outro'];
              const isSelected = selectedCableId === cable.id;

              return (
                <div
                  key={cable.id}
                  onPointerDown={(e) => handleNodePointerDown(e, cable.id, pos.x, pos.y, 'block')}
                  onClick={() => {
                    setSelectedCableId(cable.id);
                    setSelectedNodeName(null);
                  }}
                  style={{
                    transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                    width: '230px',
                  }}
                  className={`absolute z-10 bg-white border-2 rounded-lg p-2.5 shadow-xs cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none ${
                    isSelected
                      ? 'border-sky-600 ring-2 ring-sky-200'
                      : 'border-slate-200 hover:border-slate-350'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {cable.code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${typeCfg.badgeBg}`}
                    >
                      {cable.type}
                    </span>
                  </div>

                  <div className="mt-1.5 space-y-1 text-xs">
                    <div className="font-medium text-slate-900 truncate" title={cable.origin}>
                      {cable.origin}
                    </div>
                    <div className="text-[11px] text-slate-400">↓</div>
                    <div className="font-medium text-slate-900 truncate" title={cable.destination}>
                      {cable.destination}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Node Inspector (Allows changing Shape AND Size of THIS equipment) */}
      {selectedNodeData && !selectedCable && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900">
                {selectedNodeData.name}
              </span>
            </div>

            {/* Shape selection */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-600 font-semibold mr-1">
                Forma:
              </span>
              {SHAPE_OPTIONS.map((shapeOpt) => (
                <button
                  key={shapeOpt.id}
                  type="button"
                  onClick={() => {
                    if (onChangeNodeShape) {
                      onChangeNodeShape(selectedNodeData.name, shapeOpt.id);
                    }
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                    selectedNodeData.shape === shapeOpt.id
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {shapeOpt.label}
                </button>
              ))}
            </div>

            {/* Size scale selection for this equipment */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-600 font-semibold mr-1">
                Tamanho do Símbolo:
              </span>
              {SCALE_PRESETS.map((p) => (
                <button
                  key={p.scale}
                  type="button"
                  onClick={() => {
                    if (onChangeNodeScale) {
                      onChangeNodeScale(selectedNodeData.name, p.scale);
                    }
                  }}
                  className={`text-xs px-2.5 py-0.5 rounded-md border transition-all ${
                    Math.abs(selectedNodeData.scale - p.scale) < 0.05
                      ? 'bg-slate-800 text-white border-slate-800 font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label} ({Math.round(p.scale * 100)}%)
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedNodeName(null)}
              className="bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Selected Cable Inspector Modal / Bottom Bar with Colors, Styles & Ports */}
      {selectedCable && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-slate-900">
                {selectedCable.code}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  (CABLE_TYPES[selectedCable.type] || CABLE_TYPES['Outro']).badgeBg
                }`}
              >
                {selectedCable.type}
              </span>
              <span className="text-xs text-slate-700 font-semibold">
                {selectedCable.origin}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-700 font-semibold">
                {selectedCable.destination}
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-mono text-xs text-slate-800">
                {selectedCable.gauge} · {selectedCable.length} m
              </span>
              {selectedCable.lineColor && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: selectedCable.lineColor }}
                  />
                  <span>Cor personalizada</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onEditCable(selectedCable)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Editar Dados do Cabo</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCableId(null)}
                className="bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>

          {/* Color & Line Style Controls Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            {/* Color selector */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold mr-1">
                <Palette className="w-3.5 h-3.5 text-sky-600" />
                <span>Cor da Linha:</span>
              </div>

              {/* Reset to Default Type Color */}
              <button
                type="button"
                onClick={() => onChangeCableColor && onChangeCableColor(selectedCable.id, undefined)}
                className={`px-2 py-1 rounded border text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                  !selectedCable.lineColor
                    ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Usar cor padrão definida pelo tipo do cabo"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/50"
                  style={{
                    backgroundColor:
                      (CABLE_TYPES[selectedCable.type] || CABLE_TYPES['Outro']).strokeColor,
                  }}
                />
                <span>Padrão do Tipo</span>
              </button>

              {/* Preset Color Swatches */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_LINE_COLORS.map((preset) => {
                  const isSelected = selectedCable.lineColor?.toLowerCase() === preset.color.toLowerCase();
                  return (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => onChangeCableColor && onChangeCableColor(selectedCable.id, preset.color)}
                      className={`w-5 h-5 rounded-full transition-transform relative flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-sky-500 scale-110 shadow-xs'
                          : 'hover:scale-110 opacity-90 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: preset.color }}
                      title={`${preset.label} - ${preset.description}`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}

                {/* Custom Color Picker Input */}
                <label
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-600 px-1.5 py-0.5 rounded border border-dashed border-slate-300 hover:border-slate-400 cursor-pointer bg-slate-50 hover:bg-slate-100"
                  title="Selecionar cor livre"
                >
                  <input
                    type="color"
                    value={
                      selectedCable.lineColor ||
                      (CABLE_TYPES[selectedCable.type] || CABLE_TYPES['Outro']).strokeColor
                    }
                    onChange={(e) =>
                      onChangeCableColor && onChangeCableColor(selectedCable.id, e.target.value)
                    }
                    className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-[10px]">Livre</span>
                </label>
              </div>
            </div>

            {/* Line Style Selector */}
            <div className="flex items-center gap-1.5 shrink-0 pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <span className="text-slate-600 font-medium">Estilo:</span>
              {(['solid', 'dashed', 'dotted'] as const).map((st) => {
                const currentStyle =
                  selectedCable.lineStyle || (selectedCable.type === 'Comunicação' ? 'dashed' : 'solid');
                const isSelected = currentStyle === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      onChangeCableLineStyle && onChangeCableLineStyle(selectedCable.id, st)
                    }
                    className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'solid' && '— Sólida'}
                    {st === 'dashed' && '- - Tracejada'}
                    {st === 'dotted' && '··· Pontilhada'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Departure & Arrival Ports Control */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-600 font-medium">Saída (Origem):</span>
              {(['auto', 'right', 'left', 'top', 'bottom'] as PortPosition[]).map((port) => (
                <button
                  key={port}
                  type="button"
                  onClick={() => {
                    if (onChangeCablePorts) {
                      onChangeCablePorts(
                        selectedCable.id,
                        port,
                        selectedCable.targetPort || 'auto'
                      );
                    }
                  }}
                  className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
                    (selectedCable.sourcePort || 'auto') === port
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {port === 'auto' && 'Auto'}
                  {port === 'right' && 'Direita →'}
                  {port === 'left' && '← Esquerda'}
                  {port === 'top' && 'Topo ↑'}
                  {port === 'bottom' && 'Base ↓'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-600 font-medium">Entrada (Destino):</span>
              {(['auto', 'left', 'right', 'top', 'bottom'] as PortPosition[]).map((port) => (
                <button
                  key={port}
                  type="button"
                  onClick={() => {
                    if (onChangeCablePorts) {
                      onChangeCablePorts(
                        selectedCable.id,
                        selectedCable.sourcePort || 'auto',
                        port
                      );
                    }
                  }}
                  className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
                    (selectedCable.targetPort || 'auto') === port
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {port === 'auto' && 'Auto'}
                  {port === 'left' && 'Esquerda →'}
                  {port === 'right' && '← Direita'}
                  {port === 'top' && 'Topo ↓'}
                  {port === 'bottom' && 'Base ↑'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DEDICATED PRINTABLE VIEW FOR TECHNICAL DOCUMENTATION
          (Exports exclusively the SchematicDiagram component with high resolution)
      ======================================================== */}
      <div id="dedicated-schematic-print" className="hidden">
        {(() => {
          const margin = 20;
          const viewBox = `${layout.bounds.minX - margin} ${layout.bounds.minY - margin} ${
            layout.bounds.width + margin * 2
          } ${layout.bounds.height + margin * 2}`;

          return (
            <div className="w-full h-full flex flex-col justify-between font-sans p-1 text-slate-900">
              {/* Technical Blueprint Title Block */}
              <div className="border-2 border-slate-900 p-2.5 mb-2 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="bg-white px-2 py-1 rounded border border-slate-300">
                    <img
                      src="/termoprol-logo.png"
                      alt="Termoprol - Tecnologia em refrigeração"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                  <div className="border-l-2 border-slate-300 pl-3">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-sky-800">
                      Documentação Técnica de Fiação • Termoprol Zanotti do Brasil
                    </div>
                    <h1 className="text-base font-black text-slate-950 uppercase tracking-tight">
                      DIAGRAMA ESQUEMÁTICO DE INTERLIGAÇÃO GERAL
                    </h1>
                    <p className="text-xs text-slate-700 font-semibold mt-0.5">
                      PROJETO: {projectName || 'Sem Identificação'}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-700 space-y-0.5 border-l-2 border-slate-300 pl-4">
                  <div>EMISSÃO: {new Date().toLocaleDateString('pt-BR')}</div>
                  <div>CIRCUITOS: {displayCables.length}</div>
                  <div>EQUIPAMENTOS: {equipmentNodes.length}</div>
                  <div className="text-[9px] text-slate-500">FORMATO: A4 PAISAGEM</div>
                </div>
              </div>

              {/* Vector SVG Diagram with High Resolution */}
              <div className="flex-1 border-2 border-slate-800 rounded bg-white p-2 relative flex items-center justify-center min-h-0">
                <svg
                  viewBox={viewBox}
                  className="w-full h-full max-h-[500px]"
                  style={{ display: 'block' }}
                >
                  <defs>
                    <pattern id="tech-print-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect
                    x={layout.bounds.minX - margin}
                    y={layout.bounds.minY - margin}
                    width={layout.bounds.width + margin * 2}
                    height={layout.bounds.height + margin * 2}
                    fill="url(#tech-print-grid)"
                  />

                  {/* Wire Routes */}
                  {wireRoutes.map(({ cable, route }) => {
                    const typeCfg = CABLE_TYPES[cable.type] || CABLE_TYPES['Outro'];
                    const wireColor = cable.lineColor || typeCfg.strokeColor;
                    const arrowId = `tech-arrow-${cable.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

                    let strokeDash: string | undefined = undefined;
                    if (cable.lineStyle === 'dashed' || (!cable.lineStyle && cable.type === 'Comunicação')) {
                      strokeDash = '5 4';
                    } else if (cable.lineStyle === 'dotted') {
                      strokeDash = '2 3';
                    }

                    const badge = route.badge || {
                      x: route.midPoint.x,
                      y: route.midPoint.y,
                      width: 56,
                      height: 16,
                      fontSize: 8.5,
                    };

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
                        <g transform={`translate(${badge.x}, ${badge.y})`}>
                          <rect
                            x={-badge.width / 2}
                            y={-badge.height / 2}
                            width={badge.width}
                            height={badge.height}
                            rx="3.5"
                            fill="#ffffff"
                            stroke={wireColor}
                            strokeWidth="1.3"
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
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {equipmentNodes.map((n) => {
                    const w = n.width;
                    const h = n.height;
                    return (
                      <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                        {(() => {
                          switch (n.shape) {
                            case 'circle':
                            case 'capsule':
                              return (
                                <rect
                                  x="0"
                                  y="0"
                                  width={w}
                                  height={h}
                                  rx={h / 2}
                                  ry={h / 2}
                                  fill="#ffffff"
                                  stroke="#334155"
                                  strokeWidth="1.6"
                                />
                              );
                            case 'hexagon': {
                              const cut = 12;
                              return (
                                <polygon
                                  points={`${cut},0 ${w - cut},0 ${w},${h / 2} ${w - cut},${h} ${cut},${h} 0,${h / 2}`}
                                  fill="#ffffff"
                                  stroke="#334155"
                                  strokeWidth="1.6"
                                />
                              );
                            }
                            case 'diamond':
                              return (
                                <polygon
                                  points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`}
                                  fill="#ffffff"
                                  stroke="#334155"
                                  strokeWidth="1.6"
                                />
                              );
                            case 'rect':
                              return (
                                <rect
                                  x="0"
                                  y="0"
                                  width={w}
                                  height={h}
                                  fill="#ffffff"
                                  stroke="#334155"
                                  strokeWidth="1.6"
                                />
                              );
                            case 'rounded-rect':
                            default:
                              return (
                                <rect
                                  x="0"
                                  y="0"
                                  width={w}
                                  height={h}
                                  rx="5"
                                  ry="5"
                                  fill="#ffffff"
                                  stroke="#334155"
                                  strokeWidth="1.6"
                                />
                              );
                          }
                        })()}
                        <text
                          x={w / 2}
                          y={h / 2 + 3.5}
                          textAnchor="middle"
                          fontSize={n.fontSize}
                          fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                          fontWeight="bold"
                          fill="#0f172a"
                        >
                          {n.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Technical Bottom Legend & Stamp */}
              <div className="mt-2 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800">LEGENDA DE CABOS:</span>
                  {Object.values(CABLE_TYPES)
                    .slice(0, 6)
                    .map((t) => (
                      <span key={t.type} className="inline-flex items-center gap-1">
                        <span
                          className="w-2.5 h-2.5 rounded-xs"
                          style={{ backgroundColor: t.strokeColor }}
                        />
                        <span>{t.label}</span>
                      </span>
                    ))}
                </div>
                <div className="font-mono text-slate-500">
                  DOCUMENTO TÉCNICO VETORIAL • CONFORME NBR 5410 / IEC 60364
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
