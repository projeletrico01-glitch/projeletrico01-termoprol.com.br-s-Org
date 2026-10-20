import { Cable, ProjectData } from '../types';

export const STORAGE_KEY = 'cadastroCabos_v1';

export function loadProject(): ProjectData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const cables = Array.isArray(data.cables)
        ? data.cables.map((c: any) => ({
            id: String(c.id || crypto.randomUUID()),
            code: String(c.code || ''),
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
            sourcePort: c.sourcePort || 'auto',
            targetPort: c.targetPort || 'auto',
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.updatedAt || new Date().toISOString(),
          }))
        : [];
      return {
        projectName: data.projectName || '',
        projectCode: data.projectCode || '',
        author: data.author || '',
        company: data.company || '',
        cables,
        defaultShape: data.defaultShape || 'rounded-rect',
        nodeShapes: data.nodeShapes || {},
        symbolScale: typeof data.symbolScale === 'number' ? data.symbolScale : 1.0,
        nodeScales: data.nodeScales || {},
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('Erro ao ler dados salvos do localStorage:', error);
  }
  return {
    projectName: '',
    projectCode: '',
    author: '',
    company: '',
    cables: [],
    defaultShape: 'rounded-rect',
    nodeShapes: {},
    symbolScale: 1.0,
    nodeScales: {},
    updatedAt: new Date().toISOString(),
  };
}

export function saveProject(project: ProjectData): boolean {
  try {
    const payload = {
      projectName: project.projectName,
      projectCode: project.projectCode || '',
      author: project.author || '',
      company: project.company || '',
      cables: project.cables,
      defaultShape: project.defaultShape || 'rounded-rect',
      nodeShapes: project.nodeShapes || {},
      symbolScale: project.symbolScale ?? 1.0,
      nodeScales: project.nodeScales || {},
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error);
    return false;
  }
}

export function generateNextCode(cables: Cable[], prefix = 'CAB'): string {
  let max = 0;
  const regex = new RegExp(`^${prefix}[-_ ]?(\\d+)$`, 'i');
  for (const cable of cables) {
    const match = String(cable.code).trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    }
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export function exportToCSV(cables: Cable[], projectName?: string): void {
  const headers = [
    'Identificação',
    'Tipo',
    'Origem',
    'Destino',
    'Bitola',
    'Condutores',
    'Tensão',
    'Sinal/Função',
    'Especificação',
    'Comprimento (m)',
    'Observações',
  ];

  const escapeCSV = (val: any) => {
    const str = String(val ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = cables.map((c) => [
    escapeCSV(c.code),
    escapeCSV(c.type),
    escapeCSV(c.origin),
    escapeCSV(c.destination),
    escapeCSV(c.gauge),
    escapeCSV(c.conductors),
    escapeCSV(c.voltage),
    escapeCSV(c.signal),
    escapeCSV(c.spec),
    escapeCSV(Number(c.length || 0).toFixed(2).replace('.', ',')),
    escapeCSV(c.notes),
  ]);

  const csvContent =
    '\ufeff' +
    [headers.map(escapeCSV).join(';'), ...rows.map((r) => r.join(';'))].join(
      '\r\n'
    );

  const cleanProjectName = projectName
    ? projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    : 'cadastro_cabos';

  const filename = `${cleanProjectName}_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
}

export function exportToJSON(project: ProjectData): void {
  const exportData = {
    ...project,
    exportedAt: new Date().toISOString(),
    version: '1.0',
    totalCables: project.cables.length,
    totalLengthMeters: project.cables.reduce(
      (sum, c) => sum + (Number(c.length) || 0),
      0
    ),
  };

  const cleanProjectName = project.projectName
    ? project.projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    : 'backup_cadastro_cabos';

  const filename = `${cleanProjectName}_${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  downloadFile(
    filename,
    JSON.stringify(exportData, null, 2),
    'application/json;charset=utf-8;'
  );
}

export function downloadFile(name: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
