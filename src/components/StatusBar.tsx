import React from 'react';
import { ThemeTokens } from '../theme/tokens';
import { DesignUnit, NavPreset } from '../cad/types';

interface StatusBarProps {
  tokens: ThemeTokens;
  statusMessage: string;
  activeSketchName: string | null;
  sketchEntityCount: number;
  units: DesignUnit;
  navPreset: NavPreset;
  onChangeUnits: (units: DesignUnit) => void;
  onChangeNavPreset: (preset: NavPreset) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  tokens,
  statusMessage,
  activeSketchName,
  sketchEntityCount,
  units,
  navPreset,
  onChangeUnits,
  onChangeNavPreset,
}) => {
  return (
    <footer
      className="h-[24px] shrink-0 border-t px-2.5 flex items-center justify-between text-[11px] select-none"
      style={{
        backgroundColor: tokens.toolbar,
        borderColor: tokens.border,
        color: tokens.textDim,
      }}
    >
      {/* Dica / Status de Seleção */}
      <div className="truncate pr-4">{statusMessage}</div>

      {/* Telemetria e Seletores à Direita */}
      <div className="flex items-center gap-3 shrink-0">
        {activeSketchName && (
          <>
            <span className="flex items-center gap-1.5" style={{ color: tokens.text }}>
              <span>Editando {activeSketchName}</span>
            </span>
            <span className="h-3 w-px" style={{ backgroundColor: tokens.border }} />
            <span
              className="flex items-center gap-1.5 font-medium"
              style={{
                color: sketchEntityCount === 0 ? tokens.textDim : tokens.sketchInk,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    sketchEntityCount === 0 ? tokens.textDim : tokens.sketchInk,
                }}
              />
              <span>
                {sketchEntityCount === 0
                  ? 'Nenhuma geometria ainda'
                  : `Esboço ativo (${sketchEntityCount} entidades)`}
              </span>
            </span>
            <span className="h-3 w-px" style={{ backgroundColor: tokens.border }} />
          </>
        )}

        <label className="flex items-center gap-1 cursor-pointer">
          <span>Unidades:</span>
          <select
            value={units}
            onChange={(e) => onChangeUnits(e.target.value as DesignUnit)}
            className="bg-transparent font-semibold outline-none cursor-pointer"
            style={{ color: tokens.text }}
          >
            <option value="mm" style={{ backgroundColor: tokens.panel }}>mm</option>
            <option value="cm" style={{ backgroundColor: tokens.panel }}>cm</option>
            <option value="m" style={{ backgroundColor: tokens.panel }}>m</option>
            <option value="in" style={{ backgroundColor: tokens.panel }}>in</option>
          </select>
        </label>

        <span className="h-3 w-px" style={{ backgroundColor: tokens.border }} />

        <label className="flex items-center gap-1 cursor-pointer">
          <span>Nav:</span>
          <select
            value={navPreset}
            onChange={(e) => onChangeNavPreset(e.target.value as NavPreset)}
            className="bg-transparent font-semibold outline-none cursor-pointer"
            style={{ color: tokens.text }}
          >
            <option value="PDCraft" style={{ backgroundColor: tokens.panel }}>PD Craft</option>
            <option value="Fusion" style={{ backgroundColor: tokens.panel }}>Fusion</option>
            <option value="Blender" style={{ backgroundColor: tokens.panel }}>Blender</option>
          </select>
        </label>
      </div>
    </footer>
  );
};
