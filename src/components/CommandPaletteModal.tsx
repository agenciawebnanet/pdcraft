import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ThemeTokens } from '../theme/tokens';
import { PDCraftLogo } from './PDCraftLogo';

export interface PaletteCommand {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
}

interface CommandPaletteModalProps {
  tokens: ThemeTokens;
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  tokens,
  open,
  commands,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [commands, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      style={{ backgroundColor: 'rgba(15, 18, 25, 0.45)' }}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-[8px] border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: tokens.panel,
          borderColor: tokens.border,
          color: tokens.text,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="h-[42px] px-3 border-b flex items-center gap-2"
          style={{ borderColor: tokens.border }}
        >
          <Search className="w-4 h-4 opacity-60" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length > 0) {
                onSelect(filtered[0].id);
                onClose();
              }
            }}
            placeholder="Executar comando (ex: Extrusão, Filete, Parâmetros, STL)…"
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
          <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[320px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px]" style={{ color: tokens.textDim }}>
              Nenhum comando encontrado
            </div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => {
                  onSelect(cmd.id);
                  onClose();
                }}
                className="w-full px-3.5 py-2 flex items-center justify-between text-left text-[12.5px] cursor-pointer"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div>
                  <span className="font-medium">{cmd.label}</span>
                  <span className="ml-2 text-[11px]" style={{ color: tokens.textDim }}>
                    {cmd.category}
                  </span>
                </div>
                {cmd.shortcut && (
                  <kbd
                    className="text-[10.5px] px-1.5 py-0.5 rounded border cad-mono"
                    style={{ borderColor: tokens.border, color: tokens.textDim }}
                  >
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const AboutModal: React.FC<{
  tokens: ThemeTokens;
  open: boolean;
  onClose: () => void;
}> = ({ tokens, open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 18, 25, 0.5)' }}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[8px] border shadow-2xl p-6 text-center space-y-4"
        style={{
          backgroundColor: tokens.panel,
          borderColor: tokens.border,
          color: tokens.text,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <PDCraftLogo size={52} />
        </div>
        <div>
          <h2 className="text-[18px] font-bold">PD Craft</h2>
          <p className="text-[12px] mt-1" style={{ color: tokens.textDim }}>
            Estúdio CAD 3D paramétrico no navegador
          </p>
        </div>
        <div
          className="text-left text-[11.5px] rounded-[6px] border p-3 space-y-1"
          style={{ backgroundColor: tokens.panelHeader, borderColor: tokens.border }}
        >
          <div>• Esboços paramétricos e linha do tempo com retrocesso</div>
          <div>• Dimensões por expressões e materiais físicos</div>
          <div>• Chapa metálica, dobras, bainhas e recursos plásticos</div>
          <div>• Exportação STL, OBJ, glTF (.glb) e projeto JSON</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-[30px] px-5 rounded-[5px] text-[12px] font-semibold text-white cursor-pointer"
          style={{ backgroundColor: tokens.accent }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
