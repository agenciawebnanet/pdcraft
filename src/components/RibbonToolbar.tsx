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
            panel: 'CREATE',
            commands: [
              {
                id: 'sketch.tool.line',
                label: 'Line',
                icon: <PenTool className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: sketchTool === 'line',
              },
              {
                id: 'sketch.tool.rectangle',
                label: 'Rectangle',
                icon: <Square className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: sketchTool === 'rectangle',
              },
              {
                id: 'sketch.tool.circle',
                label: 'Circle',
                icon: <Circle className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: sketchTool === 'circle',
              },
              {
                id: 'sketch.tool.slot',
                label: 'Slot',
                icon: <Layers className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: sketchTool === 'slot',
              },
            ],
          },
          {
            panel: 'OPTIONS',
            commands: [
              {
                id: 'sketch.toggle_construction',
                label: 'Construction',
                icon: <Compass className="w-4 h-4" />,
                accent: tokens.surfaceInk,
                active: sketchConstruction,
              },
              {
                id: 'sketch.undo_entity',
                label: 'Undo Seg',
                icon: <RotateCw className="w-4 h-4 -scale-x-100" />,
              },
            ],
          },
          {
            panel: 'FINISH SKETCH',
            commands: [
              {
                id: 'sketch.finish',
                label: 'Finish Sketch',
                icon: <Check className="w-4 h-4" />,
                accent: tokens.sketchInk,
                active: true,
              },
              {
                id: 'sketch.cancel',
                label: 'Cancel',
                icon: <X className="w-4 h-4" />,
                accent: tokens.error,
              },
            ],
          },
        ];

      case 'MODEL':
        return [
          {
            panel: 'SKETCH',
            commands: [
              {
                id: 'sketch.create',
                label: 'New Sketch',
                icon: <PenTool className="w-4 h-4" />,
                accent: tokens.sketchInk,
              },
            ],
          },
          {
            panel: 'CREATE',
            commands: [
              { id: 'solid.extrude', label: 'Extrude', icon: <PlusSquare className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.revolve', label: 'Revolve', icon: <RotateCw className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.box', label: 'Box', icon: <Box className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.cylinder', label: 'Cylinder', icon: <Cylinder className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.sphere', label: 'Sphere', icon: <Circle className="w-4 h-4" />, accent: tokens.accent },
              { id: 'solid.hole', label: 'Hole', icon: <Circle className="w-4 h-4 stroke-dashed" />, accent: tokens.accent },
            ],
          },
          {
            panel: 'MODIFY',
            commands: [
              { id: 'solid.fillet', label: 'Fillet', icon: <Sparkles className="w-4 h-4" />, accent: tokens.surfaceInk },
              { id: 'solid.chamfer', label: 'Chamfer', icon: <Triangle className="w-4 h-4" />, accent: tokens.surfaceInk },
              { id: 'solid.shell', label: 'Shell', icon: <Layers className="w-4 h-4" />, accent: tokens.surfaceInk },
            ],
          },
          {
            panel: 'ARRANGE',
            commands: [
              { id: 'solid.pattern.circular', label: 'Circ. Pattern', icon: <Orbit className="w-4 h-4" /> },
              { id: 'solid.pattern.rectangular', label: 'Rect. Pattern', icon: <Grid className="w-4 h-4" /> },
            ],
          },
          {
            panel: 'CONFIGURE',
            commands: [
              { id: 'parameters.change', label: 'Parameters', icon: <Sliders className="w-4 h-4" />, accent: tokens.accent },
              { id: 'material.assign', label: 'Material', icon: <Palette className="w-4 h-4" /> },
            ],
          },
        ];

      case 'SURFACE':
        return [
          {
            panel: 'SKETCH',
            commands: [
              { id: 'sketch.create', label: 'New Sketch', icon: <PenTool className="w-4 h-4" />, accent: tokens.sketchInk },
            ],
          },
          {
            panel: 'CREATE',
            commands: [
              { id: 'solid.extrude', label: 'Extrude', icon: <PlusSquare className="w-4 h-4" />, accent: tokens.surfaceInk },
              { id: 'solid.revolve', label: 'Revolve', icon: <RotateCw className="w-4 h-4" />, accent: tokens.surfaceInk },
            ],
          },
          {
            panel: 'MESH',
            commands: [
              { id: 'file.insert_mesh', label: 'Insert Mesh', icon: <Upload className="w-4 h-4" /> },
              { id: 'file.save_mesh', label: 'Save As Mesh', icon: <Download className="w-4 h-4" />, accent: tokens.accent },
            ],
          },
        ];

      case 'SHEET METAL':
        return [
          {
            panel: 'SKETCH',
            commands: [
              { id: 'sketch.create', label: 'New Sketch', icon: <PenTool className="w-4 h-4" />, accent: tokens.sketchInk },
            ],
          },
          {
            panel: 'CREATE',
            commands: [
              { id: 'sheet.flange', label: 'Flange', icon: <Layers className="w-4 h-4" />, accent: tokens.sheetInk },
              { id: 'sheet.hem', label: 'Hem', icon: <Copy className="w-4 h-4" />, accent: tokens.sheetInk },
            ],
          },
          {
            panel: 'MODIFY',
            commands: [
              { id: 'solid.fillet', label: 'Corner Fillet', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'solid.hole', label: 'Punch Hole', icon: <Circle className="w-4 h-4" /> },
            ],
          },
          {
            panel: 'MANAGE',
            commands: [
              { id: 'sheet.rules', label: 'Sheet Rules', icon: <Settings2 className="w-4 h-4" />, accent: tokens.sheetInk },
            ],
          },
        ];

      case 'ASSEMBLE':
        return [
          {
            panel: 'COMPONENTS',
            commands: [
              { id: 'component.create', label: 'New Comp.', icon: <FolderPlus className="w-4 h-4" />, accent: tokens.formInk },
            ],
          },
          {
            panel: 'MOTION',
            commands: [
              { id: 'joint.drive', label: 'Drive Joint', icon: <Move3d className="w-4 h-4" />, accent: tokens.formInk },
            ],
          },
        ];

      case 'INSERT':
        return [
          {
            panel: 'FILES',
            commands: [
              { id: 'file.insert_mesh', label: 'Insert STL', icon: <Upload className="w-4 h-4" />, accent: tokens.accent },
              { id: 'file.save_mesh', label: 'Export Mesh', icon: <Download className="w-4 h-4" />, accent: tokens.accent },
            ],
          },
        ];

      case 'INSPECT':
        return [
          {
            panel: 'MEASURE',
            commands: [
              {
                id: 'inspect.measure',
                label: 'Measure',
                icon: <Ruler className="w-4 h-4" />,
                accent: tokens.accent,
                active: measureActive,
              },
              {
                id: 'component.properties',
                label: 'Mass Props',
                icon: <Wrench className="w-4 h-4" />,
                accent: tokens.accent,
              },
            ],
          },
          {
            panel: 'SECTION',
            commands: [
              {
                id: 'inspect.section',
                label: 'Section Cut',
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
            panel: 'PARAMETERS',
            commands: [
              { id: 'parameters.change', label: 'Parameters', icon: <Sliders className="w-4 h-4" />, accent: tokens.accent },
            ],
          },
          {
            panel: 'MATERIALS',
            commands: [
              { id: 'material.assign', label: 'Material', icon: <Palette className="w-4 h-4" />, accent: tokens.accent },
            ],
          },
          {
            panel: 'DESIGN',
            commands: [
              { id: 'document.units', label: 'Units', icon: <Compass className="w-4 h-4" /> },
              { id: 'component.properties', label: 'Properties', icon: <Eye className="w-4 h-4" /> },
            ],
          },
        ];

      case 'VIEW':
        return [
          {
            panel: 'VIEWS',
            commands: [
              { id: 'view.fit', label: 'Fit View', icon: <Maximize2 className="w-4 h-4" />, accent: tokens.accent },
              { id: 'view.home', label: 'Home Iso', icon: <Compass className="w-4 h-4" /> },
              {
                id: 'view.grid',
                label: 'Work Grid',
                icon: <Grid className="w-4 h-4" />,
                active: showGrid,
              },
              { id: 'view.visual_style', label: 'Visual Style', icon: <Eye className="w-4 h-4" /> },
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
      {/* Tab Row */}
      <div
        className="h-[28px] px-2 flex items-center justify-between border-b"
        style={{ borderColor: tokens.border }}
      >
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {tabsToShow.map((tab) => {
            const isSelected = tab === activeTab;
            const tabAccent = getTabAccent(tab);
            const isContextual = tab === 'SKETCH' || tab === 'SHEET METAL';
            const label =
              tab === 'SHEET METAL'
                ? 'Sheet Metal'
                : tab.charAt(0) + tab.slice(1).toLowerCase();

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
          title={tabsCollapsed ? 'Expand Ribbon' : 'Collapse Ribbon'}
        >
          {tabsCollapsed ? '▾ Ribbon' : '▴'}
        </button>
      </div>

      {/* Ribbon Tool Panels */}
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
