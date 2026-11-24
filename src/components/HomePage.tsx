import React from 'react';
import { Clock, FilePlus, FolderOpen, Layers, Trash2, Upload } from 'lucide-react';
import { ThemeTokens } from '../theme/tokens';
import { BUILT_IN_SAMPLES } from '../cad/samples';
import { DesignDocument, SampleDesignMeta } from '../cad/types';
import { PDCraftLogo } from './PDCraftLogo';
import { SampleThumbnail } from './SampleThumbnail';

interface HomePageProps {
  tokens: ThemeTokens;
  recentDocs: DesignDocument[];
  onNewDesign: () => void;
  onOpenFile: () => void;
  onOpenSample: (sample: SampleDesignMeta) => void;
  onOpenRecent: (doc: DesignDocument) => void;
  onRemoveRecent: (id: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  tokens,
  recentDocs,
  onNewDesign,
  onOpenFile,
  onOpenSample,
  onOpenRecent,
  onRemoveRecent,
}) => {
  return (
    <div
      className="flex-1 flex overflow-hidden"
      style={{ backgroundColor: tokens.fileBackground, color: tokens.text }}
    >
      {/* Left Action Rail (matches SolidCraft's 248px Home rail) */}
      <aside
        className="w-[248px] shrink-0 border-r flex flex-col justify-between p-5"
        style={{
          backgroundColor: tokens.fileSurface,
          borderColor: tokens.fileBorder,
        }}
      >
        <div>
          <div className="flex items-center gap-3 mb-6">
            <PDCraftLogo size={34} />
            <div>
              <h1 className="text-[19px] font-bold tracking-tight leading-tight">PD Craft</h1>
              <p className="text-[11.5px]" style={{ color: tokens.textDim }}>
                Parametric 3D CAD
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onNewDesign}
              className="w-full h-[38px] px-3.5 rounded-[6px] flex items-center gap-2.5 text-[13px] font-semibold text-white transition-colors cursor-pointer"
              style={{ backgroundColor: tokens.fileRail }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.fileRailHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = tokens.fileRail;
              }}
            >
              <FilePlus className="w-4 h-4" />
              <span>New Design</span>
            </button>

            <button
              type="button"
              onClick={onOpenFile}
              className="w-full h-[36px] px-3.5 rounded-[6px] border flex items-center gap-2.5 text-[12.5px] font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: tokens.filePrimary,
                color: tokens.filePrimaryInk,
                borderColor: tokens.filePrimaryBorder,
              }}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Design…</span>
            </button>

            <button
              type="button"
              onClick={onOpenFile}
              className="w-full h-[34px] px-3.5 rounded-[6px] border flex items-center gap-2.5 text-[12px] font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: 'transparent',
                color: tokens.text,
                borderColor: tokens.fileBorder,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Upload className="w-3.5 h-3.5 opacity-75" />
              <span>Import STL / JSON…</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t text-[11px] space-y-1.5" style={{ borderColor: tokens.fileBorder, color: tokens.textDim }}>
          <div className="font-semibold" style={{ color: tokens.text }}>
            Supported Workflows
          </div>
          <div>• Parametric Sketches & Extrude</div>
          <div>• Fillets, Shells & Hole Patterns</div>
          <div>• Sheet Metal Flanges & Hems</div>
          <div>• STL, OBJ & glTF (.glb) Export</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Recent Designs */}
          {recentDocs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-70" />
                  <span>Recent Designs</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onOpenRecent(doc)}
                    className="group rounded-[8px] border p-3.5 flex items-center justify-between transition-all cursor-pointer"
                    style={{
                      backgroundColor: tokens.fileSurface,
                      borderColor: tokens.fileBorder,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tokens.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = tokens.fileBorder;
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate">{doc.name}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: tokens.textDim }}>
                        {doc.features.length} features • {doc.units}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRecent(doc.id);
                      }}
                      className="p-1.5 rounded opacity-0 group-hover:opacity-75 hover:!opacity-100 cursor-pointer"
                      title="Remove from Recent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Built-in Samples */}
          <section>
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h2 className="text-[17px] font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4" style={{ color: tokens.accent }} />
                  <span>Built-in Samples</span>
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: tokens.textDim }}>
                  Select a sample to open its editable parametric timeline, parameters, and 3D assembly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BUILT_IN_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => onOpenSample(sample)}
                  className="text-left rounded-[8px] border overflow-hidden transition-all cursor-pointer flex flex-col"
                  style={{
                    backgroundColor: tokens.fileSurface,
                    borderColor: tokens.fileBorder,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = tokens.accent;
                    e.currentTarget.style.boxShadow = `0 4px 14px rgba(0,0,0,0.08)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = tokens.fileBorder;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    className="h-[130px] w-full border-b relative overflow-hidden"
                    style={{ borderColor: tokens.fileBorder }}
                  >
                    <SampleThumbnail sampleId={sample.id} tokens={tokens} />
                    <span
                      className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        backgroundColor: tokens.panelHeader,
                        color: tokens.textDim,
                        border: `1px solid ${tokens.border}`,
                      }}
                    >
                      {sample.category}
                    </span>
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[13.5px] font-semibold">{sample.name}</div>
                      <p className="text-[11.5px] mt-1 leading-relaxed" style={{ color: tokens.textDim }}>
                        {sample.about}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
