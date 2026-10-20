import { Cable, CableType } from '../types';

export interface CableTypeConfig {
  type: CableType;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  strokeColor: string;
  darkColor: string;
  description: string;
}

export const CABLE_TYPES: Record<CableType, CableTypeConfig> = {
  'Potência': {
    type: 'Potência',
    label: 'Potência',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    strokeColor: '#2563eb',
    darkColor: '#1d4ed8',
    description: 'Alimentação de motores, painéis, cargas e transformadores',
  },
  'Comando': {
    type: 'Comando',
    label: 'Comando',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    strokeColor: '#6366f1',
    darkColor: '#4f46e5',
    description: 'Controle de contatores, relés, botoeiras e intertravamentos',
  },
  'Sinal': {
    type: 'Sinal',
    label: 'Sinal',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-200',
    strokeColor: '#0d9488',
    darkColor: '#0f766e',
    description: 'Entradas/saídas digitais (DI/DO), sensores indutivos e fins de curso',
  },
  'Comunicação': {
    type: 'Comunicação',
    label: 'Comunicação',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    strokeColor: '#9333ea',
    darkColor: '#7e22ce',
    description: 'Redes industriais Ethernet, PROFINET, Modbus, Profibus, CANopen',
  },
  'Instrumentação': {
    type: 'Instrumentação',
    label: 'Instrumentação',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    strokeColor: '#d97706',
    darkColor: '#b45309',
    description: 'Sinais analógicos 4–20 mA, 0–10 V, RTD PT100, células de carga',
  },
  'Aterramento': {
    type: 'Aterramento',
    label: 'Aterramento',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    strokeColor: '#16a34a',
    darkColor: '#15803d',
    description: 'Condutores de proteção (PE), malha de terra e equipotencialização',
  },
  'Outro': {
    type: 'Outro',
    label: 'Outro',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    strokeColor: '#64748b',
    darkColor: '#475569',
    description: 'Cabos especiais, ópticos ou aplicações não classificadas',
  },
};

export interface LineColorPreset {
  label: string;
  color: string;
  description: string;
}

export const PRESET_LINE_COLORS: LineColorPreset[] = [
  { label: 'Azul Comando / Neutro', color: '#2563eb', description: 'Comando 24VCC, neutro ou retorno' },
  { label: 'Vermelho Fase / Emergência', color: '#dc2626', description: 'Fase, emergência ou parada' },
  { label: 'Preto Potência', color: '#0f172a', description: 'Potência trifásica ou fase principal' },
  { label: 'Verde Proteção PE', color: '#16a34a', description: 'Condutor de proteção (Terra)' },
  { label: 'Laranja Tensão Externa', color: '#ea580c', description: 'Alimentação externa intertravada' },
  { label: 'Roxo / Violeta Instrumentação', color: '#9333ea', description: 'Instrumentação analógica 4-20mA' },
  { label: 'Amarelo Intertravamento', color: '#ca8a04', description: 'Intertravamentos elétricos' },
  { label: 'Ciano Rede / Fieldbus', color: '#0891b2', description: 'Rede digital de comunicação' },
  { label: 'Rosa Auxiliar Especial', color: '#db2777', description: 'Circuitos auxiliares' },
  { label: 'Cinza Blindado / Controle', color: '#475569', description: 'Cabos blindados ou gerais' },
];

export const COMMON_GAUGES = [
  '0,75 mm²',
  '1,0 mm²',
  '1,5 mm²',
  '2,5 mm²',
  '4 mm²',
  '6 mm²',
  '10 mm²',
  '16 mm²',
  '25 mm²',
  '35 mm²',
  '50 mm²',
  '70 mm²',
  'Cat6 Industrial',
];

export const COMMON_CONDUCTORS = [
  '1 Condutor',
  '2 x 1,5 mm²',
  '3F + PE',
  '3F + N + PE',
  '4 x 1,5 mm²',
  '4 x 2,5 mm²',
  '12 x 1,0 mm²',
  '1P x 0,75 mm² (Blindado)',
  '2P x 0,75 mm²',
  '4P x 24 AWG',
];

export const COMMON_VOLTAGES = [
  '24 Vcc',
  '110 Vca',
  '220 Vca',
  '380 Vca',
  '440 Vca',
  '0,6/1 kV',
];

export const SAMPLE_CABLES: Cable[] = [
  {
    id: 'c-001',
    code: 'CAB-001',
    type: 'Potência',
    origin: 'QGBT-01 / Disjuntor Geral',
    destination: 'CCM-01 / Entrada Principal',
    gauge: '35 mm²',
    conductors: '3F + N + PE',
    voltage: '380 Vca',
    signal: 'Alimentação Principal CCM',
    spec: 'EPR/PVC 0,6/1kV flexível, antichama',
    length: 38.5,
    notes: 'Passagem por eletrocalha metálica superior setor A',
  },
  {
    id: 'c-002',
    code: 'CAB-002',
    type: 'Potência',
    origin: 'CCM-01 / Inversor INV-01',
    destination: 'Motor Bomba B-101',
    gauge: '4 mm²',
    conductors: '3F + PE',
    voltage: '380 Vca',
    signal: 'Potência PWM Inversor',
    spec: 'Blindado fita de cobre 1kV (VFD)',
    length: 22.0,
    notes: 'Aterramento da blindagem 360° em ambas as extremidades',
  },
  {
    id: 'c-003',
    code: 'CAB-003',
    type: 'Comando',
    origin: 'CCM-01 / Gaveta 01',
    destination: 'Botoeira Campo CS-101',
    gauge: '1,5 mm²',
    conductors: '4 x 1,5 mm²',
    voltage: '24 Vcc',
    signal: 'Comando Liga/Desliga e Emergência',
    spec: 'Cabo de comando flexível vias numeradas',
    length: 19.5,
    notes: 'Contato de emergência NF em série',
  },
  {
    id: 'c-004',
    code: 'CAB-004',
    type: 'Instrumentação',
    origin: 'Transmissor Pressão PT-101',
    destination: 'CLP-01 / Cartão AI-01',
    gauge: '0,75 mm²',
    conductors: '1P x 0,75 mm²',
    voltage: '24 Vcc',
    signal: 'Sinal 4–20 mA Pressão Linha',
    spec: 'Par trançado blindado em malha + dreno',
    length: 27.0,
    notes: 'Blindagem aterrada unicamente no painel do CLP',
  },
  {
    id: 'c-005',
    code: 'CAB-005',
    type: 'Comunicação',
    origin: 'CLP-01 / Porta PN1',
    destination: 'IHM Painel Frontal',
    gauge: 'Cat6 Industrial',
    conductors: '4P x 24 AWG',
    voltage: 'N/A',
    signal: 'Rede PROFINET / TCP-IP',
    spec: 'Cabo verde industrial PUR com blindagem SF/UTP',
    length: 8.5,
    notes: 'Conectores RJ45 industriais metálicos',
  },
  {
    id: 'c-006',
    code: 'CAB-006',
    type: 'Sinal',
    origin: 'Sensor Chave Fim de Curso ZS-201',
    destination: 'CLP-01 / Cartão DI-01',
    gauge: '0,75 mm²',
    conductors: '3 x 0,75 mm²',
    voltage: '24 Vcc',
    signal: 'Status Válvula Aberta (DI-04)',
    spec: 'Cabo PP flexível resistente a óleo',
    length: 15.0,
    notes: 'Entrada digital 24Vcc tipo P (Sinking)',
  },
  {
    id: 'c-007',
    code: 'CAB-007',
    type: 'Aterramento',
    origin: 'Barramento PE CCM-01',
    destination: 'Malha de Terra Geral',
    gauge: '50 mm²',
    conductors: '1 Condutor',
    voltage: 'N/A',
    signal: 'Equipotencialização de Proteção',
    spec: 'Cobre eletrolítico isolado verde/amarelo 750V',
    length: 12.0,
    notes: 'Conexão por terminal de compressão estanhado 2 furos',
  },
];
