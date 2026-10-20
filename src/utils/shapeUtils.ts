import { NodeShape } from '../types';

export interface ShapeOption {
  id: NodeShape;
  label: string;
  description: string;
}

export const SHAPE_OPTIONS: ShapeOption[] = [
  {
    id: 'rounded-rect',
    label: 'Retângulo Arredondado',
    description: 'Padrão para painéis elétricos, CCMs e CLPs',
  },
  {
    id: 'rect',
    label: 'Retângulo Reto',
    description: 'Quadros de comando, módulos e racks',
  },
  {
    id: 'circle',
    label: 'Elipse / Círculo',
    description: 'Motores, bombas, compressores e geradores',
  },
  {
    id: 'hexagon',
    label: 'Hexágono',
    description: 'Instrumentação, transmissores (PT/TT) e sensores',
  },
  {
    id: 'capsule',
    label: 'Cápsula',
    description: 'Barramentos, réguas de bornes e caixas de passagem',
  },
  {
    id: 'diamond',
    label: 'Losango / Diamante',
    description: 'Válvulas de controle, intertravamentos e instrumentação de campo',
  },
];

export const SCALE_PRESETS = [
  { label: 'Ultra Compacto (35%)', scale: 0.35, icon: 'XXXS' },
  { label: 'Micro (45%)', scale: 0.45, icon: 'XXS' },
  { label: 'Ultra Mini (55%)', scale: 0.55, icon: 'XS' },
  { label: 'Mini (65%)', scale: 0.65, icon: 'S' },
  { label: 'Compacto (80%)', scale: 0.8, icon: 'M' },
  { label: 'Normal (100%)', scale: 1.0, icon: 'L' },
  { label: 'Grande (125%)', scale: 1.25, icon: 'XL' },
];

let measureCanvas: HTMLCanvasElement | null = null;

export function measureTextWidth(text: string, font = '600 11px "Plus Jakarta Sans", system-ui, sans-serif'): number {
  if (typeof document === 'undefined') {
    return Math.max(50, text.length * 6);
  }
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
  }
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) {
    return Math.max(50, text.length * 6);
  }
  ctx.font = font;
  return Math.ceil(ctx.measureText(text).width);
}

export function calculateNodeDimensions(
  name: string,
  shape: NodeShape = 'rounded-rect',
  scale = 1.0
): { width: number; height: number; fontSize: number } {
  const effectiveScale = Math.max(0.3, Math.min(1.8, scale || 1.0));
  const textWidth = measureTextWidth(name);
  const minHeight = Math.max(16, Math.round(24 * effectiveScale));

  let baseWidth: number;
  let baseHeight: number;

  switch (shape) {
    case 'circle': {
      baseWidth = Math.max(64, textWidth + 20);
      baseHeight = Math.max(minHeight, Math.round(26 * effectiveScale));
      break;
    }
    case 'hexagon': {
      baseWidth = Math.max(70, textWidth + 18);
      baseHeight = Math.max(minHeight, Math.round(26 * effectiveScale));
      break;
    }
    case 'capsule': {
      baseWidth = Math.max(62, textWidth + 16);
      baseHeight = Math.max(minHeight, Math.round(24 * effectiveScale));
      break;
    }
    case 'diamond': {
      baseWidth = Math.max(74, Math.round(textWidth * 1.25) + 14);
      baseHeight = Math.max(minHeight + 4, Math.round(30 * effectiveScale));
      break;
    }
    case 'rect':
    case 'rounded-rect':
    default: {
      baseWidth = Math.max(58, textWidth + 14);
      baseHeight = Math.max(minHeight, Math.round(24 * effectiveScale));
      break;
    }
  }

  const width = Math.round(baseWidth * effectiveScale);
  const height = Math.round(baseHeight);
  const fontSize = Math.max(6.5, Math.round(10.5 * Math.min(effectiveScale, 1.15)));

  return { width, height, fontSize };
}

/**
 * Suggests standard electrical/automation shape based on equipment name keywords
 */
export function inferShapeFromName(name: string): NodeShape {
  const lower = name.toLowerCase();
  if (
    lower.includes('motor') ||
    lower.includes('bomba') ||
    lower.includes('ventilador') ||
    lower.includes('gerador') ||
    lower.match(/\bm-\d+/) ||
    lower.match(/\bb-\d+/)
  ) {
    return 'circle';
  }
  if (
    lower.includes('válvula') ||
    lower.includes('valvula') ||
    lower.includes('solenóide') ||
    lower.includes('solenoide') ||
    lower.match(/\byv-\d+/) ||
    lower.match(/\bxv-\d+/)
  ) {
    return 'diamond';
  }
  if (
    lower.includes('sensor') ||
    lower.includes('transmissor') ||
    lower.includes('transdutor') ||
    lower.match(/\bpt-\d+/) ||
    lower.match(/\btt-\d+/) ||
    lower.match(/\bft-\d+/) ||
    lower.match(/\blt-\d+/) ||
    lower.match(/\bzs-\d+/)
  ) {
    return 'hexagon';
  }
  if (
    lower.includes('borne') ||
    lower.includes('régua') ||
    lower.includes('regua') ||
    lower.includes('barramento') ||
    lower.includes('malha') ||
    lower.includes('pe')
  ) {
    return 'capsule';
  }
  return 'rounded-rect';
}
