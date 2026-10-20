import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectData, Cable, CableType, NodeShape } from '../types';
import { CABLE_TYPES } from '../constants/cableTypes';
import { computeDiagramLayout } from './diagramLayout';
import { TERMOPROL_LOGO_BASE64 } from '../constants/termoprolLogoBase64';

export function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.substring(0, 2), 16) || 0,
      parseInt(clean.substring(2, 4), 16) || 0,
      parseInt(clean.substring(4, 6), 16) || 0,
    ];
  }
  return [100, 116, 139];
}

export function exportProjectToPDF(project: ProjectData): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const projectName = project.projectName.trim() || 'Sem Identificação';
  const totalLength = project.cables.reduce(
    (sum, c) => sum + (Number(c.length) || 0),
    0
  );

  // ==========================================
  // FOLHA 1 (e seguintes): TABELA TÉCNICA
  // ==========================================

  // Header Box
  doc.setFillColor(18, 48, 74); // #12304a Navy
  doc.rect(14, 10, pageWidth - 28, 22, 'F');

  // Termoprol Original Logo
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(18, 12, 42, 18, 1.5, 1.5, 'F');
  try {
    doc.addImage(TERMOPROL_LOGO_BASE64, 'PNG', 20, 13.5, 38, 8.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(71, 85, 105);
    doc.text('TECNOLOGIA EM REFRIGERAÇÃO', 39, 28, { align: 'center' });
  } catch {}

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('CADASTRO TÉCNICO DE CABOS & FIAÇÃO', 66, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(216, 231, 243);
  doc.text(`PROJETO: ${projectName.toUpperCase()}`, 66, 26);

  // Date and stats on the right side of header
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const nowStr = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${nowStr}`, pageWidth - 20, 18, { align: 'right' });
  doc.text(
    `Total: ${project.cables.length} cabos  |  Metragem: ${totalLength.toFixed(2)} m`,
    pageWidth - 20,
    25,
    { align: 'right' }
  );

  // Prepare Cable Table Rows
  const tableRows = project.cables.map((cable, index) => {
    const formattedLength = Number(cable.length || 0)
      .toFixed(2)
      .replace('.', ',');

    const tensionAndSignal = [cable.voltage, cable.signal]
      .filter(Boolean)
      .join(' · ');

    const specAndNotes = [cable.spec, cable.notes]
      .filter(Boolean)
      .join(' | ');

    return [
      String(index + 1),
      cable.code,
      cable.type,
      cable.origin,
      cable.destination,
      cable.gauge || '—',
      cable.conductors || '—',
      tensionAndSignal || '—',
      `${formattedLength} m`,
      specAndNotes || '—',
    ];
  });

  // Render Table
  autoTable(doc, {
    startY: 36,
    head: [[
      '#',
      'Código',
      'Tipo',
      'Origem (De)',
      'Destino (Para)',
      'Bitola',
      'Condutores',
      'Tensão / Função',
      'Comprimento',
      'Especificação / Observações',
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [216, 224, 232],
      lineWidth: 0.2,
      textColor: [29, 41, 53],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [23, 105, 170], // #1769aa
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 38 },
      4: { cellWidth: 38 },
      5: { cellWidth: 22 },
      6: { cellWidth: 26 },
      7: { cellWidth: 32 },
      8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(117, 132, 148);
      doc.text(
        'Cadastro de Cabos • Lista Técnica de Circuitos',
        14,
        pageHeight - 8
      );
      doc.text(`Folha ${data.pageNumber}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  // ==========================================
  // FOLHA OTIMIZADA PARA O DIAGRAMA ESQUEMÁTICO
  // ==========================================
  if (project.cables.length > 0) {
    doc.addPage('a4', 'landscape');

    // Header da Folha do Diagrama
    doc.setFillColor(18, 48, 74); // #12304a Navy
    doc.rect(14, 10, pageWidth - 28, 20, 'F');

    // Termoprol Logo Badge in Diagram Header
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, 12, 40, 16, 1.5, 1.5, 'F');
    try {
      doc.addImage(TERMOPROL_LOGO_BASE64, 'PNG', 20, 13.5, 36, 8.0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.8);
      doc.setTextColor(71, 85, 105);
      doc.text('TECNOLOGIA EM REFRIGERAÇÃO', 38, 26.5, { align: 'center' });
    } catch {}

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('DIAGRAMA ESQUEMÁTICO DE INTERLIGAÇÃO & FIAÇÃO', 64, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(216, 231, 243);
    doc.text(`PROJETO: ${projectName.toUpperCase()}`, 64, 25);

    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('FOLHA TÉCNICA DO DIAGRAMA', pageWidth - 20, 18, { align: 'right' });
    doc.text(`${project.cables.length} circuitos mapeados`, pageWidth - 20, 25, { align: 'right' });

    // Moldura Técnica de Desenho (Blueprint Border)
    const drawBoxX = 14;
    const drawBoxY = 33;
    const drawBoxW = pageWidth - 28;
    const drawBoxH = pageHeight - 48;

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(drawBoxX, drawBoxY, drawBoxW, drawBoxH);

    // Compute exact diagram layout matching the on-screen drawing (including user-dragged nodePositions)
    const { nodes, wireRoutes, bounds } = computeDiagramLayout(project.cables, {
      defaultShape: project.defaultShape,
      nodeShapes: project.nodeShapes,
      symbolScale: project.symbolScale || 0.85,
      nodeScales: project.nodeScales,
      nodePositions: project.nodePositions,
    });

    // Inner printable area reserving bottom 20mm for legend and stamp
    const padX = 12;
    const padTop = 10;
    const padBottom = 22;
    const availW = drawBoxW - padX * 2;
    const availH = drawBoxH - padTop - padBottom;

    const scale = Math.min(
      availW / Math.max(bounds.width, 240),
      availH / Math.max(bounds.height, 140)
    );
    const offsetX = drawBoxX + padX + (availW - bounds.width * scale) / 2 - bounds.minX * scale;
    const offsetY = drawBoxY + padTop + (availH - bounds.height * scale) / 2 - bounds.minY * scale;

    const toPdfX = (x: number) => x * scale + offsetX;
    const toPdfY = (y: number) => y * scale + offsetY;

    // Draw connecting wires as exact Bezier curves matching the screen
    wireRoutes.forEach(({ cable, route }) => {
      const typeCfg = CABLE_TYPES[cable.type] || CABLE_TYPES['Outro'];
      const wireHex = cable.lineColor || typeCfg.strokeColor;
      const [r, g, b] = hexToRgb(wireHex);

      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.4);

      if (cable.lineStyle === 'dashed' || (!cable.lineStyle && cable.type === 'Comunicação')) {
        doc.setLineDashPattern([2.2, 1.4], 0);
      } else if (cable.lineStyle === 'dotted') {
        doc.setLineDashPattern([0.8, 1.0], 0);
      } else {
        doc.setLineDashPattern([], 0);
      }

      const start = route.start;
      const end = route.end;
      const c1 = route.c1;
      const c2 = route.c2;

      let prevX = toPdfX(start.x);
      let prevY = toPdfY(start.y);

      // Smooth 16-step Bezier evaluation matching on-screen SVG
      for (let i = 1; i <= 16; i++) {
        const t = i / 16;
        const mt = 1 - t;
        const bx =
          mt * mt * mt * start.x +
          3 * mt * mt * t * c1.x +
          3 * mt * t * t * c2.x +
          t * t * t * end.x;
        const by =
          mt * mt * mt * start.y +
          3 * mt * mt * t * c1.y +
          3 * mt * t * t * c2.y +
          t * t * t * end.y;
        const curX = toPdfX(bx);
        const curY = toPdfY(by);

        doc.line(prevX, prevY, curX, curY);
        prevX = curX;
        prevY = curY;
      }

      // Reset dash before drawing solid arrowhead and badge
      doc.setLineDashPattern([], 0);

      // Draw arrowhead at destination
      const endPdfX = toPdfX(end.x);
      const endPdfY = toPdfY(end.y);
      const tPen = 14 / 16;
      const mtPen = 1 - tPen;
      const bxPen =
        mtPen * mtPen * mtPen * start.x +
        3 * mtPen * mtPen * tPen * c1.x +
        3 * mtPen * tPen * tPen * c2.x +
        tPen * tPen * tPen * end.x;
      const byPen =
        mtPen * mtPen * mtPen * start.y +
        3 * mtPen * mtPen * tPen * c1.y +
        3 * mtPen * tPen * tPen * c2.y +
        tPen * tPen * tPen * end.y;
      const dx = endPdfX - toPdfX(bxPen);
      const dy = endPdfY - toPdfY(byPen);
      const angle = Math.atan2(dy, dx);
      const arrowLen = 2.2;
      const arrowW = 1.1;

      doc.setFillColor(r, g, b);
      const p1x = endPdfX;
      const p1y = endPdfY;
      const p2x = endPdfX - arrowLen * Math.cos(angle) + arrowW * Math.sin(angle);
      const p2y = endPdfY - arrowLen * Math.sin(angle) - arrowW * Math.cos(angle);
      const p3x = endPdfX - arrowLen * Math.cos(angle) - arrowW * Math.sin(angle);
      const p3y = endPdfY - arrowLen * Math.sin(angle) + arrowW * Math.cos(angle);
      doc.triangle(p1x, p1y, p2x, p2y, p3x, p3y, 'F');

      // Cable Code Badge at collision-free position
      const badge = route.badge || {
        x: route.midPoint.x,
        y: route.midPoint.y,
        width: 56,
        height: 18,
        fontSize: 8.5,
      };
      const badgePdfX = toPdfX(badge.x);
      const badgePdfY = toPdfY(badge.y);
      const badgeW = Math.max(11, badge.width * scale * 0.95);
      const badgeH = Math.max(3.6, badge.height * scale * 0.95);
      const badgeFontSize = Math.max(4.5, Math.min(7.0, badge.fontSize * scale * 0.8));

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.2);
      doc.roundedRect(badgePdfX - badgeW / 2, badgePdfY - badgeH / 2, badgeW, badgeH, 0.7, 0.7, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(badgeFontSize);
      doc.setTextColor(15, 23, 42);
      doc.text(cable.code, badgePdfX, badgePdfY + badgeFontSize * 0.12, { align: 'center' });
    });

    // Reset dash pattern
    doc.setLineDashPattern([], 0);

    // Map layout nodes to exact PDF canvas dimensions
    const pdfNodes = nodes.map((node) => ({
      name: node.name,
      shape: node.shape,
      x: toPdfX(node.x),
      y: toPdfY(node.y),
      w: node.width * scale,
      h: node.height * scale,
      fontSize: Math.max(5.5, Math.min(8.5, node.fontSize * scale * 0.78)),
    }));
    pdfNodes.forEach((node) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.4);

      const x = node.x;
      const y = node.y;
      const w = node.w;
      const h = node.h;

      switch (node.shape) {
        case 'circle':
        case 'capsule':
          doc.roundedRect(x, y, w, h, h / 2, h / 2, 'FD');
          break;
        case 'hexagon': {
          const cut = 3.5;
          doc.lines(
            [
              [w - 2 * cut, 0],
              [cut, h / 2],
              [-cut, h / 2],
              [-(w - 2 * cut), 0],
              [-cut, -h / 2],
              [cut, -h / 2],
            ],
            x + cut,
            y,
            [1, 1],
            'FD',
            true
          );
          break;
        }
        case 'diamond': {
          doc.lines(
            [
              [w / 2, h / 2],
              [-w / 2, h / 2],
              [-w / 2, -h / 2],
              [w / 2, -h / 2],
            ],
            x + w / 2,
            y,
            [1, 1],
            'FD',
            true
          );
          break;
        }
        case 'rect':
          doc.rect(x, y, w, h, 'FD');
          break;
        case 'rounded-rect':
        default:
          doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
          break;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);

      let displayName = node.name;
      if (doc.getTextWidth(displayName) > w - 4) {
        while (doc.getTextWidth(displayName + '...') > w - 4 && displayName.length > 3) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      doc.text(displayName, x + w / 2, y + h / 2 + 1.2, {
        align: 'center',
      });
    });

    // Legenda de Cores de Circuitos (Bottom-Left)
    const activeTypes = Array.from(new Set(project.cables.map((c) => c.type)));
    let legendX = drawBoxX + 6;
    const legendY = drawBoxY + drawBoxH - 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('LEGENDA:', legendX, legendY + 2.5);
    legendX += 16;

    activeTypes.forEach((t) => {
      const typeCfg = CABLE_TYPES[t] || CABLE_TYPES['Outro'];
      const rgb = hexToRgb(typeCfg.strokeColor);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(legendX, legendY, 3, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text(t, legendX + 4.5, legendY + 2.4);
      legendX += doc.getTextWidth(t) + 9;
    });

    // Carimbo / Selo de Engenharia (Bottom-Right)
    const titleBoxW = 68;
    const titleBoxH = 16;
    const titleBoxX = drawBoxX + drawBoxW - titleBoxW - 4;
    const titleBoxY = drawBoxY + drawBoxH - titleBoxH - 4;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.3);
    doc.rect(titleBoxX, titleBoxY, titleBoxW, titleBoxH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(18, 48, 74);
    doc.text('CADASTRO DE CABOS • ENGENHARIA ELÉTRICA', titleBoxX + 3, titleBoxY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`PROJETO: ${projectName}`, titleBoxX + 3, titleBoxY + 8);
    doc.text(`EMISSÃO: ${nowStr}   |   REV: 00   |   ESCALA: S/ESC`, titleBoxX + 3, titleBoxY + 12);

    // Footer da Folha do Diagrama
    doc.setFontSize(8);
    doc.setTextColor(117, 132, 148);
    doc.text(
      'Cadastro de Cabos • Documento Técnico de Engenharia',
      14,
      pageHeight - 8
    );
    doc.text(
      `Folha Final (Diagrama Esquemático)`,
      pageWidth - 14,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Save and Trigger Download
  const cleanFilename = projectName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');

  const filename = `${cleanFilename || 'cadastro_cabos'}_completo_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  doc.save(filename);
}

/**
 * Exports EXCLUSIVELY the Schematic Diagram in A4 Landscape High Resolution,
 * matching exact on-screen geometry, colors, ports and node positions.
 */
export function exportDiagramOnlyToPDF(project: ProjectData): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const projectName = project.projectName.trim() || 'Sem Identificação';
  const nowStr = new Date().toLocaleDateString('pt-BR');

  // Header Box
  doc.setFillColor(18, 48, 74); // #12304a Navy
  doc.rect(14, 10, pageWidth - 28, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('DIAGRAMA ESQUEMÁTICO DE INTERLIGAÇÃO & FIAÇÃO', 20, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(216, 231, 243);
  doc.text(`PROJETO: ${projectName.toUpperCase()}`, 20, 25);

  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESENHO TÉCNICO VETORIAL', pageWidth - 20, 18, { align: 'right' });
  doc.text(`${project.cables.length} circuitos mapeados`, pageWidth - 20, 25, { align: 'right' });

  // Moldura Técnica de Desenho (Blueprint Border)
  const drawBoxX = 14;
  const drawBoxY = 33;
  const drawBoxW = pageWidth - 28;
  const drawBoxH = pageHeight - 48;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(drawBoxX, drawBoxY, drawBoxW, drawBoxH);

  if (project.cables.length > 0) {
    const { nodes, wireRoutes, bounds } = computeDiagramLayout(project.cables, {
      defaultShape: project.defaultShape,
      nodeShapes: project.nodeShapes,
      symbolScale: project.symbolScale || 0.85,
      nodeScales: project.nodeScales,
      nodePositions: project.nodePositions,
    });

    const padX = 12;
    const padTop = 10;
    const padBottom = 22;
    const availW = drawBoxW - padX * 2;
    const availH = drawBoxH - padTop - padBottom;

    const scale = Math.min(
      availW / Math.max(bounds.width, 240),
      availH / Math.max(bounds.height, 140)
    );
    const offsetX = drawBoxX + padX + (availW - bounds.width * scale) / 2 - bounds.minX * scale;
    const offsetY = drawBoxY + padTop + (availH - bounds.height * scale) / 2 - bounds.minY * scale;

    const toPdfX = (x: number) => x * scale + offsetX;
    const toPdfY = (y: number) => y * scale + offsetY;

    // Draw connecting wires as exact Bezier curves matching the screen
    wireRoutes.forEach(({ cable, route }) => {
      const typeCfg = CABLE_TYPES[cable.type] || CABLE_TYPES['Outro'];
      const wireHex = cable.lineColor || typeCfg.strokeColor;
      const [r, g, b] = hexToRgb(wireHex);

      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.42);

      if (cable.lineStyle === 'dashed' || (!cable.lineStyle && cable.type === 'Comunicação')) {
        doc.setLineDashPattern([2.2, 1.4], 0);
      } else if (cable.lineStyle === 'dotted') {
        doc.setLineDashPattern([0.8, 1.0], 0);
      } else {
        doc.setLineDashPattern([], 0);
      }

      const start = route.start;
      const end = route.end;
      const c1 = route.c1;
      const c2 = route.c2;

      let prevX = toPdfX(start.x);
      let prevY = toPdfY(start.y);

      for (let i = 1; i <= 16; i++) {
        const t = i / 16;
        const mt = 1 - t;
        const bx =
          mt * mt * mt * start.x +
          3 * mt * mt * t * c1.x +
          3 * mt * t * t * c2.x +
          t * t * t * end.x;
        const by =
          mt * mt * mt * start.y +
          3 * mt * mt * t * c1.y +
          3 * mt * t * t * c2.y +
          t * t * t * end.y;
        const curX = toPdfX(bx);
        const curY = toPdfY(by);

        doc.line(prevX, prevY, curX, curY);
        prevX = curX;
        prevY = curY;
      }

      // Reset dash before drawing solid arrowhead and badge
      doc.setLineDashPattern([], 0);

      // Arrowhead
      const endPdfX = toPdfX(end.x);
      const endPdfY = toPdfY(end.y);
      const tPen = 14 / 16;
      const mtPen = 1 - tPen;
      const bxPen =
        mtPen * mtPen * mtPen * start.x +
        3 * mtPen * mtPen * tPen * c1.x +
        3 * mtPen * tPen * tPen * c2.x +
        tPen * tPen * tPen * end.x;
      const byPen =
        mtPen * mtPen * mtPen * start.y +
        3 * mtPen * mtPen * tPen * c1.y +
        3 * mtPen * tPen * tPen * c2.y +
        tPen * tPen * tPen * end.y;
      const dx = endPdfX - toPdfX(bxPen);
      const dy = endPdfY - toPdfY(byPen);
      const angle = Math.atan2(dy, dx);
      const arrowLen = 2.4;
      const arrowW = 1.2;

      doc.setFillColor(r, g, b);
      const p1x = endPdfX;
      const p1y = endPdfY;
      const p2x = endPdfX - arrowLen * Math.cos(angle) + arrowW * Math.sin(angle);
      const p2y = endPdfY - arrowLen * Math.sin(angle) - arrowW * Math.cos(angle);
      const p3x = endPdfX - arrowLen * Math.cos(angle) - arrowW * Math.sin(angle);
      const p3y = endPdfY - arrowLen * Math.sin(angle) + arrowW * Math.cos(angle);
      doc.triangle(p1x, p1y, p2x, p2y, p3x, p3y, 'F');

      // Cable Code Badge at collision-free position
      const badge = route.badge || {
        x: route.midPoint.x,
        y: route.midPoint.y,
        width: 56,
        height: 18,
        fontSize: 8.5,
      };
      const badgePdfX = toPdfX(badge.x);
      const badgePdfY = toPdfY(badge.y);
      const badgeW = Math.max(12, badge.width * scale * 0.95);
      const badgeH = Math.max(3.8, badge.height * scale * 0.95);
      const badgeFontSize = Math.max(4.8, Math.min(7.2, badge.fontSize * scale * 0.82));

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.25);
      doc.roundedRect(badgePdfX - badgeW / 2, badgePdfY - badgeH / 2, badgeW, badgeH, 0.7, 0.7, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(badgeFontSize);
      doc.setTextColor(15, 23, 42);
      doc.text(cable.code, badgePdfX, badgePdfY + badgeFontSize * 0.12, { align: 'center' });
    });

    doc.setLineDashPattern([], 0);

    // Map and Draw Equipment Nodes
    const pdfNodes = nodes.map((node) => ({
      name: node.name,
      shape: node.shape,
      x: toPdfX(node.x),
      y: toPdfY(node.y),
      w: node.width * scale,
      h: node.height * scale,
      fontSize: Math.max(5.5, Math.min(8.5, node.fontSize * scale * 0.78)),
    }));

    pdfNodes.forEach((node) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.4);

      const x = node.x;
      const y = node.y;
      const w = node.w;
      const h = node.h;

      switch (node.shape) {
        case 'circle':
        case 'capsule':
          doc.roundedRect(x, y, w, h, h / 2, h / 2, 'FD');
          break;
        case 'hexagon': {
          const cut = 3.5;
          doc.lines(
            [
              [w - 2 * cut, 0],
              [cut, h / 2],
              [-cut, h / 2],
              [-(w - 2 * cut), 0],
              [-cut, -h / 2],
              [cut, -h / 2],
            ],
            x + cut,
            y,
            [1, 1],
            'FD',
            true
          );
          break;
        }
        case 'diamond': {
          doc.lines(
            [
              [w / 2, h / 2],
              [-w / 2, h / 2],
              [-w / 2, -h / 2],
              [w / 2, -h / 2],
            ],
            x + w / 2,
            y,
            [1, 1],
            'FD',
            true
          );
          break;
        }
        case 'rect':
          doc.rect(x, y, w, h, 'FD');
          break;
        case 'rounded-rect':
        default:
          doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
          break;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);

      let displayName = node.name;
      if (doc.getTextWidth(displayName) > w - 4) {
        while (doc.getTextWidth(displayName + '...') > w - 4 && displayName.length > 3) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      doc.text(displayName, x + w / 2, y + h / 2 + 1.2, {
        align: 'center',
      });
    });

    // Legenda de Cores de Circuitos (Bottom-Left)
    const activeTypes = Array.from(new Set(project.cables.map((c) => c.type)));
    let legendX = drawBoxX + 6;
    const legendY = drawBoxY + drawBoxH - 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('LEGENDA:', legendX, legendY + 2.5);
    legendX += 16;

    activeTypes.forEach((t) => {
      const typeCfg = CABLE_TYPES[t] || CABLE_TYPES['Outro'];
      const rgb = hexToRgb(typeCfg.strokeColor);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(legendX, legendY, 3, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text(t, legendX + 4.5, legendY + 2.4);
      legendX += doc.getTextWidth(t) + 9;
    });

    // Carimbo / Selo de Engenharia (Bottom-Right)
    const titleBoxW = 68;
    const titleBoxH = 16;
    const titleBoxX = drawBoxX + drawBoxW - titleBoxW - 4;
    const titleBoxY = drawBoxY + drawBoxH - titleBoxH - 4;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.3);
    doc.rect(titleBoxX, titleBoxY, titleBoxW, titleBoxH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(18, 48, 74);
    doc.text('CADASTRO DE CABOS • ENGENHARIA ELÉTRICA', titleBoxX + 3, titleBoxY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`PROJETO: ${projectName}`, titleBoxX + 3, titleBoxY + 8);
    doc.text(`EMISSÃO: ${nowStr}   |   REV: 00   |   ESCALA: S/ESC`, titleBoxX + 3, titleBoxY + 12);
  }

  // Footer da Folha do Diagrama
  doc.setFontSize(8);
  doc.setTextColor(117, 132, 148);
  doc.text(
    'Cadastro de Cabos • Diagrama Esquemático Unifilar / Multifilar',
    14,
    pageHeight - 8
  );
  doc.text(
    `Folha Única (Diagrama de Interligação)`,
    pageWidth - 14,
    pageHeight - 8,
    { align: 'right' }
  );

  // Save and Trigger Download
  const cleanFilename = projectName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');

  const filename = `${cleanFilename || 'diagrama_esquematico'}_diagrama_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  doc.save(filename);
}
