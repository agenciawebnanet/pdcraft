import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { getMaterialSpec, PHYSICAL_MATERIALS, ThemeTokens } from '../theme/tokens';
import {
  CadParameter,
  DesignDocument,
  EvaluatedDocument,
  FeatureOperation,
  PlaneName,
} from '../cad/types';

export type ActiveDialogKind =
  | null
  | { type: 'sketch.create' }
  | { type: 'solid.extrude' }
  | { type: 'solid.box' }
  | { type: 'solid.cylinder' }
  | { type: 'solid.sphere' }
  | { type: 'solid.fillet' }
  | { type: 'solid.chamfer' }
  | { type: 'solid.shell' }
  | { type: 'solid.hole' }
  | { type: 'solid.pattern.circular' }
  | { type: 'solid.pattern.rectangular' }
  | { type: 'sheet.flange' }
  | { type: 'sheet.hem' }
  | { type: 'parameters' }
  | { type: 'material' }
  | { type: 'properties' }
  | { type: 'export_mesh' };

interface FeatureDialogProps {
  tokens: ThemeTokens;
  kind: ActiveDialogKind;
  doc: DesignDocument;
  evaluated: EvaluatedDocument;
  onClose: () => void;
  onStartSketch: (plane: PlaneName) => void;
  onCreateFeature: (kind: string, params: Record<string, any>) => void;
  onUpdateParameters: (params: CadParameter[]) => void;
  onAssignMaterial: (componentId: string, material: string) => void;
  onExportMesh: (format: 'stl' | 'obj' | 'glb') => void;
}

export const FeatureDialog: React.FC<FeatureDialogProps> = ({
  tokens,
  kind,
  doc,
  evaluated,
  onClose,
  onStartSketch,
  onCreateFeature,
  onUpdateParameters,
  onAssignMaterial,
  onExportMesh,
}) => {
  const [plane, setPlane] = useState<PlaneName>('XY');
  const [sketchId, setSketchId] = useState<string>(doc.sketches[doc.sketches.length - 1]?.id ?? '');
  const [distance, setDistance] = useState('15 mm');
  const [operation, setOperation] = useState<FeatureOperation>('new');
  const [boxL, setBoxL] = useState('60 mm');
  const [boxW, setBoxW] = useState('40 mm');
  const [boxH, setBoxH] = useState('20 mm');
  const [cylR, setCylR] = useState('15 mm');
  const [cylH, setCylH] = useState('30 mm');
  const [sphR, setSphR] = useState('18 mm');
  const [filletR, setFilletR] = useState('2 mm');
  const [chamferD, setChamferD] = useState('1.5 mm');
  const [shellT, setShellT] = useState('2 mm');
  const [holeD, setHoleD] = useState('8 mm');
  const [holeX, setHoleX] = useState('0');
  const [holeY, setHoleY] = useState('0');
  const [patCount, setPatCount] = useState('6');
  const [patPcd, setPatPcd] = useState('50 mm');
  const [patRows, setPatRows] = useState('3');
  const [patCols, setPatCols] = useState('4');
  const [patRowPitch, setPatRowPitch] = useState('14 mm');
  const [patColPitch, setPatColPitch] = useState('20 mm');
  const [flangeH, setFlangeH] = useState('25 mm');
  const [flangeAng, setFlangeAng] = useState('90 deg');
  const [hemLen, setHemLen] = useState('8 mm');
  const [exportFmt, setExportFmt] = useState<'stl' | 'obj' | 'glb'>('stl');

  const [paramDraft, setParamDraft] = useState<CadParameter[]>(doc.parameters);
  const [newParamName, setNewParamName] = useState('');
  const [newParamExpr, setNewParamExpr] = useState('10 mm');

  const [targetCompId, setTargetCompId] = useState(doc.components[0]?.id ?? 'root');
  const [selectedMat, setSelectedMat] = useState(doc.components[0]?.material ?? 'Default');

  if (!kind) return null;

  const titleMap: Record<NonNullable<ActiveDialogKind>['type'], string> = {
    'sketch.create': 'Novo Esboço',
    'solid.extrude': 'Extrusão',
    'solid.box': 'Criar Caixa',
    'solid.cylinder': 'Criar Cilindro',
    'solid.sphere': 'Criar Esfera',
    'solid.fillet': 'Filete nas Arestas',
    'solid.chamfer': 'Chanfro nas Arestas',
    'solid.shell': 'Casca (Shell)',
    'solid.hole': 'Furo',
    'solid.pattern.circular': 'Padrão Circular',
    'solid.pattern.rectangular': 'Padrão Retangular',
    'sheet.flange': 'Aba em Chapa Metálica',
    'sheet.hem': 'Bainha em Chapa Metálica',
    parameters: 'Parâmetros',
    material: 'Material Físico',
    properties: 'Propriedades de Massa',
    export_mesh: 'Exportar Malha',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    switch (kind.type) {
      case 'sketch.create':
        onStartSketch(plane);
        break;
      case 'solid.extrude':
        onCreateFeature('solid.extrude', { sketchId, distance, operation });
        break;
      case 'solid.box':
        onCreateFeature('solid.box', { length: boxL, width: boxW, height: boxH, body_name: 'Caixa' });
        break;
      case 'solid.cylinder':
        onCreateFeature('solid.cylinder', { radius: cylR, height: cylH, body_name: 'Cilindro', operation: 'new' });
        break;
      case 'solid.sphere':
        onCreateFeature('solid.sphere', { radius: sphR, body_name: 'Esfera' });
        break;
      case 'solid.fillet':
        onCreateFeature('solid.fillet', { radius: filletR });
        break;
      case 'solid.chamfer':
        onCreateFeature('solid.chamfer', { distance: chamferD });
        break;
      case 'solid.shell':
        onCreateFeature('solid.shell', { thickness: shellT });
        break;
      case 'solid.hole':
        onCreateFeature('solid.hole', { diameter: holeD, x: holeX, y: holeY });
        break;
      case 'solid.pattern.circular':
        onCreateFeature('solid.pattern.circular', { count: patCount, pcd: patPcd });
        break;
      case 'solid.pattern.rectangular':
        onCreateFeature('solid.pattern.rectangular', {
          rows: patRows,
          columns: patCols,
          rowPitch: patRowPitch,
          colPitch: patColPitch,
        });
        break;
      case 'sheet.flange':
        onCreateFeature('sheet.flange', { height: flangeH, angle: flangeAng, side: 'front_back' });
        break;
      case 'sheet.hem':
        onCreateFeature('sheet.hem', { length: hemLen });
        break;
      case 'parameters':
        onUpdateParameters(paramDraft);
        break;
      case 'material':
        onAssignMaterial(targetCompId, selectedMat);
        break;
      case 'export_mesh':
        onExportMesh(exportFmt);
        break;
      case 'properties':
        onClose();
        break;
    }
  };

  return (
    <aside
      className="w-[288px] shrink-0 border-l flex flex-col overflow-hidden z-20"
      style={{
        backgroundColor: tokens.dialogBody,
        borderColor: tokens.border,
        color: tokens.text,
      }}
    >
      {/* Cabeçalho */}
      <div
        className="h-[40px] px-3 border-b flex items-center justify-between shrink-0"
        style={{ backgroundColor: tokens.panelHeader, borderColor: tokens.dialogRule }}
      >
        <span className="text-[13px] font-semibold">{titleMap[kind.type]}</span>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer"
          style={{ backgroundColor: tokens.hover }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-[12px]">
          {kind.type === 'sketch.create' && (
            <>
              <FieldLabel label="Plano" tokens={tokens}>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['XY', 'XZ', 'YZ'] as PlaneName[]).map((pl) => (
                    <button
                      key={pl}
                      type="button"
                      onClick={() => setPlane(pl)}
                      className="h-[28px] rounded-[5px] border font-semibold cursor-pointer"
                      style={{
                        backgroundColor: plane === pl ? tokens.accentSoft : tokens.controlFill,
                        borderColor: plane === pl ? tokens.accent : tokens.controlBorder,
                        color: plane === pl ? tokens.selectedInk : tokens.text,
                      }}
                    >
                      {pl}
                    </button>
                  ))}
                </div>
              </FieldLabel>
              <p className="text-[11px]" style={{ color: tokens.textDim }}>
                Selecione um plano base para abrir a barra de Esboço 2D e desenhar linhas, retângulos, círculos ou rasgos.
              </p>
            </>
          )}

          {kind.type === 'solid.extrude' && (
            <>
              <FieldLabel label="Esboço de Perfil" tokens={tokens}>
                <select
                  value={sketchId}
                  onChange={(e) => setSketchId(e.target.value)}
                  className="w-full h-[28px] px-2 rounded-[5px] border outline-none"
                  style={{
                    backgroundColor: tokens.controlFill,
                    borderColor: tokens.controlBorder,
                    color: tokens.text,
                  }}
                >
                  {doc.sketches.length === 0 && <option value="">Nenhum esboço disponível</option>}
                  {doc.sketches.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.plane})
                    </option>
                  ))}
                </select>
              </FieldLabel>
              <TextField label="Distância" value={distance} onChange={setDistance} tokens={tokens} />
              <FieldLabel label="Operação" tokens={tokens}>
                <select
                  value={operation}
                  onChange={(e) => setOperation(e.target.value as FeatureOperation)}
                  className="w-full h-[28px] px-2 rounded-[5px] border outline-none"
                  style={{
                    backgroundColor: tokens.controlFill,
                    borderColor: tokens.controlBorder,
                    color: tokens.text,
                  }}
                >
                  <option value="new">Novo Corpo</option>
                  <option value="join">Unir</option>
                  <option value="cut">Cortar</option>
                </select>
              </FieldLabel>
            </>
          )}

          {kind.type === 'solid.box' && (
            <>
              <TextField label="Comprimento (X)" value={boxL} onChange={setBoxL} tokens={tokens} />
              <TextField label="Largura (Y)" value={boxW} onChange={setBoxW} tokens={tokens} />
              <TextField label="Altura (Z)" value={boxH} onChange={setBoxH} tokens={tokens} />
            </>
          )}

          {kind.type === 'solid.cylinder' && (
            <>
              <TextField label="Raio" value={cylR} onChange={setCylR} tokens={tokens} />
              <TextField label="Altura" value={cylH} onChange={setCylH} tokens={tokens} />
            </>
          )}

          {kind.type === 'solid.sphere' && (
            <TextField label="Raio" value={sphR} onChange={setSphR} tokens={tokens} />
          )}

          {kind.type === 'solid.fillet' && (
            <TextField label="Raio" value={filletR} onChange={setFilletR} tokens={tokens} />
          )}

          {kind.type === 'solid.chamfer' && (
            <TextField label="Distância" value={chamferD} onChange={setChamferD} tokens={tokens} />
          )}

          {kind.type === 'solid.shell' && (
            <TextField label="Espessura da Parede" value={shellT} onChange={setShellT} tokens={tokens} />
          )}

          {kind.type === 'solid.hole' && (
            <>
              <TextField label="Diâmetro" value={holeD} onChange={setHoleD} tokens={tokens} />
              <TextField label="Centro X" value={holeX} onChange={setHoleX} tokens={tokens} />
              <TextField label="Centro Y" value={holeY} onChange={setHoleY} tokens={tokens} />
            </>
          )}

          {kind.type === 'solid.pattern.circular' && (
            <>
              <TextField label="Quantidade" value={patCount} onChange={setPatCount} tokens={tokens} />
              <TextField label="Diâmetro Primitivo (PCD)" value={patPcd} onChange={setPatPcd} tokens={tokens} />
            </>
          )}

          {kind.type === 'solid.pattern.rectangular' && (
            <>
              <TextField label="Linhas" value={patRows} onChange={setPatRows} tokens={tokens} />
              <TextField label="Colunas" value={patCols} onChange={setPatCols} tokens={tokens} />
              <TextField label="Passo Linhas" value={patRowPitch} onChange={setPatRowPitch} tokens={tokens} />
              <TextField label="Passo Colunas" value={patColPitch} onChange={setPatColPitch} tokens={tokens} />
            </>
          )}

          {kind.type === 'sheet.flange' && (
            <>
              <TextField label="Altura" value={flangeH} onChange={setFlangeH} tokens={tokens} />
              <TextField label="Ângulo de Dobra" value={flangeAng} onChange={setFlangeAng} tokens={tokens} />
            </>
          )}

          {kind.type === 'sheet.hem' && (
            <TextField label="Comprimento da Bainha" value={hemLen} onChange={setHemLen} tokens={tokens} />
          )}

          {kind.type === 'parameters' && (
            <div className="space-y-2.5">
              <p className="text-[11px]" style={{ color: tokens.textDim }}>
                Edite expressões (suporta <code className="cad-mono">mm</code>, <code className="cad-mono">deg</code> e fórmulas como <code className="cad-mono">thickness + 10</code>).
              </p>

              <div className="space-y-1.5">
                {paramDraft.map((p, idx) => {
                  const val = evaluated.resolvedParams[p.name];
                  return (
                    <div
                      key={p.id}
                      className="p-2 rounded-[5px] border space-y-1"
                      style={{ backgroundColor: tokens.panel, borderColor: tokens.border }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold cad-mono text-[11.5px]">{p.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10.5px] cad-mono" style={{ color: tokens.accent }}>
                            = {Number.isFinite(val) ? val.toFixed(2) : '—'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setParamDraft((prev) => prev.filter((_, i) => i !== idx))}
                            className="opacity-55 hover:opacity-100 cursor-pointer"
                            title="Excluir Parâmetro"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={p.expression}
                        onChange={(e) => {
                          const next = [...paramDraft];
                          next[idx] = { ...p, expression: e.target.value };
                          setParamDraft(next);
                        }}
                        className="w-full h-[26px] px-2 rounded border cad-mono text-[11.5px] outline-none"
                        style={{
                          backgroundColor: tokens.controlFill,
                          borderColor: tokens.controlBorder,
                          color: tokens.text,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t space-y-1.5" style={{ borderColor: tokens.border }}>
                <div className="text-[11px] font-semibold">Adicionar Parâmetro</div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="nome"
                    value={newParamName}
                    onChange={(e) => setNewParamName(e.target.value)}
                    className="w-1/2 h-[26px] px-2 rounded border text-[11.5px] cad-mono outline-none"
                    style={{
                      backgroundColor: tokens.controlFill,
                      borderColor: tokens.controlBorder,
                      color: tokens.text,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="20 mm"
                    value={newParamExpr}
                    onChange={(e) => setNewParamExpr(e.target.value)}
                    className="w-1/2 h-[26px] px-2 rounded border text-[11.5px] cad-mono outline-none"
                    style={{
                      backgroundColor: tokens.controlFill,
                      borderColor: tokens.controlBorder,
                      color: tokens.text,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const clean = newParamName.trim().replace(/\s+/g, '_');
                    if (!clean) return;
                    setParamDraft((prev) => [
                      ...prev,
                      { id: `p_${Date.now()}`, name: clean, expression: newParamExpr, unit: 'mm' },
                    ]);
                    setNewParamName('');
                  }}
                  className="w-full h-[26px] rounded border flex items-center justify-center gap-1 text-[11.5px] font-medium cursor-pointer"
                  style={{ borderColor: tokens.controlBorder, backgroundColor: tokens.panelHeader }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Parâmetro
                </button>
              </div>
            </div>
          )}

          {kind.type === 'material' && (
            <div className="space-y-3">
              <FieldLabel label="Componente" tokens={tokens}>
                <select
                  value={targetCompId}
                  onChange={(e) => {
                    setTargetCompId(e.target.value);
                    const c = doc.components.find((x) => x.id === e.target.value);
                    if (c) setSelectedMat(c.material);
                  }}
                  className="w-full h-[28px] px-2 rounded-[5px] border outline-none"
                  style={{
                    backgroundColor: tokens.controlFill,
                    borderColor: tokens.controlBorder,
                    color: tokens.text,
                  }}
                >
                  {doc.components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              <div className="space-y-1">
                {PHYSICAL_MATERIALS.map((m) => {
                  const active = selectedMat === m.name;
                  return (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => setSelectedMat(m.name)}
                      className="w-full px-2.5 py-1.5 rounded-[5px] border flex items-center justify-between text-left cursor-pointer"
                      style={{
                        backgroundColor: active ? tokens.selectedBg : tokens.controlFill,
                        borderColor: active ? tokens.accent : tokens.border,
                        color: active ? tokens.selectedInk : tokens.text,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-sm border"
                          style={{ backgroundColor: m.color, borderColor: tokens.border }}
                        />
                        <span className="font-medium">{m.label}</span>
                      </span>
                      <span className="cad-mono text-[10.5px]" style={{ color: tokens.textDim }}>
                        {m.density.toFixed(2)} g/cm³
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {kind.type === 'properties' && (
            <div className="space-y-3">
              <div
                className="p-2.5 rounded-[6px] border space-y-1.5"
                style={{ backgroundColor: tokens.panel, borderColor: tokens.border }}
              >
                <div className="font-semibold text-[12px]">Resumo da Montagem</div>
                <PropRow label="Volume Total" value={`${(evaluated.totalVolumeMm3 / 1000).toFixed(2)} cm³`} tokens={tokens} />
                <PropRow label="Área Total" value={`${(evaluated.totalAreaMm2 / 100).toFixed(2)} cm²`} tokens={tokens} />
                <PropRow label="Massa Total" value={`${evaluated.totalMassGrams.toFixed(2)} g`} tokens={tokens} />
              </div>

              {evaluated.bodies.map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-[6px] border space-y-1"
                  style={{ backgroundColor: tokens.panel, borderColor: tokens.border }}
                >
                  <div className="font-semibold">{b.name}</div>
                  <PropRow label="Material" value={getMaterialSpec(b.material).label} tokens={tokens} />
                  <PropRow label="Massa" value={`${b.massGrams.toFixed(2)} g`} tokens={tokens} />
                  <PropRow label="Volume" value={`${(b.volumeMm3 / 1000).toFixed(2)} cm³`} tokens={tokens} />
                  <PropRow
                    label="Dimensões"
                    value={`${(b.bboxMax[0] - b.bboxMin[0]).toFixed(1)} × ${(b.bboxMax[1] - b.bboxMin[1]).toFixed(1)} × ${(b.bboxMax[2] - b.bboxMin[2]).toFixed(1)} mm`}
                    tokens={tokens}
                  />
                  <PropRow label="Triângulos" value={`${b.triangleCount}`} tokens={tokens} />
                </div>
              ))}
            </div>
          )}

          {kind.type === 'export_mesh' && (
            <div className="space-y-3">
              <FieldLabel label="Formato" tokens={tokens}>
                <div className="space-y-1.5">
                  {[
                    { id: 'stl', label: 'STL (Binário .stl)', desc: 'Padrão para impressão 3D e fatiadores' },
                    { id: 'obj', label: 'Wavefront OBJ (.obj)', desc: 'Formato universal de malha poligonal' },
                    { id: 'glb', label: 'glTF Binário (.glb)', desc: 'Formato 3D compacto com materiais PBR' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExportFmt(opt.id as 'stl' | 'obj' | 'glb')}
                      className="w-full p-2 rounded-[5px] border text-left cursor-pointer"
                      style={{
                        backgroundColor: exportFmt === opt.id ? tokens.selectedBg : tokens.controlFill,
                        borderColor: exportFmt === opt.id ? tokens.accent : tokens.border,
                      }}
                    >
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-[10.5px]" style={{ color: tokens.textDim }}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </FieldLabel>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div
          className="h-[48px] px-3 border-t flex items-center justify-end gap-2 shrink-0"
          style={{ backgroundColor: tokens.dialogFooter, borderColor: tokens.dialogRule }}
        >
          {kind.type !== 'properties' && (
            <button
              type="button"
              onClick={onClose}
              className="h-[28px] px-3 rounded-[5px] border text-[12px] font-medium cursor-pointer"
              style={{
                backgroundColor: tokens.controlFill,
                borderColor: tokens.controlBorder,
                color: tokens.text,
              }}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="h-[28px] px-4 rounded-[5px] text-[12px] font-semibold text-white cursor-pointer"
            style={{ backgroundColor: tokens.accent }}
          >
            {kind.type === 'properties'
              ? 'Fechar'
              : kind.type === 'export_mesh'
              ? 'Exportar'
              : kind.type === 'parameters'
              ? 'Aplicar'
              : 'OK'}
          </button>
        </div>
      </form>
    </aside>
  );
};

const FieldLabel: React.FC<{
  label: string;
  tokens: ThemeTokens;
  children: React.ReactNode;
}> = ({ label, tokens, children }) => (
  <div className="space-y-1">
    <div className="text-[11px] font-semibold" style={{ color: tokens.textDim }}>
      {label}
    </div>
    {children}
  </div>
);

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  tokens: ThemeTokens;
}> = ({ label, value, onChange, tokens }) => (
  <FieldLabel label={label} tokens={tokens}>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-[28px] px-2 rounded-[5px] border cad-mono text-[12px] outline-none"
      style={{
        backgroundColor: tokens.controlFill,
        borderColor: tokens.controlBorder,
        color: tokens.text,
      }}
    />
  </FieldLabel>
);

const PropRow: React.FC<{ label: string; value: string; tokens: ThemeTokens }> = ({
  label,
  value,
  tokens,
}) => (
  <div className="flex items-center justify-between text-[11.5px]">
    <span style={{ color: tokens.textDim }}>{label}</span>
    <span className="cad-mono font-semibold">{value}</span>
  </div>
);
