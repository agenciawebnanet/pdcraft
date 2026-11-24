import React, { useState } from 'react';
import {
  Box,
  Check,
  Circle,
  Compass,
  Copy,
  Cylinder,
  Download,
  Eye,
  FolderPlus,
  Grid,
  Layers,
  Maximize2,
  Move3d,
  Orbit,
  Palette,
  PenTool,
  PlusSquare,
  RotateCw,
  Ruler,
  Scissors,
  Settings2,
  Sliders,
  Sparkles,
  Square,
  Triangle,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { ThemeTokens } from '../theme/tokens';
import { RibbonTab } from '../cad/types';

export interface RibbonCommandDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent?: string;
  active?: boolean;
  disabled?: boolean;
}

interface RibbonSectionDef {
  panel: string;
  commands: RibbonCommandDef[];
}

interface RibbonToolbarProps {
  tokens: ThemeTokens;
  activeTab: RibbonTab;
  isSketching: boolean;
  sketchTool: 'select' | 'line' | 'rectangle' | 'circle' | 'slot';
  sketchConstruction: boolean;
  measureActive: boolean;
  sectionActive: boolean;
  showGrid: boolean;
  tabsCollapsed: boolean;
  onSelectTab: (tab: RibbonTab) => void;
  onToggleCollapse: () => void;
  onRunCommand: (commandId: string) => void;
}

const DESIGN_TABS: RibbonTab[] = [
  'MODEL',
  'SURFACE',
  'SHEET METAL',
  'ASSEMBLE',
  'INSERT',
  'INSPECT',
  'MANAGE',
  'VIEW',
];

const TAB_LABELS_PT: Record<RibbonTab, string> = {
  MODEL: 'Modelo',
  SKETCH: 'Esboço',
  SURFACE: 'Superfície',
  'SHEET METAL': 'Chapa Metálica',
  ASSEMBLE: 'Montagem',
  INSERT: 'Inserir',
  INSPECT: 'Inspecionar',
  MANAGE: 'Gerenciar',
  VIEW: 'Visualizar',
};

export const RibbonToolbar: React.FC<RibbonToolbarProps> = ({
  tokens,
  activeTab,
  isSketching,
  sketchTool,
  sketchConstruction,
  measureActive,
  sectionActive,
  showGrid,
  tabsCollapsed,
  onSelectTab,
  onToggleCollapse,
  onRunCommand,
}) => {
  const [hoverTab, setHoverTab] = useState<string | null>(null);

  const tabsToShow: RibbonTab[] = isSketching
    ? ['MODEL', 'SKETCH', 'SURFACE', 'SHEET METAL', 'ASSEMBLE', 'INSERT', 'INSPECT', 'MANAGE', 'VIEW']
    : DESIGN_TABS;

  const getTabAccent = (tab: RibbonTab) => {
    if (tab === 'SKETCH') return tokens.sketchInk;
    if (tab === 'SHEET METAL') return tokens.sheetInk;
    if (tab === 'SURFACE') return tokens.surfaceInk;
    return tokens.accent;
  };

  const getSections = (tab: RibbonTab): RibbonSectionDef[] => {
    switch (tab) {
      case 'SKETCH':
        return [
          {
            panel: 'CRIAR',
            commands: [
              {
                id: 'sketch.tool.line',
                label: 'Linha',
                icon: <PenTool className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: sketchTool === 'line',
              },
              {
                id: 'sketch.tool.rectangle',
                label: 'Retângulo',
                icon: <Square className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: sketchTool === 'rectangle',
              },
              {
                id: 'sketch.tool.circle',
                label: 'Círculo',
                icon: <Circle className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: sketchTool === 'circle',
              },
              {
                id: 'sketch.tool.slot',
                label: 'Rasgo',
                icon: <Layers className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: sketchTool === 'slot',
              },
            ],
          },
          {
            panel: 'OPÇÕES',
            commands: [
              {
                id: 'sketch.toggle_construction',
                label: 'Construção',
                icon: <Compass className="w-4 h-4" />,
                accent: tokens.surfaceInk,
                active: sketchConstruction,
              },
              {
                id: 'sketch.undo_entity',
                label: 'Desfazer Seg.',
                icon: <RotateCw className="w-4 h-4 -scale-x-100" />,
              },
            ],
          },
          {
            panel: 'CONCLUIR ESBOÇO',
            commands: [
              {
                id: 'sketch.finish',
                label: 'Concluir',
                icon: <Check className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: true,
              },
              {
                id: 'sketch.cancel',
                label: 'Cancelar',
                icon: <X className="w-4 h-4" />,
                accent: tokens.error,
              },
            ],
          },
        ];

      case 'MODEL':
        return [
          {
            panel: 'ESBOÇO',
            commands: [
              {
                id: 'sketch.create',
                label: 'Novo Esboço',
                icon: <PenTool className="w-4 h-4" />,
                accent: tokens.sketchInk,
              },
            ],
          },
          {
            panel: 'CRIAR',
            commands: [
              { id: 'solid.extrude', label: 'Extrusão', icon: <PlusSquare className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.revolve', label: 'Revolução', icon: <RotateCw className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.box', label: 'Caixa', icon: <Box className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.cylinder', label: 'Cilindro', icon: <Cylinder className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.sphere', label: 'Esfera', icon: <Circle className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.hole', label: 'Furo', icon: <Circle className="w-4 h-4 stroke-dashed" />, accent: tokens.accent },
            ],
          },
          {
            panel: 'MODIFICAR',
            commands: [
              { id: 'solid.fillet', label: 'Filete', icon: <Sparkles className="w-4 h-4" />, accent: tokens.surfaceInk },
              { id: 'solid.chamfer', label: 'Chanfro', icon: <Triangle className="w-4 h-4" />, accent: tokens.surfaceInk },
              { id: 'solid.shell', label: 'Casca', icon: <Layers className="w-4 h-4" />, accent: tokens.surfaceInk },
            ],
          },
          {
            panel: 'ORGANIZAR',
            commands: [
              { id: 'solid.pattern.circular', label: 'Padrão Circ.', icon: <Orbit className="w-4 h-4" /> },
              { id: 'solid.pattern.rectangular', label: 'Padrão Ret.', icon: <Grid className="w-4 h-4" /> },
            ],
          },
          {
            panel: 'CONFIGURAR',
            commands: [
              { id: 'parameters.change', label: 'Parâmetros', icon: <Sliders className="w-4 h-4" />, accent: tokens.accent },
              { id: 'material.assign', label: 'Material', icon: <Palette className="w-4 h-4" /> },
            ],
          },
        ];

      case 'SURFACE':
        return [
          {
            panel: 'ESBOÇO',
            commands: [
              { id: 'sketch.create', label: 'Novo Esboço', icon: <PenTool className="w-4 h-4" />, accent: tokens.sketchInk },
            ],
          },
          {
            panel: 'CRIAR',
            commands: [
              { id: 'solid.extrude', label: 'Extrusão', icon: <PlusSquare className="w-4 h-4" />, accent: tokens.surfaceInk },
              { id: 'solid.revolve', label: 'Revolução', icon: <RotateCw className="w-4 h-4" />, accent: tokens.surfaceInk },
            ],
          },
          {
            panel: 'MALHA',
            commands: [
              { id: 'file.insert_mesh', label: 'Inserir Malha', icon: <Upload className="w-4 h-4" /> },
              { id: 'file.save_mesh', label: 'Exportar Malha', icon: <Download className="w-4 h-4" />, accent: tokens.accent },
            ],
          },
        ];

      case 'SHEET METAL':
        return [
          {
            panel: 'ESBOÇO',
            commands: [
              { id: 'sketch.create', label: 'Novo Esboço', icon: <PenTool className="w-4 h-4" />, accent: tokens.sketchInk },
            ],
          },
          {
            panel: 'CRIAR',
            commands: [
              { id: 'sheet.flange', label: 'Aba / Flange', icon: <Layers className="w-4 h-4" />, accent: tokens.sheetInk },
              { id: 'sheet.hem', label: 'Bainha', icon: <Copy className="w-4 h-4" />, accent: tokens.sheetInk },
            ],
          },
          {
            panel: 'MODIFICAR',
            commands: [
              { id: 'solid.fillet', label: 'Filete Canto', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'solid.hole', label: 'Puncionar Furo', icon: <Circle className="w-4 h-4" /> },
            ],
          },
          {
            panel: 'GERENCIAR',
            commands: [
              { id: 'sheet.rules', label: 'Regras Chapa', icon: <Settings2 className="w-4 h-4" />, accent: tokens.sheetInk },
            ],
          },
        ];

      case 'ASSEMBLE':
        return [
          {
            panel: 'COMPONENTES',
            commands: [
              { id: 'component.create', label: 'Novo Comp.', icon: <FolderPlus className="w-4 h-4" />, accent: tokens.formInk },
            ],
          },
          {
            panel: 'MOVIMENTO',
            commands: [
              { id: 'joint.drive', label: 'Acionar Junta', icon: <Move3d className="w-4 h-4" />, accent: tokens.formInk },
            ],
          },
        ];

      case 'INSERT':
        return [
          {
            panel: 'ARQUIVOS',
            commands: [
              { id: 'file.insert_mesh', label: 'Inserir STL', icon: <Upload className="w-4 h-4" />, accent: tokens.accent },
              { id: 'file.save_mesh', label: 'Exportar Malha', icon: <Download className="w-4 h-4" />, accent: tokens.accent },
            ],
          },
        ];

      case 'INSPECT':
        return [
          {
            panel: 'MEDIR',
            commands: [
              {
                id: 'inspect.measure',
                label: 'Medir',
                icon: <Ruler className="w-4 h-4" />,
                accent: tokens.accent,
                active: measureActive,
              },
              {
                id: 'component.properties',
                label: 'Prop. Massa',
                icon: <Wrench className="w-4 h-4" />,
                accent: tokens.accent,
              },
            ],
          },
          {
            panel: 'SEÇÃO',
            commands: [
              {
                id: 'inspect.section',
                label: 'Corte Seção',
                icon: <Scissors className="w-4 h-4" />,
                accent: tokens.surfaceInk,
                active: sectionActive,
              },
            ],
          },
        ];

      case 'MANAGE':
        return [
          {
            panel: 'PARÂMETROS',
            commands: [
              { id: 'parameters.change', label: 'Parâmetros', icon: <Sliders className="w-4 h-4" />, accent: tokens.accent },
            ],
          },
          {
            panel: 'MATERIAIS',
            commands: [
              { id: 'material.assign', label: 'Material', icon: <Palette className="w-4 h-4" />, accent: tokens.accent },
            ],
          },
          {
            panel: 'PROJETO',
            commands: [
              { id: 'document.units', label: 'Unidades', icon: <Compass className="w-4 h-4" /> },
              { id: 'component.properties', label: 'Propriedades', icon: <Eye className="w-4 h-4" /> },
            ],
          },
        ];

      case 'VIEW':
        return [
          {
            panel: 'VISTAS',
            commands: [
              { id: 'view.fit', label: 'Ajustar Vista', icon: <Maximize2 className="w-4 h-4" />, accent: tokens.accent },
              { id: 'view.home', label: 'Início Iso', icon: <Compass className="w-4 h-4" /> },
              {
                id: 'view.grid',
                label: 'Grade',
                icon: <Grid className="w-4 h-4" />,
                active: showGrid,
              },
              { id: 'view.visual_style', label: 'Estilo Visual', icon: <Eye className="w-4 h-4" /> },
            ],
          },
        ];
    }
  };

  const sections = getSections(activeTab);

  return (
    <div
      className="shrink-0 border-b select-none z-30"
      style={{
        backgroundColor: tokens.toolbar,
        borderColor: tokens.border,
        color: tokens.text,
      }}
    >
      {/* Linha de Abas */}
      <div
        className="h-[28px] px-2 flex items-center justify-between border-b"
        style={{ borderColor: tokens.border }}
      >
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {tabsToShow.map((tab) => {
            const isSelected = tab === activeTab;
            const tabAccent = getTabAccent(tab);
            const isContextual = tab === 'SKETCH' || tab === 'SHEET METAL';
            const label = TAB_LABELS_PT[tab];

            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                onMouseEnter={() => setHoverTab(tab)}
                onMouseLeave={() => setHoverTab(null)}
                className="relative h-[26px] px-3 text-[11.5px] font-semibold tracking-wide rounded-t-[4px] transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: isSelected
                    ? isContextual && tab === 'SKETCH'
                      ? tokens.sketchSoft
                      : tokens.panel
                    : hoverTab === tab
                    ? tokens.hover
                    : 'transparent',
                  color: isSelected
                    ? isContextual
                      ? tabAccent
                      : tokens.text
                    : tab === 'SKETCH'
                    ? tokens.sketchInk
                    : tokens.textDim,
                }}
              >
                {label}
                {isSelected && (
                  <span
                    className="absolute left-1.5 right-1.5 bottom-0 h-[2px] rounded-full"
                    style={{ backgroundColor: tabAccent }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="px-2 py-0.5 text-[10.5px] rounded hover:opacity-100 opacity-65 cursor-pointer"
          style={{ color: tokens.textDim }}
          title={tabsCollapsed ? 'Expandir Faixa de Ferramentas' : 'Recolher Faixa de Ferramentas'}
        >
          {tabsCollapsed ? '▾ Faixa' : '▴'}
        </button>
      </div>

      {/* Painéis de Ferramentas */}
      {!tabsCollapsed && (
        <div className="h-[62px] px-2.5 flex items-stretch gap-1 overflow-x-auto no-scrollbar">
          {sections.map((section, idx) => (
            <React.Fragment key={section.panel}>
              {idx > 0 && (
                <div
                  className="my-2 w-px shrink-0"
                  style={{ backgroundColor: tokens.border }}
                />
              )}
              <div className="flex flex-col justify-between px-1.5 py-1 shrink-0">
                <div className="flex items-center gap-1">
                  {section.commands.map((cmd) => (
                    <button
                      key={cmd.id}
                      type="button"
                      disabled={cmd.disabled}
                      onClick={() => onRunCommand(cmd.id)}
                      className="h-[38px] min-w-[48px] px-2 rounded-[5px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer disabled:opacity-35"
                      style={{
                        backgroundColor: cmd.active ? tokens.accentSoft : 'transparent',
                        color: cmd.active ? tokens.selectedInk : tokens.text,
                        border: cmd.active
                          ? `1px solid ${cmd.accent || tokens.accent}`
                          : '1px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!cmd.active && !cmd.disabled) {
                          e.currentTarget.style.backgroundColor = tokens.hover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!cmd.active) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                      title={cmd.label}
                    >
                      <span style={{ color: cmd.accent || tokens.text }}>{cmd.icon}</span>
                      <span className="text-[10px] font-medium leading-none whitespace-nowrap">
                        {cmd.label}
                      </span>
                    </button>
                  ))}
                </div>
                <div
                  className="text-[9px] font-semibold tracking-wider text-center uppercase opacity-60 leading-none"
                  style={{ color: tokens.textDim }}
                >
                  {section.panel}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
