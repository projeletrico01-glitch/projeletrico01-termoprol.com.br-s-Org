export type CableType = 
  | 'Potência'
  | 'Comando'
  | 'Sinal'
  | 'Comunicação'
  | 'Instrumentação'
  | 'Aterramento'
  | 'Outro';

export type NodeShape = 
  | 'rounded-rect' 
  | 'rect' 
  | 'circle' 
  | 'hexagon' 
  | 'capsule'
  | 'diamond';

export type PortPosition = 
  | 'auto' 
  | 'right' 
  | 'left' 
  | 'top' 
  | 'bottom';

export interface Cable {
  id: string;
  code: string;
  type: CableType;
  origin: string;
  destination: string;
  gauge: string;
  conductors: string;
  voltage: string;
  signal: string;
  spec: string;
  length: number;
  notes: string;
  sourcePort?: PortPosition;
  targetPort?: PortPosition;
  lineColor?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectData {
  projectName: string;
  projectCode?: string;
  author?: string;
  company?: string;
  cables: Cable[];
  defaultShape?: NodeShape;
  nodeShapes?: Record<string, NodeShape>;
  symbolScale?: number;
  nodeScales?: Record<string, number>;
  nodePositions?: Record<string, { x: number; y: number }>;
  updatedAt?: string;
  exportedAt?: string;
}

export interface DiagramNode {
  id: string;
  name: string;
  type: 'origin' | 'destination' | 'both';
  shape: NodeShape;
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
  incomingCount: number;
  outgoingCount: number;
}
