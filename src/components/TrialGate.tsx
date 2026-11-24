import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  KeyRound,
  Lock,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ThemeTokens } from '../theme/tokens';
import { PDCraftLogo } from './PDCraftLogo';
import {
  buildSupportWhatsAppUrl,
  exportLocalLogsFile,
  formatDateTimePtBr,
  formatRemainingDurationPtBr,
  getRemainingTrialMs,
  LocalTrialRegistry,
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_LOCAL,
  TRIAL_DURATION_MS,
} from '../utils/trialManager';

interface TrialExpiredGateProps {
  tokens: ThemeTokens;
  registry: LocalTrialRegistry;
  onSupportClick: () => void;
  onActivateKey: (key: string) => boolean;
}

export const TrialExpiredGate: React.FC<TrialExpiredGateProps> = ({
  tokens,
  registry,
  onSupportClick,
  onActivateKey,
}) => {
  const [copied, setCopied] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');

  const whatsappUrl = buildSupportWhatsAppUrl(registry, true);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_WHATSAPP_LOCAL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso caso clipboard esteja bloqueado
    }
  };

  const handleSubmitKey = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onActivateKey(keyInput);
    if (!ok) {
      setKeyError('Chave inválida para este registro local. Solicite ao suporte pelo WhatsApp.');
    } else {
      setKeyError('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{
        backgroundColor: tokens.mode === 'dark' ? '#13161b' : '#e6ebf2',
        color: tokens.text,
      }}
    >
      <div
        className="w-full max-w-[540px] rounded-[10px] border shadow-2xl overflow-hidden my-auto"
        style={{
          backgroundColor: tokens.panel,
          borderColor: tokens.border,
        }}
      >
        {/* Cabeçalho */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{
            backgroundColor: tokens.appBar,
            borderColor: tokens.border,
            color: tokens.appBarText,
          }}
        >
          <div className="flex items-center gap-2.5">
            <PDCraftLogo size={22} />
            <div>
              <div className="text-[14px] font-bold tracking-tight">PD Craft Cloud</div>
              <div className="text-[11px] opacity-75">Controle de Acesso • Teste de 24h</div>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[11px] font-semibold"
            style={{ backgroundColor: 'rgba(224, 93, 93, 0.2)', color: '#ff8a8a' }}
          >
            <Lock className="w-3.5 h-3.5" />
            Período Encerrado
          </span>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <h1 className="text-[19px] font-bold leading-snug">
              Seu teste gratuito de 24 horas encerrou
            </h1>
            <p className="text-[13px] leading-relaxed" style={{ color: tokens.textDim }}>
              O acesso ao <strong style={{ color: tokens.text }}>PD Craft Cloud</strong> nesta máquina
              atingiu o limite de 24 horas do período de avaliação. Para continuar usando os recursos CAD
              sem interrupção, realize o pagamento falando diretamente com nosso suporte.
            </p>
          </div>

          {/* Ação principal: WhatsApp Suporte */}
          <div
            className="rounded-[8px] border p-4 space-y-3"
            style={{
              backgroundColor: tokens.mode === 'dark' ? 'rgba(37, 211, 102, 0.08)' : 'rgba(22, 163, 74, 0.06)',
              borderColor: tokens.mode === 'dark' ? 'rgba(37, 211, 102, 0.35)' : 'rgba(22, 163, 74, 0.3)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider opacity-75">
                  WhatsApp de Suporte & Liberação
                </div>
                <div className="text-[18px] font-bold cad-mono mt-0.5">
                  {SUPPORT_WHATSAPP_DISPLAY}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="h-[32px] px-3 rounded-[6px] border text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                style={{
                  backgroundColor: tokens.panel,
                  borderColor: tokens.border,
                  color: tokens.text,
                }}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar número'}</span>
              </button>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onSupportClick}
              className="w-full h-[42px] rounded-[7px] font-semibold text-[13.5px] text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-95"
              style={{ backgroundColor: '#16a34a' }}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Ir para o Suporte no WhatsApp ({SUPPORT_WHATSAPP_LOCAL})</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-85" />
            </a>
          </div>

          {/* Registro local da máquina */}
          <div
            className="rounded-[8px] border p-3.5 space-y-2.5 text-[12px]"
            style={{
              backgroundColor: tokens.panelHeader,
              borderColor: tokens.border,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" style={{ color: tokens.accent }} />
                Registro na Máquina Local
              </span>
              <span className="cad-mono text-[11px] font-semibold" style={{ color: tokens.accent }}>
                {registry.registrationId}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]" style={{ color: tokens.textDim }}>
              <div>
                <span>Início do teste:</span>
                <div className="font-medium cad-mono" style={{ color: tokens.text }}>
                  {formatDateTimePtBr(registry.startedAt)}
                </div>
              </div>
              <div>
                <span>Término das 24h:</span>
                <div className="font-medium cad-mono" style={{ color: tokens.text }}>
                  {formatDateTimePtBr(registry.expiresAt)}
                </div>
              </div>
              <div>
                <span>Sessões registradas:</span>
                <div className="font-medium" style={{ color: tokens.text }}>
                  {registry.sessionCount} {registry.sessionCount === 1 ? 'sessão' : 'sessões'}
                </div>
              </div>
              <div>
                <span>Registros locais:</span>
                <div className="font-medium" style={{ color: tokens.text }}>
                  {registry.logs.length} eventos salvos
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between border-t" style={{ borderColor: tokens.border }}>
              <button
                type="button"
                onClick={() => setShowLogs((v) => !v)}
                className="text-[11.5px] font-medium hover:underline cursor-pointer"
                style={{ color: tokens.accent }}
              >
                {showLogs ? 'Ocultar logs locais' : 'Ver logs e registros locais'}
              </button>
              <button
                type="button"
                onClick={() => exportLocalLogsFile(registry)}
                className="text-[11.5px] flex items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Baixar logs (.txt)</span>
              </button>
            </div>

            {showLogs && (
              <div
                className="max-h-[140px] overflow-y-auto rounded-[5px] border p-2 space-y-1 text-[11px] cad-mono"
                style={{ backgroundColor: tokens.panel, borderColor: tokens.border }}
              >
                {registry.logs.map((entry) => (
                  <div key={entry.id} className="leading-snug">
                    <span style={{ color: tokens.textDim }}>
                      [{formatDateTimePtBr(entry.timestamp)}]
                    </span>{' '}
                    <span className="font-semibold" style={{ color: tokens.accent }}>
                      {entry.event}
                    </span>{' '}
                    <span>— {entry.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ativação com chave pós-pagamento */}
          <div className="pt-1 border-t" style={{ borderColor: tokens.border }}>
            {!showKeyForm ? (
              <button
                type="button"
                onClick={() => setShowKeyForm(true)}
                className="text-[12px] flex items-center gap-1.5 opacity-80 hover:opacity-100 cursor-pointer"
                style={{ color: tokens.textDim }}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Já realizou o pagamento? Inserir chave de liberação</span>
              </button>
            ) : (
              <form onSubmit={handleSubmitKey} className="space-y-2">
                <label className="block text-[11.5px] font-medium" style={{ color: tokens.textDim }}>
                  Chave de liberação do suporte (para {registry.registrationId}):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => {
                      setKeyInput(e.target.value);
                      setKeyError('');
                    }}
                    placeholder="Ex: PDC-PRO-XXXXXX"
                    className="flex-1 h-[34px] px-3 rounded-[6px] border text-[12px] cad-mono outline-none"
                    style={{
                      backgroundColor: tokens.panelHeader,
                      borderColor: tokens.border,
                      color: tokens.text,
                    }}
                  />
                  <button
                    type="submit"
                    className="h-[34px] px-4 rounded-[6px] text-[12px] font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: tokens.accent }}
                  >
                    Liberar
                  </button>
                </div>
                {keyError && (
                  <div className="text-[11.5px] text-red-500">{keyError}</div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TrialDetailsModalProps {
  tokens: ThemeTokens;
  open: boolean;
  registry: LocalTrialRegistry;
  nowMs: number;
  onClose: () => void;
  onSupportClick: () => void;
  onActivateKey: (key: string) => boolean;
}

export const TrialDetailsModal: React.FC<TrialDetailsModalProps> = ({
  tokens,
  open,
  registry,
  nowMs,
  onClose,
  onSupportClick,
  onActivateKey,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!open) return null;

  const remainingMs = getRemainingTrialMs(registry, nowMs);
  const progressPct =
    registry.status === 'licensed'
      ? 100
      : Math.max(0, Math.min(100, (remainingMs / TRIAL_DURATION_MS) * 100));
  const whatsappUrl = buildSupportWhatsAppUrl(registry, false);

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onActivateKey(keyInput);
    if (ok) {
      setKeyMsg({ ok: true, text: 'Licença ativada com sucesso nesta máquina!' });
      setKeyInput('');
    } else {
      setKeyMsg({ ok: false, text: 'Chave inválida para este registro local.' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-[8px] border shadow-2xl overflow-hidden"
        style={{ backgroundColor: tokens.panel, borderColor: tokens.border, color: tokens.text }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: tokens.border, backgroundColor: tokens.panelHeader }}
        >
          <div className="flex items-center gap-2 font-semibold text-[13px]">
            {registry.status === 'licensed' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            ) : (
              <Clock className="w-4 h-4" style={{ color: tokens.accent }} />
            )}
            <span>PD Craft Cloud — Registro Local & Teste 24h</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="opacity-65 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-[12px]">
          {/* Resumo de tempo */}
          <div
            className="p-3 rounded-[6px] border space-y-2"
            style={{ backgroundColor: tokens.panelHeader, borderColor: tokens.border }}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: tokens.textDim }}>
                {registry.status === 'licensed' ? 'Status da Licença:' : 'Tempo restante do teste gratuito:'}
              </span>
              <span className="cad-mono font-bold text-[13.5px]" style={{ color: tokens.accent }}>
                {registry.status === 'licensed'
                  ? 'Acesso Completo Liberado'
                  : formatRemainingDurationPtBr(remainingMs)}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: tokens.border }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: registry.status === 'licensed' ? '#16a34a' : tokens.accent,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]" style={{ color: tokens.textDim }}>
              <div>
                Registro Local: <strong className="cad-mono" style={{ color: tokens.text }}>{registry.registrationId}</strong>
              </div>
              <div className="text-right">
                Sessões: <strong style={{ color: tokens.text }}>{registry.sessionCount}</strong>
              </div>
              <div>
                Início: <span className="cad-mono">{formatDateTimePtBr(registry.startedAt)}</span>
              </div>
              <div className="text-right">
                Expira em: <span className="cad-mono">{formatDateTimePtBr(registry.expiresAt)}</span>
              </div>
            </div>
          </div>

          {/* Logs locais */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Registros e Logs Locais ({registry.logs.length})</span>
              <button
                type="button"
                onClick={() => exportLocalLogsFile(registry)}
                className="text-[11px] flex items-center gap-1 hover:underline cursor-pointer"
                style={{ color: tokens.accent }}
              >
                <Download className="w-3 h-3" />
                <span>Exportar logs (.txt)</span>
              </button>
            </div>
            <div
              className="max-h-[160px] overflow-y-auto rounded-[6px] border p-2.5 space-y-1 text-[11px] cad-mono"
              style={{ backgroundColor: tokens.panelHeader, borderColor: tokens.border }}
            >
              {registry.logs.map((entry) => (
                <div key={entry.id}>
                  <span style={{ color: tokens.textDim }}>
                    [{formatDateTimePtBr(entry.timestamp)}]
                  </span>{' '}
                  <span className="font-semibold" style={{ color: tokens.accent }}>
                    {entry.event}
                  </span>{' '}
                  <span>— {entry.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ativação opcional */}
          {registry.status !== 'licensed' && (
            <form onSubmit={handleActivate} className="space-y-1.5">
              <div className="text-[11.5px] font-medium" style={{ color: tokens.textDim }}>
                Ativar licença definitiva:
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    setKeyMsg(null);
                  }}
                  placeholder="Insira a chave recebida do suporte"
                  className="flex-1 h-[32px] px-2.5 rounded-[5px] border text-[12px] cad-mono outline-none"
                  style={{
                    backgroundColor: tokens.panelHeader,
                    borderColor: tokens.border,
                    color: tokens.text,
                  }}
                />
                <button
                  type="submit"
                  className="h-[32px] px-3 rounded-[5px] text-[12px] font-medium border cursor-pointer"
                  style={{ borderColor: tokens.border, backgroundColor: tokens.panelHeader }}
                >
                  Ativar
                </button>
              </div>
              {keyMsg && (
                <div className={`text-[11px] ${keyMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>
                  {keyMsg.text}
                </div>
              )}
            </form>
          )}

          {/* Rodapé WhatsApp + Fechar */}
          <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: tokens.border }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onSupportClick}
              className="h-[34px] px-3.5 rounded-[6px] text-white font-semibold text-[12px] inline-flex items-center gap-1.5 hover:opacity-95"
              style={{ backgroundColor: '#16a34a' }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Suporte WhatsApp {SUPPORT_WHATSAPP_DISPLAY}</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="h-[34px] px-4 rounded-[6px] border text-[12px] font-medium cursor-pointer"
              style={{ borderColor: tokens.border, backgroundColor: tokens.panelHeader }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
