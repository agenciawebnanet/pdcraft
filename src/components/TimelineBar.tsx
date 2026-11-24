import React from 'react';
import {
  Box,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Circle,
  Cylinder,
  Grid,
  Layers,
  Move3d,
  Orbit,
  Pause,
  PenTool,
  Play,
  PlusSquare,
  RotateCw,
  Sparkles,
  Triangle,
} from 'lucide-react';
import { ThemeTokens } from '../theme/tokens';
import { CadFeature, FeatureKind } from '../cad/types';

interface TimelineBarProps {
  tokens: ThemeTokens;
  features: CadFeature[];
  rollbackIndex: number;
  selectedFeatureId: string | null;
  isPlaying: boolean;
  onSetRollback: (index: number) => void;
  onTogglePlay: () => void;
  onSelectFeature: (feature: CadFeature) => void;
  onToggleSuppress: (featureId: string) => void;
}

function featureIcon(kind: FeatureKind, tokens: ThemeTokens) {
  if (kind === 'sketch') return { icon: <PenTool className="w-3.5 h-3.5" />, color: tokens.sketchInk };
  if (kind.startsWith('sheet.')) return { icon: <Layers className="w-3.5 h-3.5" />, color: tokens.sheetInk };
  if (kind.startsWith('plastic.')) return { icon: <Layers className="w-3.5 h-3.5" />, color: tokens.sketchInk };
  if (kind === 'joint.revolute') return { icon: <Move3d className="w-3.5 h-3.5" />, color: tokens.formInk };
  if (kind === 'solid.fillet') return { icon: <Sparkles className="w-3.5 h-3.5" />, color: tokens.surfaceInk };
  if (kind === 'solid.chamfer') return { icon: <Triangle className="w-3.5 h-3.5" />, color: tokens.surfaceInk };
  if (kind === 'solid.shell') return { icon: <Layers className="w-3.5 h-3.5" />, color: tokens.surfaceInk };
  if (kind === 'solid.box') return { icon: <Box className="w-3.5 h-3.5" />, color: tokens.accent };
  if (kind === 'solid.cylinder') return { icon: <Cylinder className="w-3.5 h-3.5" />, color: tokens.accent };
  if (kind === 'solid.sphere') return { icon: <Circle className="w-3.5 h-3.5" />, color: tokens.accent };
  if (kind === 'solid.revolve') return { icon: <RotateCw className="w-3.5 h-3.5" />, color: tokens.accent };
  if (kind === 'solid.pattern.circular') return { icon: <Orbit className="w-3.5 h-3.5" />, color: tokens.accent };
  if (kind === 'solid.pattern.rectangular') return { icon: <Grid className="w-3.5 h-3.5" />, color: tokens.accent };
  return { icon: <PlusSquare className="w-3.5 h-3.5" />, color: tokens.accent };
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  tokens,
  features,
  rollbackIndex,
  selectedFeatureId,
  isPlaying,
  onSetRollback,
  onTogglePlay,
  onSelectFeature,
  onToggleSuppress,
}) => {
  return (
    <div
      className="h-[38px] shrink-0 border-t px-2 flex items-center gap-2 select-none"
      style={{
        backgroundColor: tokens.timeline,
        borderColor: tokens.border,
        color: tokens.text,
      }}
    >
      {/* Transport Controls */}
      <div className="flex items-center gap-0.5 shrink-0 pr-2 border-r" style={{ borderColor: tokens.border }}>
        <TransportBtn
          title="Roll to Beginning"
          disabled={rollbackIndex <= 0}
          onClick={() => onSetRollback(0)}
          tokens={tokens}
        >
          <ChevronFirst className="w-3.5 h-3.5" />
        </TransportBtn>
        <TransportBtn
          title="Step Backward"
          disabled={rollbackIndex <= 0}
          onClick={() => onSetRollback(Math.max(0, rollbackIndex - 1))}
          tokens={tokens}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </TransportBtn>
        <TransportBtn
          title={isPlaying ? 'Pause History Playback' : 'Play Feature History'}
          disabled={features.length === 0}
          onClick={onTogglePlay}
          tokens={tokens}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </TransportBtn>
        <TransportBtn
          title="Step Forward"
          disabled={rollbackIndex >= features.length}
          onClick={() => onSetRollback(Math.min(features.length, rollbackIndex + 1))}
          tokens={tokens}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </TransportBtn>
        <TransportBtn
          title="Roll to End"
          disabled={rollbackIndex >= features.length}
          onClick={() => onSetRollback(features.length)}
          tokens={tokens}
        >
          <ChevronLast className="w-3.5 h-3.5" />
        </TransportBtn>
      </div>

      {/* Feature Chips + Rollback Marker */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {rollbackIndex === 0 && <RollbackMarker tokens={tokens} />}

        {features.length === 0 ? (
          <span className="text-[11px] px-2" style={{ color: tokens.textDim }}>
            Timeline empty — create a sketch or solid feature
          </span>
        ) : (
          features.map((feat, idx) => {
            const rolledBack = idx >= rollbackIndex;
            const { icon, color } = featureIcon(feat.kind, tokens);
            const isSelected = selectedFeatureId === feat.id;

            return (
              <React.Fragment key={feat.id}>
                <div
                  onClick={() => onSelectFeature(feat)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onToggleSuppress(feat.id);
                  }}
                  className="group h-[26px] px-2 rounded-[4px] border flex items-center gap-1.5 shrink-0 cursor-pointer transition-all text-[11px]"
                  style={{
                    backgroundColor: isSelected ? tokens.selectedBg : tokens.timelineItem,
                    borderColor: isSelected ? tokens.accent : tokens.border,
                    opacity: rolledBack || feat.suppressed ? 0.42 : 1,
                    textDecoration: feat.suppressed ? 'line-through' : 'none',
                  }}
                  title={`${feat.name} (${feat.kind}) — Click to inspect, Right-click to suppress/unsuppress`}
                >
                  <span style={{ color }}>{icon}</span>
                  <span className="font-medium max-w-[110px] truncate">{feat.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetRollback(idx + 1);
                    }}
                    className="opacity-0 group-hover:opacity-75 hover:!opacity-100 text-[9.5px] px-1 rounded cursor-pointer"
                    style={{ backgroundColor: tokens.hover }}
                    title="Roll history marker to after this feature"
                  >
                    |
                  </button>
                </div>

                {rollbackIndex === idx + 1 && <RollbackMarker tokens={tokens} />}
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="text-[10.5px] cad-mono shrink-0 pl-2" style={{ color: tokens.textDim }}>
        {rollbackIndex}/{features.length}
      </div>
    </div>
  );
};

const RollbackMarker: React.FC<{ tokens: ThemeTokens }> = ({ tokens }) => (
  <div
    className="w-[3px] h-[24px] rounded-full shrink-0 mx-0.5"
    style={{ backgroundColor: tokens.accent }}
    title="History Rollback Marker"
  />
);

const TransportBtn: React.FC<{
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
  onClick: () => void;
  tokens: ThemeTokens;
}> = ({ children, title, disabled, onClick, tokens }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className="w-[24px] h-[24px] rounded flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = tokens.hover;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
    }}
  >
    {children}
  </button>
);
