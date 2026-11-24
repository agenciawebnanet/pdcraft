import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Clock,
  Download,
  FilePlus,
  FolderOpen,
  Home,
  Info,
  Moon,
  Redo2,
  Save,
  Search,
  ShieldCheck,
  Sun,
  Undo2,
  X,
} from 'lucide-react';
import { PDCraftLogo } from './PDCraftLogo';
import { ThemeTokens } from '../theme/tokens';
import { DesignDocument } from '../cad/types';

interface TitleBarProps {
  tokens: ThemeTokens;
  documents: DesignDocument[];
  activeDocId: string | null;
  showHome: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onSelectHome: () => void;
  onSelectDoc: (id: string) => void;
  onCloseDoc: (id: string) => void;
  onNewDesign: () => void;
  onOpenFile: () => void;
  onSaveProject: () => void;
  onExportSTL: () => void;
  onExportOBJ: () => void;
  onExportGLB: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onOpenAbout: () => void;
  trialLabel?: string;
  isLicensed?: boolean;
  onOpenTrialModal?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  tokens,
  documents,
  activeDocId,
  showHome,
  canUndo,
  canRedo,
  onSelectHome,
  onSelectDoc,
  onCloseDoc,
  onNewDesign,
  onOpenFile,
  onSaveProject,
  onExportSTL,
  onExportOBJ,
  onExportGLB,
  onUndo,
  onRedo,
  onToggleTheme,
  onOpenCommandPalette,
  onOpenAbout,
  trialLabel,
  isLicensed,
  onOpenTrialModal,
}) => {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    if (fileMenuOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [fileMenuOpen]);

  const hasActiveDesign = !showHome && Boolean(activeDocId);

  return (
    <header
      className="h-[36px] shrink-0 flex items-center justify-between px-2 select-none relative z-40"
      style={{
        backgroundColor: tokens.appBar,
        color: tokens.appBarText,
      }}
    >
      {/* Esquerda: Marca + Menu Arquivo + Desfazer/Refazer */}
      <div className="flex items-center gap-1 min-w-0">
        <div ref={menuRef} className="relative flex items-center">
          <button
            type="button"
            onClick={() => setFileMenuOpen((v) => !v)}
            className="flex items-center gap-2 h-[28px] px-2 rounded-[5px] text-[12.5px] font-semibold tracking-tight transition-colors cursor-pointer"
            style={{
              backgroundColor: fileMenuOpen ? tokens.appBarHover : 'transparent',
            }}
            title="Menu Arquivo"
          >
            <PDCraftLogo size={17} />
            <span>PD Craft</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-75" />
          </button>

          {fileMenuOpen && (
            <div
              className="absolute left-0 top-[33px] w-60 rounded-[6px] shadow-xl border py-1 z-50 text-[12px]"
              style={{
                backgroundColor: tokens.panel,
                borderColor: tokens.border,
                color: tokens.text,
              }}
            >
              <MenuItem
                icon={<FilePlus className="w-3.5 h-3.5" />}
                label="Novo Projeto"
                shortcut="Ctrl+N"
                tokens={tokens}
                onClick={() => {
                  setFileMenuOpen(false);
                  onNewDesign();
                }}
              />
              <MenuItem
                icon={<FolderOpen className="w-3.5 h-3.5" />}
                label="Abrir (.pdcraft / .stl)…"
                shortcut="Ctrl+O"
                tokens={tokens}
                onClick={() => {
                  setFileMenuOpen(false);
                  onOpenFile();
                }}
              />
              <div className="my-1 border-t" style={{ borderColor: tokens.border }} />
              <MenuItem
                icon={<Save className="w-3.5 h-3.5" />}
                label="Salvar Projeto (.pdcraft.json)"
                shortcut="Ctrl+S"
                disabled={!hasActiveDesign}
                tokens={tokens}
                onClick={() => {
                  setFileMenuOpen(false);
                  onSaveProject();
                }}
              />
              <div className="my-1 border-t" style={{ borderColor: tokens.border }} />
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Exportar Malha
              </div>
              <MenuItem
                icon={<Download className="w-3.5 h-3.5" />}
                label="Exportar STL…"
                disabled={!hasActiveDesign}
                tokens={tokens}
                onClick={() => {
                  setFileMenuOpen(false);
                  onExportSTL();
                }}
              />
              <MenuItem
                icon={<Download className="w-3.5 h-3.5" />}
                label="Exportar OBJ…"
                disabled={!hasActiveDesign}
                tokens={tokens}
                onClick={() => {
                  setFileMenuOpen(false);
                  onExportOBJ();
                }}
              />
              <MenuItem
                icon={<Download className="w-3.5 h-3.5" />}
                label="Exportar glTF (.glb)…"
                disabled={!hasActiveDesign}
                tokens={tokens}
                onClick={() => {
                  setFileMenuOpen(false);
                  onExportGLB();
                }}
              />
              <div className="my-1 border-t" style={{ borderColor: tokens.border }} />
              <MenuItem
                icon={<Info className="w-3.5 h-3.5" />}
                label="Sobre o PD Craft"
                tokens={tokens}
                onClick={() => {
                  setFileMenuOpen(false);
                  onOpenAbout();
                }}
              />
            </div>
          )}
        </div>

        <span
          className="h-4 w-px mx-1 opacity-35"
          style={{ backgroundColor: tokens.appBarSeparator }}
        />

        {/* Desfazer / Refazer */}
        <button
          type="button"
          disabled={!canUndo || !hasActiveDesign}
          onClick={onUndo}
          className="h-[26px] w-[26px] flex items-center justify-center rounded-[5px] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
          style={{ backgroundColor: 'transparent' }}
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={!canRedo || !hasActiveDesign}
          onClick={onRedo}
          className="h-[26px] w-[26px] flex items-center justify-center rounded-[5px] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
          style={{ backgroundColor: 'transparent' }}
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <span
          className="h-4 w-px mx-1 opacity-35"
          style={{ backgroundColor: tokens.appBarSeparator }}
        />

        {/* Aba Início + Abas de Projetos */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={onSelectHome}
            className="h-[26px] px-2 rounded-[5px] flex items-center justify-center transition-colors cursor-pointer"
            style={{
              backgroundColor: showHome ? tokens.appBarTabActive : 'transparent',
            }}
            title="Início — Projetos Novos, Recentes e Exemplos"
          >
            <Home className="w-3.5 h-3.5" />
          </button>

          {documents.map((doc) => {
            const isActive = !showHome && doc.id === activeDocId;
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className="group h-[26px] max-w-[180px] pl-2.5 pr-1.5 rounded-[5px] flex items-center gap-1.5 text-[12px] cursor-pointer transition-colors"
                style={{
                  backgroundColor: isActive ? tokens.appBarTabActive : 'rgba(255,255,255,0.04)',
                  borderBottom: isActive ? `2px solid ${tokens.accent}` : '2px solid transparent',
                }}
              >
                <span className="truncate font-medium">
                  {doc.name}
                  {doc.dirty ? ' •' : ''}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseDoc(doc.id);
                  }}
                  className="w-4 h-4 rounded flex items-center justify-center opacity-55 hover:opacity-100 hover:bg-white/15 cursor-pointer"
                  title="Fechar Projeto"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onNewDesign}
            className="h-[24px] w-[24px] rounded-[5px] flex items-center justify-center text-[14px] opacity-70 hover:opacity-100 hover:bg-white/10 cursor-pointer"
            title="Nova Aba de Projeto"
          >
            +
          </button>
        </div>
      </div>

      {/* Direita: Teste 24h Cloud + Busca de Comandos + Alternar Tema */}
      <div className="flex items-center gap-1.5 shrink-0">
        {trialLabel && onOpenTrialModal && (
          <button
            type="button"
            onClick={onOpenTrialModal}
            className="h-[25px] px-2.5 rounded-[5px] flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: isLicensed
                ? 'rgba(22, 163, 74, 0.22)'
                : 'rgba(255, 255, 255, 0.1)',
              color: isLicensed ? '#86efac' : tokens.appBarText,
            }}
            title="PD Craft Cloud — Ver registro local e tempo de teste"
          >
            {isLicensed ? (
              <ShieldCheck className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3 opacity-85" />
            )}
            <span className="cad-mono">{trialLabel}</span>
          </button>
        )}

        {hasActiveDesign && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="h-[25px] px-2.5 rounded-[5px] flex items-center gap-2 text-[11.5px] opacity-85 hover:opacity-100 transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(255,255,255,0.09)' }}
            title="Buscar Comandos (Ctrl+K)"
          >
            <Search className="w-3 h-3 opacity-80" />
            <span className="hidden sm:inline">Buscar comandos…</span>
            <kbd className="text-[10px] opacity-65 px-1 py-0.5 rounded bg-black/25">Ctrl+K</kbd>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          className="h-[26px] w-[26px] rounded-[5px] flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
          title={tokens.mode === 'light' ? 'Alternar para Tema Escuro' : 'Alternar para Tema Claro'}
        >
          {tokens.mode === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  tokens: ThemeTokens;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  shortcut,
  disabled,
  tokens,
  onClick,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-default"
    style={{ color: tokens.text }}
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = tokens.hover;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
    }}
  >
    <span className="flex items-center gap-2">
      <span style={{ color: tokens.textDim }}>{icon}</span>
      <span>{label}</span>
    </span>
    {shortcut && (
      <span className="text-[10.5px]" style={{ color: tokens.textDim }}>
        {shortcut}
      </span>
    )}
  </button>
);
