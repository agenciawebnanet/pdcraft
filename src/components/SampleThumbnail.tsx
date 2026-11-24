import React from 'react';
import { ThemeTokens } from '../theme/tokens';

interface SampleThumbnailProps {
  sampleId: string;
  tokens: ThemeTokens;
}

/**
 * Crisp isometric vector technical preview matching SolidCraft's figure palette tokens.
 */
export const SampleThumbnail: React.FC<SampleThumbnailProps> = ({ sampleId, tokens }) => {
  const isDark = tokens.mode === 'dark';
  const topFill = isDark ? '#6b7790' : '#ffffff';
  const leftFill = isDark ? '#515b72' : '#e4e9f0';
  const rightFill = isDark ? '#394256' : '#c9d2de';
  const stroke = isDark ? '#a3aec2' : '#556275';
  const accent = tokens.accent;

  return (
    <svg
      viewBox="0 0 240 130"
      className="w-full h-full"
      style={{ backgroundColor: isDark ? '#1c1f26' : '#f4f6f9' }}
    >
      {/* Subtle iso ground grid */}
      <g stroke={isDark ? '#2c3240' : '#e1e6ee'} strokeWidth="1">
        <line x1="20" y1="95" x2="220" y2="95" />
        <line x1="55" y1="25" x2="185" y2="115" />
        <line x1="185" y1="25" x2="55" y2="115" />
      </g>

      {sampleId === 'sample_plate' && (
        <g stroke={stroke} strokeWidth="1.3" strokeLinejoin="round">
          {/* Base plate */}
          <polygon points="120,42 186,70 120,98 54,70" fill={topFill} />
          <polygon points="54,70 120,98 120,108 54,80" fill={leftFill} />
          <polygon points="120,98 186,70 186,80 120,108" fill={rightFill} />
          {/* Corner mount holes */}
          <ellipse cx="82" cy="70" rx="5" ry="2.8" fill={rightFill} />
          <ellipse cx="158" cy="70" rx="5" ry="2.8" fill={rightFill} />
          <ellipse cx="120" cy="54" rx="5" ry="2.8" fill={rightFill} />
          <ellipse cx="120" cy="86" rx="5" ry="2.8" fill={rightFill} />
          {/* Center bored boss */}
          <path d="M98,47 L98,66 A22,11 0 0,0 142,66 L142,47 Z" fill={leftFill} />
          <ellipse cx="120" cy="47" rx="22" ry="11" fill={topFill} />
          <ellipse cx="120" cy="47" rx="10" ry="5" fill={rightFill} stroke={accent} />
        </g>
      )}

      {sampleId === 'sheet_bracket' && (
        <g stroke={stroke} strokeWidth="1.3" strokeLinejoin="round">
          {/* Base flange */}
          <polygon points="118,56 178,82 114,108 54,82" fill={topFill} />
          {/* Back wall */}
          <polygon points="54,82 118,56 118,26 54,52" fill={leftFill} />
          {/* Front wall */}
          <polygon points="114,108 178,82 178,52 114,78" fill={rightFill} />
          {/* Angled end tab */}
          <polygon points="178,82 196,65 196,42 178,52" fill={topFill} stroke={accent} />
          {/* Safety hem */}
          <path d="M54,52 C48,50 48,44 54,44 L118,18 C122,18 122,24 118,26 Z" fill={accent} fillOpacity="0.28" />
        </g>
      )}

      {sampleId === 'hinge_assembly' && (
        <g stroke={stroke} strokeWidth="1.3" strokeLinejoin="round">
          {/* Leaf A flat */}
          <polygon points="52,82 106,62 132,74 78,94" fill={topFill} />
          <polygon points="52,82 78,94 78,100 52,88" fill={leftFill} />
          {/* Leaf B rotated 60 deg */}
          <polygon points="106,62 150,24 176,36 132,74" fill="#d0ac58" fillOpacity="0.45" />
          <polygon points="132,74 176,36 180,41 136,79" fill={rightFill} />
          {/* Knuckle barrel */}
          <ellipse cx="106" cy="62" rx="5.5" ry="7" fill={leftFill} />
          <path d="M106,55 L134,67 A5.5,7 0 0,1 130,78 L102,66 Z" fill={accent} fillOpacity="0.35" />
          {/* Joint arc indicator */}
          <path d="M90,74 A26,26 0 0,1 124,42" fill="none" stroke={accent} strokeDasharray="3 2" strokeWidth="1.5" />
        </g>
      )}

      {sampleId === 'plastic_enclosure' && (
        <g stroke={stroke} strokeWidth="1.3" strokeLinejoin="round">
          {/* Outer shell */}
          <polygon points="120,32 184,58 120,84 56,58" fill={topFill} />
          <polygon points="56,58 120,84 120,108 56,82" fill={leftFill} />
          <polygon points="120,84 184,58 184,82 120,108" fill={rightFill} />
          {/* Inner cavity */}
          <polygon points="120,38 172,58 120,78 68,58" fill={rightFill} />
          {/* Screw bosses */}
          <ellipse cx="94" cy="58" rx="6" ry="3.2" fill={topFill} />
          <ellipse cx="146" cy="58" rx="6" ry="3.2" fill={topFill} />
          {/* Snap fit */}
          <rect x="116" y="34" width="8" height="12" fill={accent} fillOpacity="0.45" />
        </g>
      )}

      {sampleId === 'bolted_flange' && (
        <g stroke={stroke} strokeWidth="1.3" strokeLinejoin="round">
          {/* Flange disc */}
          <path d="M62,74 L62,84 A58,28 0 0,0 178,84 L178,74 Z" fill={rightFill} />
          <ellipse cx="120" cy="74" rx="58" ry="28" fill={topFill} />
          {/* Bolt circle pattern (6 holes) */}
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const hx = 120 + Math.cos(rad) * 42;
            const hy = 74 + Math.sin(rad) * 19;
            return <ellipse key={deg} cx={hx} cy={hy} rx="4.5" ry="2.4" fill={rightFill} />;
          })}
          {/* Raised hub */}
          <path d="M96,46 L96,72 A24,12 0 0,0 144,72 L144,46 Z" fill={leftFill} />
          <ellipse cx="120" cy="46" rx="24" ry="12" fill={topFill} />
          <ellipse cx="120" cy="46" rx="11" ry="5.5" fill={rightFill} stroke={accent} />
        </g>
      )}

      {sampleId === 'vent_plate' && (
        <g stroke={stroke} strokeWidth="1.3" strokeLinejoin="round">
          <polygon points="120,36 190,66 120,96 50,66" fill={topFill} />
          <polygon points="50,66 120,96 120,104 50,74" fill={leftFill} />
          <polygon points="120,96 190,66 190,74 120,104" fill={rightFill} />
          {/* 3x3 array of slanted vent slots */}
          {[-1, 0, 1].map((r) =>
            [-1, 0, 1].map((c) => {
              const cx = 120 + c * 22 + r * 14;
              const cy = 66 + c * 9 - r * 7;
              return (
                <line
                  key={`${r}_${c}`}
                  x1={cx - 7}
                  y1={cy - 3}
                  x2={cx + 7}
                  y2={cy + 3}
                  stroke={accent}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              );
            })
          )}
        </g>
      )}
    </svg>
  );
};
