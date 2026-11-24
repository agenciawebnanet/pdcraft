import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DARK_TOKENS, getMaterialSpec, LIGHT_TOKENS, ThemeMode } from './theme/tokens';
import {
  CadFeature,
  CadParameter,
  DesignDocument,
  DesignUnit,
  NavPreset,
  PlaneName,
  RibbonTab,
  SampleDesignMeta,
  SketchData,
  VisualStyle,
} from './cad/types';
import { evaluateDocument } from './cad/evaluator';
import { createEmptyDesign } from './cad/samples';
import {
  exportDocumentJSON,
  exportGLB,
  exportOBJ,
  exportSTL,
  parseSTLBuffer,
} from './cad/exporters';
import { TitleBar } from './components/TitleBar';
import { HomePage } from './components/HomePage';
import { RibbonToolbar } from './components/RibbonToolbar';
import { BrowserTree } from './components/BrowserTree';
import { CadViewport, CameraPreset } from './components/CadViewport';
import { ActiveDialogKind, FeatureDialog } from './components/FeatureDialog';
import { TimelineBar } from './components/TimelineBar';
import { StatusBar } from './components/StatusBar';
import {
  AboutModal,
  CommandPaletteModal,
  PaletteCommand,
} from './components/CommandPaletteModal';
import { TrialDetailsModal, TrialExpiredGate } from './components/TrialGate';
import {
  appendTrialLog,
  evaluateRegistryState,
  formatRemainingDurationPtBr,
  getRemainingTrialMs,
  initializeTrialRegistrySync,
  LocalTrialRegistry,
  mergeWithIndexedDbRegistry,
  persistTrialRegistry,
  readIndexedDbRegistry,
  verifyActivationKey,
} from './utils/trialManager';

const STORAGE_RECENT_KEY = 'pdcraft_recent_designs_v1';
const STORAGE_THEME_KEY = 'pdcraft_theme_v1';

const PALETTE_COMMANDS: PaletteCommand[] = [
  { id: 'sketch.create', label: 'Novo Esboço', category: 'Esboço', shortcut: 'S' },
  { id: 'solid.extrude', label: 'Extrusão', category: 'Sólido', shortcut: 'E' },
  { id: 'solid.box', label: 'Criar Caixa', category: 'Sólido' },
  { id: 'solid.cylinder', label: 'Criar Cilindro', category: 'Sólido' },
  { id: 'solid.sphere', label: 'Criar Esfera', category: 'Sólido' },
  { id: 'solid.fillet', label: 'Filete nas Arestas', category: 'Modificar' },
  { id: 'solid.chamfer', label: 'Chanfro nas Arestas', category: 'Modificar' },
  { id: 'solid.shell', label: 'Casca (Shell)', category: 'Modificar' },
  { id: 'solid.hole', label: 'Furo', category: 'Criar' },
  { id: 'solid.pattern.circular', label: 'Padrão Circular', category: 'Organizar' },
  { id: 'solid.pattern.rectangular', label: 'Padrão Retangular', category: 'Organizar' },
  { id: 'sheet.flange', label: 'Aba em Chapa Metálica', category: 'Chapa Metálica' },
  { id: 'sheet.hem', label: 'Bainha em Chapa Metálica', category: 'Chapa Metálica' },
  { id: 'parameters.change', label: 'Tabela de Parâmetros', category: 'Gerenciar', shortcut: 'P' },
  { id: 'material.assign', label: 'Atribuir Material Físico', category: 'Gerenciar' },
  { id: 'inspect.measure', label: 'Medir Distância', category: 'Inspecionar', shortcut: 'M' },
  { id: 'inspect.section', label: 'Alternar Corte de Seção', category: 'Inspecionar' },
  { id: 'component.properties', label: 'Propriedades de Massa', category: 'Inspecionar' },
  { id: 'view.fit', label: 'Enquadrar Modelo na Vista', category: 'Visualizar', shortcut: 'F' },
  { id: 'view.grid', label: 'Alternar Grade de Trabalho', category: 'Visualizar' },
  { id: 'file.save_mesh', label: 'Exportar STL / OBJ / glTF', category: 'Arquivo' },
];

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });
  const tokens = themeMode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;

  const [documents, setDocuments] = useState<DesignDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showHome, setShowHome] = useState<boolean>(true);
  const [recentDocs, setRecentDocs] = useState<DesignDocument[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_RECENT_KEY);
      return raw ? (JSON.parse(raw) as DesignDocument[]) : [];
    } catch {
      return [];
    }
  });

  // Undo / Redo stacks per doc ID
  const [undoStacks, setUndoStacks] = useState<Record<string, DesignDocument[]>>({});
  const [redoStacks, setRedoStacks] = useState<Record<string, DesignDocument[]>>({});

  // UI workspace state
  const [activeTab, setActiveTab] = useState<RibbonTab>('MODEL');
  const [returnTab, setReturnTab] = useState<RibbonTab>('MODEL');
  const [tabsCollapsed, setTabsCollapsed] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialogKind>(null);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Sketching state
  const [activeSketchId, setActiveSketchId] = useState<string | null>(null);
  const [sketchTool, setSketchTool] = useState<'select' | 'line' | 'rectangle' | 'circle' | 'slot'>('rectangle');
  const [sketchConstruction, setSketchConstruction] = useState(false);

  // Viewport tool state
  const [measureActive, setMeasureActive] = useState(false);
  const [navPreset, setNavPreset] = useState<NavPreset>('PDCraft');
  const [cameraCommand, setCameraCommand] = useState<{ preset: CameraPreset; seq: number } | null>(null);
  const [fitCommandSeq, setFitCommandSeq] = useState(0);
  const [isPlayingHistory, setIsPlayingHistory] = useState(false);

  // Modals
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Pronto — Selecione um corpo, dê duplo clique num plano para esboçar ou pressione Ctrl+K');

  // PD Craft Cloud — Registro local & Teste 24h
  const [trialRegistry, setTrialRegistry] = useState<LocalTrialRegistry>(() =>
    initializeTrialRegistrySync()
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeDocId) ?? null,
    [documents, activeDocId]
  );

  const evaluated = useMemo(
    () => (activeDoc ? evaluateDocument(activeDoc) : null),
    [activeDoc]
  );

  const activeSketch = useMemo(
    () =>
      activeDoc && activeSketchId
        ? activeDoc.sketches.find((s) => s.id === activeSketchId) ?? null
        : null,
    [activeDoc, activeSketchId]
  );

  // Save theme preference
  useEffect(() => {
    localStorage.setItem(STORAGE_THEME_KEY, themeMode);
  }, [themeMode]);

  // Reconciliar registro local com IndexedDB ao iniciar
  useEffect(() => {
    let active = true;
    readIndexedDbRegistry().then((idbReg) => {
      if (!active || !idbReg) return;
      setTrialRegistry((curr) => mergeWithIndexedDbRegistry(curr, idbReg));
    });
    return () => {
      active = false;
    };
  }, []);

  // Ticker de verificação das 24h e persistência periódica do registro local
  useEffect(() => {
    let tickCount = 0;
    const checkNow = (forcePersist = false) => {
      const t = Date.now();
      setNowMs(t);
      setTrialRegistry((curr) => {
        const next = evaluateRegistryState(curr, t);
        if (forcePersist || next.status !== curr.status || next.logs.length !== curr.logs.length) {
          persistTrialRegistry(next);
        }
        return next;
      });
    };

    const timer = setInterval(() => {
      tickCount += 1;
      checkNow(tickCount % 15 === 0);
    }, 1000);

    const onVisibility = () => checkNow(true);
    window.addEventListener('focus', onVisibility);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onVisibility);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleLogEvent = useCallback((event: string, detail: string) => {
    setTrialRegistry((curr) => appendTrialLog(curr, event, detail));
  }, []);

  const handleActivateLicenseKey = useCallback(
    (candidateKey: string): boolean => {
      if (!verifyActivationKey(trialRegistry.registrationId, candidateKey)) {
        setTrialRegistry((curr) =>
          appendTrialLog(curr, 'CHAVE_INVALIDA', 'Tentativa de ativação com chave inválida.')
        );
        return false;
      }
      const now = Date.now();
      setTrialRegistry((curr) => {
        const updated = appendTrialLog(
          {
            ...curr,
            status: 'licensed',
            licenseKey: candidateKey.trim().toUpperCase(),
            activatedAt: now,
          },
          'LICENCA_ATIVADA',
          'Licença paga ativada na máquina local.'
        );
        persistTrialRegistry(updated);
        return updated;
      });
      return true;
    },
    [trialRegistry.registrationId]
  );

  // Save recent documents safely
  const recordRecent = useCallback((doc: DesignDocument) => {
    setRecentDocs((prev) => {
      const next = [{ ...doc, savedAt: Date.now() }, ...prev.filter((d) => d.id !== doc.id)].slice(0, 9);
      try {
        localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(next));
      } catch {
        // Ignore quota errors on large imported STLs
      }
      return next;
    });
  }, []);

  // Mutate active document with undo tracking
  const updateActiveDoc = useCallback(
    (updater: (prev: DesignDocument) => DesignDocument, recordUndo = true) => {
      if (!activeDocId) return;
      setDocuments((prevDocs) =>
        prevDocs.map((d) => {
          if (d.id !== activeDocId) return d;
          if (recordUndo) {
            setUndoStacks((u) => ({
              ...u,
              [d.id]: [...(u[d.id] ?? []).slice(-29), d],
            }));
            setRedoStacks((r) => ({ ...r, [d.id]: [] }));
          }
          return { ...updater(d), dirty: true };
        })
      );
    },
    [activeDocId]
  );

  const handleUndo = useCallback(() => {
    if (!activeDoc) return;
    const stack = undoStacks[activeDoc.id] ?? [];
    if (stack.length === 0) return;
    const previous = stack[stack.length - 1];
    setUndoStacks((u) => ({ ...u, [activeDoc.id]: stack.slice(0, -1) }));
    setRedoStacks((r) => ({
      ...r,
      [activeDoc.id]: [...(r[activeDoc.id] ?? []), activeDoc],
    }));
    setDocuments((docs) => docs.map((d) => (d.id === activeDoc.id ? previous : d)));
    setStatusMessage('Desfazer aplicado');
  }, [activeDoc, undoStacks]);

  const handleRedo = useCallback(() => {
    if (!activeDoc) return;
    const stack = redoStacks[activeDoc.id] ?? [];
    if (stack.length === 0) return;
    const nextDoc = stack[stack.length - 1];
    setRedoStacks((r) => ({ ...r, [activeDoc.id]: stack.slice(0, -1) }));
    setUndoStacks((u) => ({
      ...u,
      [activeDoc.id]: [...(u[activeDoc.id] ?? []), activeDoc],
    }));
    setDocuments((docs) => docs.map((d) => (d.id === activeDoc.id ? nextDoc : d)));
    setStatusMessage('Refazer aplicado');
  }, [activeDoc, redoStacks]);

  const openDocument = useCallback(
    (doc: DesignDocument) => {
      setDocuments((prev) => {
        const exists = prev.some((d) => d.id === doc.id);
        return exists ? prev.map((d) => (d.id === doc.id ? doc : d)) : [...prev, doc];
      });
      setActiveDocId(doc.id);
      setShowHome(false);
      setActiveDialog(null);
      setActiveSketchId(null);
      setSelectedBodyId(null);
      setActiveTab(doc.features.some((f) => f.kind.startsWith('sheet.')) ? 'SHEET METAL' : 'MODEL');
      recordRecent(doc);
      handleLogEvent('PROJETO_ABERTO', `Projeto aberto: ${doc.name}`);
      setTimeout(() => setFitCommandSeq((n) => n + 1), 60);
      setStatusMessage(`Aberto: ${doc.name}`);
    },
    [recordRecent, handleLogEvent]
  );

  const handleNewDesign = useCallback(() => {
    const count = documents.length + 1;
    const doc = createEmptyDesign(`Projeto ${count}`);
    openDocument(doc);
  }, [documents.length, openDocument]);

  const handleOpenSample = useCallback(
    (sample: SampleDesignMeta) => {
      const doc = sample.build();
      doc.id = `${sample.id}_${Date.now().toString(36)}`;
      openDocument(doc);
    },
    [openDocument]
  );

  const handleCloseDoc = (id: string) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (activeDocId === id) {
        if (next.length > 0) {
          setActiveDocId(next[next.length - 1].id);
        } else {
          setActiveDocId(null);
          setShowHome(true);
        }
      }
      return next;
    });
  };

  // File Open (.pdcraft.json / .json / .stl)
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (lower.endsWith('.json')) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as DesignDocument;
        if (parsed && Array.isArray(parsed.features)) {
          parsed.id = `import_${Date.now()}`;
          openDocument(parsed);
          return;
        }
      } catch {
        setStatusMessage('Arquivo JSON de projeto inválido');
      }
    } else if (lower.endsWith('.stl')) {
      const buf = await file.arrayBuffer();
      const positions = parseSTLBuffer(buf);
      if (positions.length > 0) {
        const baseDoc = activeDoc && !showHome ? activeDoc : createEmptyDesign(file.name.replace(/\.stl$/i, ''));
        const newFeat: CadFeature = {
          id: `stl_${Date.now()}`,
          kind: 'imported.mesh',
          name: file.name,
          componentId: baseDoc.components[0]?.id ?? 'root',
          params: { body_name: file.name.replace(/\.stl$/i, ''), positions },
        };
        if (activeDoc && !showHome) {
          updateActiveDoc((d) => ({
            ...d,
            features: [...d.features, newFeat],
            rollbackIndex: d.features.length + 1,
          }));
          setTimeout(() => setFitCommandSeq((n) => n + 1), 60);
        } else {
          baseDoc.features.push(newFeat);
          baseDoc.rollbackIndex = baseDoc.features.length;
          openDocument(baseDoc);
        }
        setStatusMessage(`STL importado (${(positions.length / 9).toLocaleString('pt-BR')} triângulos)`);
      }
    }
  };

  // Iniciar Esboço no Plano
  const startSketchOnPlane = useCallback(
    (plane: PlaneName) => {
      if (!activeDoc) return;
      const skId = `sk_${Date.now()}`;
      const skName = `Esboço${activeDoc.sketches.length + 1}`;
      const newSketch: SketchData = {
        id: skId,
        name: skName,
        plane,
        entities: [],
        visible: true,
      };
      const newFeat: CadFeature = {
        id: `f_${Date.now()}`,
        kind: 'sketch',
        name: skName,
        componentId: activeDoc.components[0]?.id ?? 'root',
        params: { sketchId: skId },
      };
      updateActiveDoc((d) => ({
        ...d,
        sketches: [...d.sketches, newSketch],
        features: [...d.features, newFeat],
        rollbackIndex: d.features.length + 1,
      }));
      setReturnTab(activeTab === 'SKETCH' ? 'MODEL' : activeTab);
      setActiveSketchId(skId);
      setActiveTab('SKETCH');
      setSketchTool('rectangle');
      setActiveDialog(null);
      setCameraCommand({
        preset: plane === 'XY' ? 'top' : plane === 'XZ' ? 'front' : 'right',
        seq: Date.now(),
      });
      setStatusMessage(`Editando ${skName} no plano ${plane} — clique em dois pontos para desenhar`);
    },
    [activeDoc, activeTab, updateActiveDoc]
  );

  // Command dispatcher (Ribbon & Ctrl+K)
  const runCommand = useCallback(
    (cmdId: string) => {
      if (!activeDoc || showHome) return;

      switch (cmdId) {
        case 'sketch.create':
          setActiveDialog({ type: 'sketch.create' });
          break;
        case 'sketch.tool.line':
          setSketchTool('line');
          break;
        case 'sketch.tool.rectangle':
          setSketchTool('rectangle');
          break;
        case 'sketch.tool.circle':
          setSketchTool('circle');
          break;
        case 'sketch.tool.slot':
          setSketchTool('slot');
          break;
        case 'sketch.toggle_construction':
          setSketchConstruction((v) => !v);
          break;
        case 'sketch.undo_entity':
          if (activeSketch) {
            updateActiveDoc((d) => ({
              ...d,
              sketches: d.sketches.map((s) =>
                s.id === activeSketch.id ? { ...s, entities: s.entities.slice(0, -1) } : s
              ),
            }));
          }
          break;
        case 'sketch.finish':
          setActiveSketchId(null);
          setActiveTab(returnTab);
          setCameraCommand({ preset: 'iso', seq: Date.now() });
          setStatusMessage('Esboço concluído — use Extrusão ou Revolução para gerar o sólido 3D');
          break;
        case 'sketch.cancel':
          if (activeSketch && activeSketch.entities.length === 0) {
            updateActiveDoc((d) => ({
              ...d,
              sketches: d.sketches.filter((s) => s.id !== activeSketch.id),
              features: d.features.filter((f) => f.params?.sketchId !== activeSketch.id),
              rollbackIndex: Math.max(0, d.features.length - 1),
            }));
          }
          setActiveSketchId(null);
          setActiveTab(returnTab);
          setStatusMessage('Esboço fechado');
          break;
        case 'solid.extrude':
          setActiveDialog({ type: 'solid.extrude' });
          break;
        case 'solid.box':
          setActiveDialog({ type: 'solid.box' });
          break;
        case 'solid.cylinder':
          setActiveDialog({ type: 'solid.cylinder' });
          break;
        case 'solid.sphere':
          setActiveDialog({ type: 'solid.sphere' });
          break;
        case 'solid.revolve':
          updateActiveDoc((d) => {
            const f: CadFeature = {
              id: `f_${Date.now()}`,
              kind: 'solid.revolve',
              name: `Revolução ${d.features.length + 1}`,
              componentId: d.components[0]?.id ?? 'root',
              params: { angle: 360, sketchId: d.sketches[0]?.id },
            };
            return { ...d, features: [...d.features, f], rollbackIndex: d.features.length + 1 };
          });
          setStatusMessage('Operação de Revolução criada');
          break;
        case 'solid.fillet':
          setActiveDialog({ type: 'solid.fillet' });
          break;
        case 'solid.chamfer':
          setActiveDialog({ type: 'solid.chamfer' });
          break;
        case 'solid.shell':
          setActiveDialog({ type: 'solid.shell' });
          break;
        case 'solid.hole':
          setActiveDialog({ type: 'solid.hole' });
          break;
        case 'solid.pattern.circular':
          setActiveDialog({ type: 'solid.pattern.circular' });
          break;
        case 'solid.pattern.rectangular':
          setActiveDialog({ type: 'solid.pattern.rectangular' });
          break;
        case 'sheet.flange':
          setActiveDialog({ type: 'sheet.flange' });
          break;
        case 'sheet.hem':
          setActiveDialog({ type: 'sheet.hem' });
          break;
        case 'parameters.change':
          setActiveDialog({ type: 'parameters' });
          break;
        case 'material.assign':
          setActiveDialog({ type: 'material' });
          break;
        case 'component.properties':
          setActiveDialog({ type: 'properties' });
          break;
        case 'component.create':
          updateActiveDoc((d) => ({
            ...d,
            components: [
              ...d.components,
              {
                id: `comp_${Date.now()}`,
                name: `Componente${d.components.length + 1}`,
                visible: true,
                material: 'Aluminum',
              },
            ],
          }));
          setStatusMessage('Novo componente adicionado à montagem');
          break;
        case 'inspect.measure':
          setMeasureActive((v) => !v);
          setStatusMessage('Ferramenta Medir ativa — clique em dois pontos na vista 3D');
          break;
        case 'inspect.section':
          updateActiveDoc((d) => ({ ...d, sectionEnabled: !d.sectionEnabled }), false);
          break;
        case 'view.fit':
          setFitCommandSeq((n) => n + 1);
          break;
        case 'view.home':
          setCameraCommand({ preset: 'iso', seq: Date.now() });
          break;
        case 'view.grid':
          updateActiveDoc((d) => ({ ...d, showGrid: !d.showGrid }), false);
          break;
        case 'view.visual_style': {
          const order: VisualStyle[] = ['shaded_edges', 'shaded', 'wireframe', 'xray'];
          const namesPt: Record<VisualStyle, string> = {
            shaded_edges: 'Sombreado + Arestas',
            shaded: 'Sombreado',
            wireframe: 'Aramado',
            xray: 'Raio-X',
          };
          const next = order[(order.indexOf(activeDoc.visualStyle) + 1) % order.length];
          updateActiveDoc((d) => ({ ...d, visualStyle: next }), false);
          setStatusMessage(`Estilo visual: ${namesPt[next]}`);
          break;
        }
        case 'file.insert_mesh':
          fileInputRef.current?.click();
          break;
        case 'file.save_mesh':
          setActiveDialog({ type: 'export_mesh' });
          break;
        default:
          setStatusMessage(`Comando: ${cmdId}`);
      }
    },
    [activeDoc, showHome, activeSketch, returnTab, updateActiveDoc]
  );

  // Timeline playback effect
  useEffect(() => {
    if (!isPlayingHistory || !activeDoc) return;
    const timer = setInterval(() => {
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id !== activeDoc.id) return d;
          if (d.rollbackIndex >= d.features.length) {
            setIsPlayingHistory(false);
            return d;
          }
          return { ...d, rollbackIndex: d.rollbackIndex + 1 };
        })
      );
    }, 550);
    return () => clearInterval(timer);
  }, [isPlayingHistory, activeDoc]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (trialRegistry.status === 'expired') return;
      const target = e.target as HTMLElement | null;
      const isInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!showHome && activeDoc) setPaletteOpen((v) => !v);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isInput) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isInput) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (isInput) return;

      if (e.key === 'f' || e.key === 'F') {
        setFitCommandSeq((n) => n + 1);
      } else if (e.key === 'Escape') {
        if (paletteOpen) setPaletteOpen(false);
        else if (activeDialog) setActiveDialog(null);
        else if (measureActive) setMeasureActive(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [trialRegistry.status, showHome, activeDoc, handleUndo, handleRedo, paletteOpen, activeDialog, measureActive]);

  if (trialRegistry.status === 'expired') {
    return (
      <TrialExpiredGate
        tokens={tokens}
        registry={trialRegistry}
        onSupportClick={() =>
          handleLogEvent(
            'SUPORTE_WHATSAPP',
            'Cliente direcionado ao suporte WhatsApp (66) 99977-5501 após fim das 24h.'
          )
        }
        onActivateKey={handleActivateLicenseKey}
      />
    );
  }

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: tokens.panel, color: tokens.text }}
    >
      {/* Hidden file picker for .pdcraft.json / .stl */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.stl"
        className="hidden"
        onChange={handleFilePicked}
      />

      {/* Top Application Title Bar */}
      <TitleBar
        tokens={tokens}
        documents={documents}
        activeDocId={activeDocId}
        showHome={showHome}
        canUndo={Boolean(activeDoc && (undoStacks[activeDoc.id]?.length ?? 0) > 0)}
        canRedo={Boolean(activeDoc && (redoStacks[activeDoc.id]?.length ?? 0) > 0)}
        onSelectHome={() => setShowHome(true)}
        onSelectDoc={(id) => {
          setActiveDocId(id);
          setShowHome(false);
        }}
        onCloseDoc={handleCloseDoc}
        onNewDesign={handleNewDesign}
        onOpenFile={() => fileInputRef.current?.click()}
        onSaveProject={() => {
          if (activeDoc) {
            exportDocumentJSON(activeDoc);
            handleLogEvent('EXPORTACAO', `Projeto salvo em JSON: ${activeDoc.name}`);
          }
        }}
        onExportSTL={() => {
          if (activeDoc && evaluated) {
            exportSTL(activeDoc, evaluated, true);
            handleLogEvent('EXPORTACAO', `Malha STL exportada: ${activeDoc.name}`);
          }
        }}
        onExportOBJ={() => {
          if (activeDoc && evaluated) {
            exportOBJ(activeDoc, evaluated);
            handleLogEvent('EXPORTACAO', `Malha OBJ exportada: ${activeDoc.name}`);
          }
        }}
        onExportGLB={() => {
          if (activeDoc && evaluated) {
            exportGLB(activeDoc, evaluated);
            handleLogEvent('EXPORTACAO', `Malha glTF exportada: ${activeDoc.name}`);
          }
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleTheme={() => setThemeMode((m) => (m === 'light' ? 'dark' : 'light'))}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        trialLabel={
          trialRegistry.status === 'licensed'
            ? 'Cloud Ativo'
            : `Teste 24h: ${formatRemainingDurationPtBr(getRemainingTrialMs(trialRegistry, nowMs))}`
        }
        isLicensed={trialRegistry.status === 'licensed'}
        onOpenTrialModal={() => setTrialModalOpen(true)}
      />

      {/* Body: Either Home Start Page or Full CAD Workspace */}
      {showHome || !activeDoc || !evaluated ? (
        <HomePage
          tokens={tokens}
          recentDocs={recentDocs}
          onNewDesign={handleNewDesign}
          onOpenFile={() => fileInputRef.current?.click()}
          onOpenSample={handleOpenSample}
          onOpenRecent={(doc) => openDocument({ ...doc, id: `${doc.id}_reopen_${Date.now()}` })}
          onRemoveRecent={(id) => {
            const next = recentDocs.filter((d) => d.id !== id);
            setRecentDocs(next);
            localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(next));
          }}
        />
      ) : (
        <>
          <RibbonToolbar
            tokens={tokens}
            activeTab={activeTab}
            isSketching={Boolean(activeSketch)}
            sketchTool={sketchTool}
            sketchConstruction={sketchConstruction}
            measureActive={measureActive}
            sectionActive={activeDoc.sectionEnabled}
            showGrid={activeDoc.showGrid}
            tabsCollapsed={tabsCollapsed}
            onSelectTab={(tab) => setActiveTab(tab)}
            onToggleCollapse={() => setTabsCollapsed((v) => !v)}
            onRunCommand={runCommand}
          />

          {/* Main Workspace Split: Browser | 3D CAD Viewport | Feature Dialog */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <BrowserTree
              tokens={tokens}
              doc={activeDoc}
              evaluated={evaluated}
              selectedBodyId={selectedBodyId}
              activeSketchId={activeSketchId}
              onSelectBody={(id) => {
                setSelectedBodyId(id);
                if (id) {
                  const b = evaluated.bodies.find((x) => x.id === id);
                  if (b) {
                    setStatusMessage(
                      `${b.name} — ${getMaterialSpec(b.material).label} • ${b.massGrams.toFixed(1)} g • ${(b.volumeMm3 / 1000).toFixed(2)} cm³`
                    );
                  }
                }
              }}
              onToggleComponentVisible={(compId) =>
                updateActiveDoc(
                  (d) => ({
                    ...d,
                    components: d.components.map((c) =>
                      c.id === compId ? { ...c, visible: !c.visible } : c
                    ),
                  }),
                  false
                )
              }
              onToggleOrigin={(key) =>
                updateActiveDoc(
                  (d) => ({
                    ...d,
                    originVisible: { ...d.originVisible, [key]: !d.originVisible[key] },
                  }),
                  false
                )
              }
              onToggleSketchVisible={(skId) =>
                updateActiveDoc(
                  (d) => ({
                    ...d,
                    sketches: d.sketches.map((s) =>
                      s.id === skId ? { ...s, visible: !s.visible } : s
                    ),
                  }),
                  false
                )
              }
              onEditSketch={(skId) => {
                setReturnTab(activeTab === 'SKETCH' ? 'MODEL' : activeTab);
                setActiveSketchId(skId);
                setActiveTab('SKETCH');
                const sk = activeDoc.sketches.find((s) => s.id === skId);
                if (sk) {
                  setCameraCommand({
                    preset: sk.plane === 'XY' ? 'top' : sk.plane === 'XZ' ? 'front' : 'right',
                    seq: Date.now(),
                  });
                }
              }}
              onStartSketchOnPlane={startSketchOnPlane}
              onOpenParameters={() => setActiveDialog({ type: 'parameters' })}
              onOpenMaterial={() => setActiveDialog({ type: 'material' })}
              onOpenProperties={() => setActiveDialog({ type: 'properties' })}
            />

            <CadViewport
              tokens={tokens}
              doc={activeDoc}
              evaluated={evaluated}
              selectedBodyId={selectedBodyId}
              activeSketch={activeSketch}
              sketchTool={sketchTool}
              sketchConstruction={sketchConstruction}
              measureActive={measureActive}
              navPreset={navPreset}
              cameraCommand={cameraCommand}
              fitCommandSeq={fitCommandSeq}
              onSelectBody={(id) => setSelectedBodyId(id)}
              onSelectPlaneForSketch={startSketchOnPlane}
              onAddSketchEntity={(ent) => {
                if (!activeSketch) return;
                updateActiveDoc((d) => ({
                  ...d,
                  sketches: d.sketches.map((s) =>
                    s.id === activeSketch.id ? { ...s, entities: [...s.entities, ent] } : s
                  ),
                }));
                setStatusMessage(`Entidade adicionada a ${activeSketch.name}`);
              }}
              onChangeVisualStyle={(style) =>
                updateActiveDoc((d) => ({ ...d, visualStyle: style }), false)
              }
              onToggleGrid={() =>
                updateActiveDoc((d) => ({ ...d, showGrid: !d.showGrid }), false)
              }
              onToggleSection={() =>
                updateActiveDoc((d) => ({ ...d, sectionEnabled: !d.sectionEnabled }), false)
              }
              onChangeSectionHeight={(h) =>
                updateActiveDoc((d) => ({ ...d, sectionHeight: h }), false)
              }
              onToggleMeasure={() => setMeasureActive((v) => !v)}
              onChangeJointAngle={(deg) =>
                updateActiveDoc((d) => ({ ...d, jointAngleDeg: deg }), false)
              }
              onCameraPreset={(preset) => setCameraCommand({ preset, seq: Date.now() })}
              onFitView={() => setFitCommandSeq((n) => n + 1)}
            />

            <FeatureDialog
              tokens={tokens}
              kind={activeDialog}
              doc={activeDoc}
              evaluated={evaluated}
              onClose={() => setActiveDialog(null)}
              onStartSketch={startSketchOnPlane}
              onCreateFeature={(kind, params) => {
                const feat: CadFeature = {
                  id: `f_${Date.now()}`,
                  kind: kind as CadFeature['kind'],
                  name: params.body_name || kind.split('.').pop() || 'Operação',
                  componentId: activeDoc.components[0]?.id ?? 'root',
                  params,
                };
                updateActiveDoc((d) => ({
                  ...d,
                  features: [...d.features.slice(0, d.rollbackIndex), feat, ...d.features.slice(d.rollbackIndex)],
                  rollbackIndex: d.rollbackIndex + 1,
                }));
                setActiveDialog(null);
                setStatusMessage(`Operação criada: ${feat.name}`);
              }}
              onUpdateParameters={(params: CadParameter[]) => {
                updateActiveDoc((d) => ({ ...d, parameters: params }));
                setActiveDialog(null);
                setStatusMessage('Parâmetros atualizados — modelo reconstruído');
              }}
              onAssignMaterial={(compId, material) => {
                updateActiveDoc((d) => ({
                  ...d,
                  components: d.components.map((c) =>
                    c.id === compId ? { ...c, material } : c
                  ),
                }));
                setActiveDialog(null);
                setStatusMessage(`Material atribuído: ${getMaterialSpec(material).label}`);
              }}
              onExportMesh={(fmt) => {
                if (fmt === 'stl') exportSTL(activeDoc, evaluated, true);
                if (fmt === 'obj') exportOBJ(activeDoc, evaluated);
                if (fmt === 'glb') exportGLB(activeDoc, evaluated);
                setActiveDialog(null);
                setStatusMessage(`Exportado: ${activeDoc.name}.${fmt}`);
              }}
            />
          </div>

          <TimelineBar
            tokens={tokens}
            features={activeDoc.features}
            rollbackIndex={activeDoc.rollbackIndex}
            selectedFeatureId={selectedFeatureId}
            isPlaying={isPlayingHistory}
            onSetRollback={(idx) => {
              setIsPlayingHistory(false);
              updateActiveDoc((d) => ({ ...d, rollbackIndex: idx }), false);
            }}
            onTogglePlay={() => {
              if (!isPlayingHistory && activeDoc.rollbackIndex >= activeDoc.features.length) {
                updateActiveDoc((d) => ({ ...d, rollbackIndex: 0 }), false);
              }
              setIsPlayingHistory((v) => !v);
            }}
            onSelectFeature={(f) => {
              setSelectedFeatureId(f.id);
              setStatusMessage(`Operação: ${f.name} — botão direito para suprimir`);
            }}
            onToggleSuppress={(fId) =>
              updateActiveDoc((d) => ({
                ...d,
                features: d.features.map((f) =>
                  f.id === fId ? { ...f, suppressed: !f.suppressed } : f
                ),
              }))
            }
          />

          <StatusBar
            tokens={tokens}
            statusMessage={statusMessage}
            activeSketchName={activeSketch?.name ?? null}
            sketchEntityCount={activeSketch?.entities.length ?? 0}
            units={activeDoc.units}
            navPreset={navPreset}
            onChangeUnits={(units: DesignUnit) =>
              updateActiveDoc((d) => ({ ...d, units }), false)
            }
            onChangeNavPreset={setNavPreset}
          />
        </>
      )}

      <CommandPaletteModal
        tokens={tokens}
        open={paletteOpen}
        commands={PALETTE_COMMANDS}
        onClose={() => setPaletteOpen(false)}
        onSelect={runCommand}
      />

      <AboutModal tokens={tokens} open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <TrialDetailsModal
        tokens={tokens}
        open={trialModalOpen}
        registry={trialRegistry}
        nowMs={nowMs}
        onClose={() => setTrialModalOpen(false)}
        onSupportClick={() =>
          handleLogEvent('SUPORTE_WHATSAPP', 'Acesso ao suporte WhatsApp (66) 99977-5501.')
        }
        onActivateKey={handleActivateLicenseKey}
      />
    </div>
  );
}
