export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  mode: ThemeMode;
  appBar: string;
  appBarText: string;
  appBarHover: string;
  appBarTabActive: string;
  appBarSeparator: string;
  toolbar: string;
  panel: string;
  panelHeader: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  accentSoft: string;
  selectedInk: string;
  selectedBg: string;
  hover: string;
  timeline: string;
  timelineItem: string;
  timelineMarker: string;
  dialogBody: string;
  dialogFooter: string;
  dialogRule: string;
  controlFill: string;
  controlBorder: string;
  sketchInk: string;
  sketchSoft: string;
  surfaceInk: string;
  surfaceSoft: string;
  sheetInk: string;
  sheetSoft: string;
  renderInk: string;
  renderSoft: string;
  formInk: string;
  formSoft: string;
  fileBackground: string;
  fileSurface: string;
  fileBorder: string;
  fileRail: string;
  fileRailHover: string;
  filePrimary: string;
  filePrimaryInk: string;
  filePrimaryBorder: string;
  viewportTop: string;
  viewportBottom: string;
  axisX: string;
  axisY: string;
  axisZ: string;
  error: string;
  warning: string;
  success: string;
}

export const LIGHT_TOKENS: ThemeTokens = {
  mode: 'light',
  appBar: '#343840',
  appBarText: '#e6eaf2',
  appBarHover: 'rgba(255, 255, 255, 0.12)',
  appBarTabActive: '#353b47',
  appBarSeparator: '#8891a0',
  toolbar: '#f6f7f9',
  panel: '#fafbfc',
  panelHeader: '#eceef2',
  border: '#d0d4dc',
  text: '#262a32',
  textDim: '#6e7480',
  accent: '#2678da',
  accentSoft: '#d6e6fa',
  selectedInk: '#1a507f',
  selectedBg: '#e8f1fa',
  hover: '#e2eaf6',
  timeline: '#e8ebf0',
  timelineItem: '#ffffff',
  timelineMarker: '#464c58',
  dialogBody: '#ffffff',
  dialogFooter: '#f4f6f9',
  dialogRule: '#e6eaf0',
  controlFill: '#ffffff',
  controlBorder: '#c3cbd6',
  sketchInk: '#057f45',
  sketchSoft: '#edf7f1',
  surfaceInk: '#a45000',
  surfaceSoft: '#fbebd8',
  sheetInk: '#1e6f96',
  sheetSoft: '#e1f0f7',
  renderInk: '#a8326e',
  renderSoft: '#f8e6ef',
  formInk: '#7349cd',
  formSoft: '#eee8fa',
  fileBackground: '#f7f9fb',
  fileSurface: '#ffffff',
  fileBorder: '#e0e5ec',
  fileRail: '#236ead',
  fileRailHover: '#2b76b4',
  filePrimary: '#e3f0fb',
  filePrimaryInk: '#1a507f',
  filePrimaryBorder: '#328bd3',
  viewportTop: '#f0f3f7',
  viewportBottom: '#cbd2dd',
  axisX: '#dc3c3c',
  axisY: '#3caa3c',
  axisZ: '#3c64e6',
  error: '#d63636',
  warning: '#de961e',
  success: '#276b2c',
};

export const DARK_TOKENS: ThemeTokens = {
  mode: 'dark',
  appBar: '#1c1f26',
  appBarText: '#e6eaf2',
  appBarHover: 'rgba(255, 255, 255, 0.11)',
  appBarTabActive: '#353b47',
  appBarSeparator: '#6f7787',
  toolbar: '#272b34',
  panel: '#272b34',
  panelHeader: '#2f343e',
  border: '#3f4552',
  text: '#dee2e8',
  textDim: '#949ba8',
  accent: '#3a88ee',
  accentSoft: '#2a466e',
  selectedInk: '#9cc7f5',
  selectedBg: '#2a466e',
  hover: '#363d4a',
  timeline: '#21252d',
  timelineItem: '#2f343e',
  timelineMarker: '#dee2e8',
  dialogBody: '#272b34',
  dialogFooter: '#2f343e',
  dialogRule: '#353b47',
  controlFill: '#1c1f26',
  controlBorder: '#4a5262',
  sketchInk: '#46be78',
  sketchSoft: '#1f3b2b',
  surfaceInk: '#e0914a',
  surfaceSoft: '#45331e',
  sheetInk: '#4fb3d9',
  sheetSoft: '#1f3a47',
  renderInk: '#e074ae',
  renderSoft: '#402336',
  formInk: '#b39bee',
  formSoft: '#372f4f',
  fileBackground: '#1f232b',
  fileSurface: '#272b34',
  fileBorder: '#3f4552',
  fileRail: '#1e5080',
  fileRailHover: '#2e6395',
  filePrimary: '#1b3048',
  filePrimaryInk: '#9cc7f5',
  filePrimaryBorder: '#3a88ee',
  viewportTop: '#2e3440',
  viewportBottom: '#232832',
  axisX: '#f27a7a',
  axisY: '#62d48e',
  axisZ: '#6ca8f7',
  error: '#f06460',
  warning: '#ecaa46',
  success: '#7fd1ae',
};

export interface PhysicalMaterialSpec {
  name: string;
  label: string;
  density: number; // g/cm³
  color: string;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  opacity?: number;
}

export const PHYSICAL_MATERIALS: PhysicalMaterialSpec[] = [
  { name: 'Default', label: 'Padrão', density: 1.29, color: '#b0bac6', metalness: 0.15, roughness: 0.45 },
  { name: 'Steel', label: 'Aço', density: 7.85, color: '#9ea4ac', metalness: 0.88, roughness: 0.28 },
  { name: 'Stainless Steel', label: 'Aço Inoxidável', density: 8.0, color: '#babfc6', metalness: 0.92, roughness: 0.22 },
  { name: 'Aluminum', label: 'Alumínio', density: 2.7, color: '#ccd0d6', metalness: 0.86, roughness: 0.26 },
  { name: 'Brass', label: 'Latão', density: 8.5, color: '#d0ac58', metalness: 0.9, roughness: 0.22 },
  { name: 'Copper', label: 'Cobre', density: 8.96, color: '#cc7a50', metalness: 0.92, roughness: 0.24 },
  { name: 'Titanium', label: 'Titânio', density: 4.43, color: '#96949e', metalness: 0.85, roughness: 0.32 },
  { name: 'Cast Iron', label: 'Ferro Fundido', density: 7.2, color: '#68686e', metalness: 0.65, roughness: 0.62 },
  { name: 'ABS Plastic', label: 'Plástico ABS', density: 1.06, color: '#deded8', metalness: 0.0, roughness: 0.42, clearcoat: 0.2 },
  { name: 'PLA', label: 'PLA', density: 1.24, color: '#6ea0de', metalness: 0.0, roughness: 0.45, clearcoat: 0.15 },
  { name: 'PETG', label: 'PETG', density: 1.27, color: '#4f96d8', metalness: 0.0, roughness: 0.28, clearcoat: 0.45 },
  { name: 'Nylon', label: 'Nylon', density: 1.14, color: '#ece6d6', metalness: 0.0, roughness: 0.55 },
  { name: 'Polycarbonate', label: 'Policarbonato', density: 1.2, color: '#c4d8e8', metalness: 0.0, roughness: 0.16, clearcoat: 0.7, opacity: 0.78 },
  { name: 'Oak', label: 'Carvalho', density: 0.75, color: '#be925c', metalness: 0.0, roughness: 0.78 },
  { name: 'Glass', label: 'Vidro', density: 2.5, color: '#aad0da', metalness: 0.05, roughness: 0.06, clearcoat: 1.0, opacity: 0.42 },
];

export function getMaterialSpec(name: string): PhysicalMaterialSpec {
  return PHYSICAL_MATERIALS.find((m) => m.name === name || m.label === name) ?? PHYSICAL_MATERIALS[0];
}
