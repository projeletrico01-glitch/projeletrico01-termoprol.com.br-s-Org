import { DiagramNode, PortPosition } from '../types';

export interface Point {
  x: number;
  y: number;
}

export interface WireRoute {
  start: Point;
  end: Point;
  c1: Point;
  c2: Point;
  pathData: string;
  midPoint: Point;
  badge: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
  };
  effectiveSourcePort: 'right' | 'left' | 'top' | 'bottom';
  effectiveTargetPort: 'right' | 'left' | 'top' | 'bottom';
}

export function evaluateBezier(start: Point, c1: Point, c2: Point, end: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * start.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * end.x,
    y: mt * mt * mt * start.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * end.y,
  };
}

export function evaluateBezierDerivative(start: Point, c1: Point, c2: Point, end: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (c1.x - start.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (end.x - c2.x),
    y: 3 * mt * mt * (c1.y - start.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (end.y - c2.y),
  };
}

export function evaluateBezierNormal(start: Point, c1: Point, c2: Point, end: Point, t: number): Point {
  const d = evaluateBezierDerivative(start, c1, c2, end, t);
  const len = Math.hypot(d.x, d.y) || 1;
  return {
    x: -d.y / len,
    y: d.x / len,
  };
}

export function getNodePortCoordinates(
  node: { x: number; y: number; width: number; height: number },
  port: 'right' | 'left' | 'top' | 'bottom',
  offset = 0
): Point {
  switch (port) {
    case 'top':
      return { x: node.x + node.width / 2 + offset, y: node.y };
    case 'bottom':
      return { x: node.x + node.width / 2 + offset, y: node.y + node.height };
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 + offset };
    case 'right':
    default:
      return { x: node.x + node.width, y: node.y + node.height / 2 + offset };
  }
}

export function calculateWireRoute(
  origNode: { x: number; y: number; width: number; height: number },
  destNode: { x: number; y: number; width: number; height: number },
  requestedSourcePort: PortPosition = 'auto',
  requestedTargetPort: PortPosition = 'auto',
  offset = 0
): WireRoute {
  // Determine effective ports
  let sourcePort: 'right' | 'left' | 'top' | 'bottom';
  let targetPort: 'right' | 'left' | 'top' | 'bottom';

  if (requestedSourcePort !== 'auto') {
    sourcePort = requestedSourcePort;
  } else {
    // Auto source port
    if (destNode.x >= origNode.x + origNode.width - 20) {
      sourcePort = 'right';
    } else if (destNode.x + destNode.width <= origNode.x + 20) {
      sourcePort = 'left';
    } else if (destNode.y >= origNode.y + origNode.height) {
      sourcePort = 'bottom';
    } else {
      sourcePort = 'top';
    }
  }

  if (requestedTargetPort !== 'auto') {
    targetPort = requestedTargetPort;
  } else {
    // Auto target port
    if (destNode.x >= origNode.x + origNode.width - 20) {
      targetPort = 'left';
    } else if (destNode.x + destNode.width <= origNode.x + 20) {
      targetPort = 'right';
    } else if (destNode.y >= origNode.y + origNode.height) {
      targetPort = 'top';
    } else {
      targetPort = 'bottom';
    }
  }

  const start = getNodePortCoordinates(origNode, sourcePort, offset);
  const end = getNodePortCoordinates(destNode, targetPort, offset);

  // Compute Bezier control points based on orientation
  const dist = Math.hypot(end.x - start.x, end.y - start.y);
  const curveWeight = Math.max(30, Math.min(dist * 0.45, 120));

  let c1x = start.x;
  let c1y = start.y;
  let c2x = end.x;
  let c2y = end.y;

  // Source direction
  if (sourcePort === 'right') c1x += curveWeight;
  else if (sourcePort === 'left') c1x -= curveWeight;
  else if (sourcePort === 'bottom') c1y += curveWeight;
  else if (sourcePort === 'top') c1y -= curveWeight;

  // Target direction
  if (targetPort === 'right') c2x += curveWeight;
  else if (targetPort === 'left') c2x -= curveWeight;
  else if (targetPort === 'bottom') c2y += curveWeight;
  else if (targetPort === 'top') c2y -= curveWeight;

  const pathData = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;

  // Bezier curve midpoint at t = 0.5
  const midPoint = evaluateBezier(start, { x: c1x, y: c1y }, { x: c2x, y: c2y }, end, 0.5);

  return {
    start,
    end,
    c1: { x: c1x, y: c1y },
    c2: { x: c2x, y: c2y },
    pathData,
    midPoint,
    badge: {
      x: midPoint.x,
      y: midPoint.y,
      width: 56,
      height: 18,
      fontSize: 8.5,
    },
    effectiveSourcePort: sourcePort,
    effectiveTargetPort: targetPort,
  };
}
