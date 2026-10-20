import { Cable, NodeShape } from '../types';
import { CABLE_TYPES } from '../constants/cableTypes';
import { calculateNodeDimensions, inferShapeFromName } from './shapeUtils';
import {
  calculateWireRoute,
  evaluateBezier,
  evaluateBezierNormal,
  WireRoute,
} from './routingUtils';

export interface LayoutEquipmentNode {
  id: string;
  name: string;
  level: number;
  shape: NodeShape;
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  incomingCount: number;
  outgoingCount: number;
}

export interface LayoutWireRoute {
  cable: Cable;
  origNode: LayoutEquipmentNode;
  destNode: LayoutEquipmentNode;
  route: WireRoute;
}

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function boxesOverlap(a: BoundingBox, b: BoundingBox, margin = 4): boolean {
  return !(
    a.x2 + margin < b.x1 ||
    a.x1 - margin > b.x2 ||
    a.y2 + margin < b.y1 ||
    a.y1 - margin > b.y2
  );
}

function overlapArea(a: BoundingBox, b: BoundingBox): number {
  const xOverlap = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const yOverlap = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  return xOverlap * yOverlap;
}

/**
 * Resolves circuit identification positions so they NEVER overlap
 * another circuit badge or equipment node.
 */
function resolveNonOverlappingCircuitBadges(
  wireRoutes: LayoutWireRoute[],
  nodes: LayoutEquipmentNode[],
  symbolScale = 0.85,
  pairIndices: Map<string, { index: number; total: number }>
): void {
  const nodeBoxes: BoundingBox[] = nodes.map((n) => ({
    x1: n.x,
    y1: n.y,
    x2: n.x + n.width,
    y2: n.y + n.height,
  }));

  const placedBadges: BoundingBox[] = [];

  wireRoutes.forEach((wr) => {
    const { cable, route, origNode, destNode } = wr;
    const pairKey = `${origNode.name}-->${destNode.name}`;
    const pairInfo = pairIndices.get(cable.id) || { index: 0, total: 1 };
    const { index, total } = pairInfo;

    const badgeScale = Math.max(0.65, Math.min(1.05, symbolScale || 0.85));
    const badgeW = Math.max(46, Math.round((cable.code.length * 7.0 + 14) * badgeScale));
    const badgeH = Math.max(15, Math.round(18 * badgeScale));
    const badgeFontSize = Math.max(7.0, Math.round(8.5 * badgeScale));

    // Stagger preferred base T according to parallel wire index
    let preferredT = 0.5;
    if (total === 2) {
      preferredT = index === 0 ? 0.38 : 0.62;
    } else if (total === 3) {
      preferredT = index === 0 ? 0.32 : index === 1 ? 0.50 : 0.68;
    } else if (total > 3) {
      preferredT = 0.25 + (index / (total - 1)) * 0.50;
    }

    const tOffsets = [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24, 0.32, -0.32];
    const normalOffsets = [0, 14, -14, 26, -26, 38, -38, 50, -50];

    interface Candidate {
      x: number;
      y: number;
      box: BoundingBox;
      t: number;
      offset: number;
      collisionCount: number;
      totalOverlapArea: number;
      penalty: number;
    }

    const candidates: Candidate[] = [];

    for (const d of normalOffsets) {
      for (const tDelta of tOffsets) {
        const t = Math.max(0.14, Math.min(0.86, preferredT + tDelta));
        const ptOnCurve = evaluateBezier(route.start, route.c1, route.c2, route.end, t);
        const norm = evaluateBezierNormal(route.start, route.c1, route.c2, route.end, t);

        const cx = ptOnCurve.x + norm.x * d;
        const cy = ptOnCurve.y + norm.y * d;

        const box: BoundingBox = {
          x1: cx - badgeW / 2,
          y1: cy - badgeH / 2,
          x2: cx + badgeW / 2,
          y2: cy + badgeH / 2,
        };

        // Check collisions with all placed circuit badges
        let badgeCollisions = 0;
        let totalOverlap = 0;
        for (const pb of placedBadges) {
          if (boxesOverlap(box, pb, 6)) {
            badgeCollisions++;
            totalOverlap += overlapArea(box, pb) + 100;
          }
        }

        // Check collisions with all equipment nodes
        let nodeCollisions = 0;
        for (const nb of nodeBoxes) {
          if (boxesOverlap(box, nb, 8)) {
            nodeCollisions++;
            totalOverlap += overlapArea(box, nb) + 200;
          }
        }

        const totalCollisions = badgeCollisions + nodeCollisions;
        const penalty =
          totalCollisions * 10000 +
          totalOverlap +
          Math.abs(d) * 1.5 +
          Math.abs(t - preferredT) * 40;

        candidates.push({
          x: cx,
          y: cy,
          box,
          t,
          offset: d,
          collisionCount: totalCollisions,
          totalOverlapArea: totalOverlap,
          penalty,
        });

        // If candidate has zero collisions and small offset, pick immediately
        if (totalCollisions === 0 && Math.abs(d) <= 14) {
          break;
        }
      }
      if (candidates.some((c) => c.collisionCount === 0 && Math.abs(c.offset) <= 14)) {
        break;
      }
    }

    candidates.sort((a, b) => a.penalty - b.penalty);
    const chosen = candidates[0];

    placedBadges.push(chosen.box);

    route.badge = {
      x: Math.round(chosen.x * 10) / 10,
      y: Math.round(chosen.y * 10) / 10,
      width: badgeW,
      height: badgeH,
      fontSize: badgeFontSize,
    };
    route.midPoint = {
      x: route.badge.x,
      y: route.badge.y,
    };
  });
}

export function computeDiagramLayout(
  cables: Cable[],
  config: {
    defaultShape?: NodeShape;
    nodeShapes?: Record<string, NodeShape>;
    symbolScale?: number;
    nodeScales?: Record<string, number>;
    nodePositions?: Record<string, { x: number; y: number }>;
  } = {}
): {
  nodes: LayoutEquipmentNode[];
  wireRoutes: LayoutWireRoute[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
} {
  const {
    defaultShape = 'rounded-rect',
    nodeShapes = {},
    symbolScale = 0.85,
    nodeScales = {},
    nodePositions = {},
  } = config;

  if (cables.length === 0) {
    return {
      nodes: [],
      wireRoutes: [],
      bounds: { minX: 0, minY: 0, maxX: 400, maxY: 200, width: 400, height: 200 },
    };
  }

  // 1. Group unique origins and destinations
  const nodeMap = new Map<
    string,
    {
      name: string;
      incoming: string[];
      outgoing: string[];
    }
  >();

  cables.forEach((c) => {
    const origName = c.origin.trim() || 'Origem não def.';
    const destName = c.destination.trim() || 'Destino não def.';

    if (!nodeMap.has(origName)) {
      nodeMap.set(origName, { name: origName, incoming: [], outgoing: [] });
    }
    if (!nodeMap.has(destName)) {
      nodeMap.set(destName, { name: destName, incoming: [], outgoing: [] });
    }

    nodeMap.get(origName)!.outgoing.push(destName);
    nodeMap.get(destName)!.incoming.push(origName);
  });

  const nodeNames = Array.from(nodeMap.keys());
  const levels = new Map<string, number>();

  // Initial topological level estimation
  nodeNames.forEach((name) => {
    const data = nodeMap.get(name)!;
    levels.set(name, data.incoming.length === 0 ? 0 : 1);
  });

  for (let iter = 0; iter < Math.min(nodeNames.length, 6); iter++) {
    let changed = false;
    cables.forEach((c) => {
      const orig = c.origin.trim() || 'Origem não def.';
      const dest = c.destination.trim() || 'Destino não def.';
      const origL = levels.get(orig) ?? 0;
      const destL = levels.get(dest) ?? 1;
      if (destL <= origL) {
        levels.set(dest, origL + 1);
        changed = true;
      }
    });
    if (!changed) break;
  }

  const layerGroups = new Map<number, string[]>();
  nodeNames.forEach((name) => {
    const lvl = levels.get(name) ?? 0;
    if (!layerGroups.has(lvl)) {
      layerGroups.set(lvl, []);
    }
    layerGroups.get(lvl)!.push(name);
  });

  const sortedLevels = Array.from(layerGroups.keys()).sort((a, b) => a - b);
  const maxLevel = sortedLevels.length > 0 ? sortedLevels[sortedLevels.length - 1] : 1;

  // Ultra-compact, elegant engineering spacing allowing tiny scale presets (35%, 45%, 55%, etc.)
  const baseSpacing = 160 * (symbolScale || 0.85);
  const columnSpacing =
    maxLevel <= 1
      ? Math.max(160, 220 * (symbolScale || 0.85))
      : Math.max(110, Math.min(230, baseSpacing));

  const nodes: LayoutEquipmentNode[] = [];

  sortedLevels.forEach((lvl, lvlIdx) => {
    const namesInLayer = layerGroups.get(lvl) || [];
    namesInLayer.sort();

    namesInLayer.forEach((name, rowIdx) => {
      const data = nodeMap.get(name)!;
      const effectiveShape = nodeShapes[name] || defaultShape || inferShapeFromName(name);
      const effectiveScale = nodeScales[name] || symbolScale || 0.85;
      const dims = calculateNodeDimensions(name, effectiveShape, effectiveScale);

      const defaultX = 20 + lvlIdx * columnSpacing;
      const defaultY = 20 + rowIdx * (dims.height + Math.max(12, 18 * effectiveScale));

      const saved = nodePositions[name];

      nodes.push({
        id: name,
        name,
        level: lvl,
        shape: effectiveShape,
        scale: effectiveScale,
        x: saved?.x ?? defaultX,
        y: saved?.y ?? defaultY,
        width: dims.width,
        height: dims.height,
        fontSize: dims.fontSize,
        incomingCount: data.incoming.length,
        outgoingCount: data.outgoing.length,
      });
    });
  });

  // 2. Compute wire routes
  const pairCounts = new Map<string, number>();
  const pairOffsets = new Map<string, number>();
  const pairIndices = new Map<string, { index: number; total: number }>();

  cables.forEach((c) => {
    const orig = c.origin.trim() || 'Origem não def.';
    const dest = c.destination.trim() || 'Destino não def.';
    const pairKey = `${orig}-->${dest}`;
    pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
  });

  const wireRoutes: LayoutWireRoute[] = [];

  cables.forEach((cable) => {
    const origName = cable.origin.trim() || 'Origem não def.';
    const destName = cable.destination.trim() || 'Destino não def.';
    const origNode = nodes.find(
      (n) => n.name.trim().toLowerCase() === origName.toLowerCase()
    );
    const destNode = nodes.find(
      (n) => n.name.trim().toLowerCase() === destName.toLowerCase()
    );

    if (!origNode || !destNode) return;

    const pairKey = `${origName}-->${destName}`;
    const total = pairCounts.get(pairKey) || 1;
    const count = pairOffsets.get(pairKey) || 0;
    pairOffsets.set(pairKey, count + 1);

    pairIndices.set(cable.id, { index: count, total });

    // Distinct wire offset step for parallel circuits
    const wireOffsetStep = Math.max(12, 18 * (symbolScale || 0.85));
    const offset = total > 1 ? (count - (total - 1) / 2) * wireOffsetStep : 0;

    const route = calculateWireRoute(
      origNode,
      destNode,
      cable.sourcePort || 'auto',
      cable.targetPort || 'auto',
      offset
    );

    wireRoutes.push({
      cable,
      origNode,
      destNode,
      route,
    });
  });

  // Resolve circuit badges so they NEVER overlap any circuit badge or node
  resolveNonOverlappingCircuitBadges(wireRoutes, nodes, symbolScale, pairIndices);

  // 3. Compute tight bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  });

  wireRoutes.forEach((wr) => {
    minX = Math.min(minX, wr.route.start.x, wr.route.end.x, wr.route.midPoint.x);
    minY = Math.min(minY, wr.route.start.y, wr.route.end.y, wr.route.midPoint.y);
    maxX = Math.max(maxX, wr.route.start.x, wr.route.end.x, wr.route.midPoint.x);
    maxY = Math.max(maxY, wr.route.start.y, wr.route.end.y, wr.route.midPoint.y);
  });

  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 400;
    maxY = 200;
  }

  return {
    nodes,
    wireRoutes,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(100, maxX - minX),
      height: Math.max(80, maxY - minY),
    },
  };
}

export function exportDiagramToSVG(
  cables: Cable[],
  config: {
    projectName?: string;
    defaultShape?: NodeShape;
    nodeShapes?: Record<string, NodeShape>;
    symbolScale?: number;
    nodeScales?: Record<string, number>;
    nodePositions?: Record<string, { x: number; y: number }>;
  } = {}
): void {
  const { nodes, wireRoutes, bounds } = computeDiagramLayout(cables, config);
  const margin = 24;
  const svgWidth = bounds.width + margin * 2;
  const svgHeight = bounds.height + margin * 2;
  const offsetX = -bounds.minX + margin;
  const offsetY = -bounds.minY + margin;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
  <defs>
    <marker id="wire-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
    </marker>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <g transform="translate(${offsetX}, ${offsetY})">
`;

  // Draw wire paths and custom colored arrows
  wireRoutes.forEach(({ cable, route }) => {
    const typeCfg = CABLE_TYPES[cable.type] || CABLE_TYPES['Outro'];
    const wireColor = cable.lineColor || typeCfg.strokeColor;
    const arrowId = `wire-arrow-${cable.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

    let strokeDash = '';
    if (cable.lineStyle === 'dashed' || (!cable.lineStyle && cable.type === 'Comunicação')) {
      strokeDash = 'stroke-dasharray="5 4"';
    } else if (cable.lineStyle === 'dotted') {
      strokeDash = 'stroke-dasharray="2 3"';
    }

    svg += `  <defs>
      <marker id="${arrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${wireColor}" />
      </marker>
    </defs>\n`;

    svg += `    <path d="${route.pathData}" fill="none" stroke="${wireColor}" stroke-width="2" marker-end="url(#${arrowId})" ${strokeDash}/>\n`;
    const badge = route.badge || {
      x: route.midPoint.x,
      y: route.midPoint.y,
      width: 58,
      height: 17,
      fontSize: 8.5,
    };
    svg += `    <g transform="translate(${badge.x}, ${badge.y})">
      <rect x="${-badge.width / 2}" y="${-badge.height / 2}" width="${badge.width}" height="${badge.height}" rx="3.5" fill="#ffffff" stroke="${wireColor}" stroke-width="1.3"/>
      <text x="0" y="3.2" text-anchor="middle" font-size="${badge.fontSize}" font-family="JetBrains Mono, monospace" font-weight="bold" fill="#0f172a">${cable.code}</text>
    </g>\n`;
  });

  // Draw nodes
  nodes.forEach((n) => {
    svg += `    <g transform="translate(${n.x}, ${n.y})">\n`;
    const w = n.width;
    const h = n.height;

    switch (n.shape) {
      case 'circle':
      case 'capsule':
        svg += `      <rect x="0" y="0" width="${w}" height="${h}" rx="${h / 2}" ry="${h / 2}" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
        break;
      case 'hexagon': {
        const cut = 12;
        svg += `      <polygon points="${cut},0 ${w - cut},0 ${w},${h / 2} ${w - cut},${h} ${cut},${h} 0,${h / 2}" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
        break;
      }
      case 'diamond':
        svg += `      <polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
        break;
      case 'rect':
        svg += `      <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
        break;
      case 'rounded-rect':
      default:
        svg += `      <rect x="0" y="0" width="${w}" height="${h}" rx="5" ry="5" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>\n`;
        break;
    }

    svg += `      <text x="${w / 2}" y="${h / 2 + 3.5}" text-anchor="middle" font-size="${n.fontSize}" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-weight="bold" fill="#0f172a">${n.name}</text>\n`;
    svg += `    </g>\n`;
  });

  svg += `  </g>\n</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (config.projectName || 'diagrama_esquematico')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');
  a.download = `${safeName}_diagrama.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
