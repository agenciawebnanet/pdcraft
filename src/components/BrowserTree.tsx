import React, { useMemo, useState } from 'react';
import {
  Box,
  ChevronDown,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  Folder,
  Layers,
  PenTool,
  Search,
  Sliders,
} from 'lucide-react';
import { getMaterialSpec, ThemeTokens } from '../theme/tokens';
import { DesignDocument, EvaluatedDocument, PlaneName } from '../cad/types';

interface BrowserTreeProps {
  tokens: ThemeTokens;
  doc: DesignDocument;
  evaluated: EvaluatedDocument;
  selectedBodyId: string | null;
  activeSketchId: string | null;
  onSelectBody: (bodyId: string | null) => void;
  onToggleComponentVisible: (compId: string) => void;
  onToggleOrigin: (key: keyof DesignDocument['originVisible']) => void;
  onToggleSketchVisible: (sketchId: string) => void;
  onEditSketch: (sketchId: string) => void;
  onStartSketchOnPlane: (plane: PlaneName) => void;
  onOpenParameters: () => void;
  onOpenMaterial: () => void;
  onOpenProperties: () => void;
}

export const BrowserTree: React.FC<BrowserTreeProps> = ({
  tokens,
  doc,
  evaluated,
  selectedBodyId,
  activeSketchId,
  onSelectBody,
  onToggleComponentVisible,
  onToggleOrigin,
  onToggleSketchVisible,
  onEditSketch,
  onStartSketchOnPlane,
  onOpenParameters,
  onOpenMaterial,
  onOpenProperties,
}) => {
  const [search, setSearch] = useState('');
  const [openOrigin, setOpenOrigin] = useState(true);
  const [openBodies, setOpenBodies] = useState(true);
  const [openSketches, setOpenSketches] = useState(true);

  const q = search.trim().toLowerCase();

  const filteredBodies = useMemo(
    () =>
      evaluated.bodies.filter(
        (b) =>
          !q ||
          b.name.toLowerCase().includes(q) ||
          b.material.toLowerCase().includes(q) ||
          getMaterialSpec(b.material).label.toLowerCase().includes(q)
      ),
    [evaluated.bodies, q]
  );

  const filteredSketches = useMemo(
    () => doc.sketches.filter((s) => !q || s.name.toLowerCase().includes(q)),
    [doc.sketches, q]
  );

  return (
    <aside
      className="w-[244px] shrink-0 border-r flex flex-col overflow-hidden select-none"
      style={{
        backgroundColor: tokens.panel,
        borderColor: tokens.border,
        color: tokens.text,
      }}
    >
      {/* Cabeçalho + Busca */}
      <div
        className="px-2.5 py-2 border-b space-y-1.5"
        style={{ backgroundColor: tokens.panelHeader, borderColor: tokens.border }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
            Navegador
          </span>
          <button
            type="button"
            onClick={onOpenProperties}
            className="text-[10.5px] px-1.5 py-0.5 rounded hover:underline cursor-pointer"
            style={{ color: tokens.accent }}
          >
            Propriedades
          </button>
        </div>

        <div
          className="h-[26px] px-2 rounded-[5px] border flex items-center gap-1.5"
          style={{
            backgroundColor: tokens.controlFill,
            borderColor: tokens.controlBorder,
          }}
        >
          <Search className="w-3 h-3 opacity-55 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar árvore…"
            className="w-full bg-transparent text-[11.5px] outline-none"
            style={{ color: tokens.text }}
          />
        </div>
      </div>

      {/* Itens da Árvore */}
      <div className="flex-1 overflow-y-auto py-1.5 px-1 text-[12px] space-y-0.5">
        {/* Raiz do Projeto */}
        <div className="px-2 py-1 rounded flex items-center justify-between font-semibold">
          <span className="flex items-center gap-1.5 truncate">
            <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: tokens.accent }} />
            <span className="truncate">{doc.name}</span>
          </span>
          <span className="text-[10.5px] cad-mono opacity-65">{doc.units}</span>
        </div>

        {/* Atalho Parâmetros */}
        <div
          onClick={onOpenParameters}
          className="pl-6 pr-2 py-1 rounded flex items-center justify-between cursor-pointer"
          style={{ color: tokens.textDim }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3 h-3" />
            <span>Parâmetros</span>
          </span>
          <span className="text-[10.5px] cad-mono">{doc.parameters.length}</span>
        </div>

        {/* Pasta Origem */}
        <div>
          <button
            type="button"
            onClick={() => setOpenOrigin((v) => !v)}
            className="w-full px-1.5 py-1 rounded flex items-center gap-1 text-left font-medium cursor-pointer"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {openOrigin ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            <Compass className="w-3.5 h-3.5" style={{ color: tokens.surfaceInk }} />
            <span>Origem</span>
          </button>

          {openOrigin && (
            <div className="pl-6 space-y-0.5">
              <OriginRow
                label="Eixos (X / Y / Z)"
                visible={doc.originVisible.axes}
                tokens={tokens}
                onToggle={() => onToggleOrigin('axes')}
              />
              <OriginRow
                label="Plano XY"
                visible={doc.originVisible.xy}
                tokens={tokens}
                onToggle={() => onToggleOrigin('xy')}
                onDoubleClick={() => onStartSketchOnPlane('XY')}
                hint="Duplo clique: Criar Esboço"
              />
              <OriginRow
                label="Plano XZ"
                visible={doc.originVisible.xz}
                tokens={tokens}
                onToggle={() => onToggleOrigin('xz')}
                onDoubleClick={() => onStartSketchOnPlane('XZ')}
                hint="Duplo clique: Criar Esboço"
              />
              <OriginRow
                label="Plano YZ"
                visible={doc.originVisible.yz}
                tokens={tokens}
                onToggle={() => onToggleOrigin('yz')}
                onDoubleClick={() => onStartSketchOnPlane('YZ')}
                hint="Duplo clique: Criar Esboço"
              />
            </div>
          )}
        </div>

        {/* Corpos e Componentes */}
        <div>
          <button
            type="button"
            onClick={() => setOpenBodies((v) => !v)}
            className="w-full px-1.5 py-1 rounded flex items-center justify-between text-left font-medium cursor-pointer"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span className="flex items-center gap-1">
              {openBodies ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              <Folder className="w-3.5 h-3.5" style={{ color: tokens.accent }} />
              <span>Corpos</span>
            </span>
            <span className="text-[10.5px] opacity-60">{filteredBodies.length}</span>
          </button>

          {openBodies && (
            <div className="pl-4 space-y-0.5">
              {filteredBodies.length === 0 ? (
                <div className="px-2 py-1 text-[11px]" style={{ color: tokens.textDim }}>
                  Nenhum corpo sólido ainda
                </div>
              ) : (
                filteredBodies.map((body) => {
                  const selected = selectedBodyId === body.id;
                  const matLabel = getMaterialSpec(body.material).label;
                  return (
                    <div
                      key={body.id}
                      onClick={() => onSelectBody(selected ? null : body.id)}
                      className="group px-2 py-1 rounded flex items-center justify-between cursor-pointer"
                      style={{
                        backgroundColor: selected ? tokens.selectedBg : 'transparent',
                        color: selected ? tokens.selectedInk : tokens.text,
                      }}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Box className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span className="truncate font-medium">{body.name}</span>
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMaterial();
                          }}
                          className="text-[10px] px-1 py-0.5 rounded opacity-65 hover:opacity-100 cursor-pointer max-w-[68px] truncate"
                          style={{ backgroundColor: tokens.panelHeader }}
                          title="Alterar Material"
                        >
                          {matLabel}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleComponentVisible(body.componentId);
                          }}
                          className="p-0.5 rounded opacity-70 hover:opacity-100 cursor-pointer"
                          title={body.visible ? 'Ocultar Corpo' : 'Mostrar Corpo'}
                        >
                          {body.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-50" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Esboços */}
        <div>
          <button
            type="button"
            onClick={() => setOpenSketches((v) => !v)}
            className="w-full px-1.5 py-1 rounded flex items-center justify-between text-left font-medium cursor-pointer"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span className="flex items-center gap-1">
              {openSketches ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              <PenTool className="w-3.5 h-3.5" style={{ color: tokens.sketchInk }} />
              <span>Esboços</span>
            </span>
            <span className="text-[10.5px] opacity-60">{filteredSketches.length}</span>
          </button>

          {openSketches && (
            <div className="pl-4 space-y-0.5">
              {filteredSketches.length === 0 ? (
                <div className="px-2 py-1 text-[11px]" style={{ color: tokens.textDim }}>
                  Nenhum esboço ainda
                </div>
              ) : (
                filteredSketches.map((sk) => {
                  const active = activeSketchId === sk.id;
                  return (
                    <div
                      key={sk.id}
                      onDoubleClick={() => onEditSketch(sk.id)}
                      className="px-2 py-1 rounded flex items-center justify-between cursor-pointer"
                      style={{
                        backgroundColor: active ? tokens.sketchSoft : 'transparent',
                        color: active ? tokens.sketchInk : tokens.text,
                      }}
                      title="Duplo clique para editar esboço"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <PenTool className="w-3 h-3 shrink-0" style={{ color: tokens.sketchInk }} />
                        <span className="truncate">{sk.name}</span>
                        <span className="text-[10px] opacity-55">({sk.plane})</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditSketch(sk.id)}
                          className="text-[10px] px-1 rounded opacity-70 hover:opacity-100 cursor-pointer"
                          style={{ backgroundColor: tokens.panelHeader }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleSketchVisible(sk.id)}
                          className="p-0.5 rounded opacity-70 hover:opacity-100 cursor-pointer"
                        >
                          {sk.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-50" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rodapé Massa Total */}
      <div
        className="px-3 py-2 border-t text-[11px] flex items-center justify-between"
        style={{ backgroundColor: tokens.panelHeader, borderColor: tokens.border, color: tokens.textDim }}
      >
        <span>Massa Total</span>
        <span className="cad-mono font-semibold" style={{ color: tokens.text }}>
          {evaluated.totalMassGrams >= 1000
            ? `${(evaluated.totalMassGrams / 1000).toFixed(3)} kg`
            : `${evaluated.totalMassGrams.toFixed(1)} g`}
        </span>
      </div>
    </aside>
  );
};

const OriginRow: React.FC<{
  label: string;
  visible: boolean;
  tokens: ThemeTokens;
  onToggle: () => void;
  onDoubleClick?: () => void;
  hint?: string;
}> = ({ label, visible, tokens, onToggle, onDoubleClick, hint }) => (
  <div
    onDoubleClick={onDoubleClick}
    className="px-2 py-0.5 rounded flex items-center justify-between text-[11.5px] cursor-pointer"
    title={hint}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.hover)}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
  >
    <span className={visible ? '' : 'opacity-50'}>{label}</span>
    <button type="button" onClick={onToggle} className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer">
      {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-50" />}
    </button>
  </div>
);
