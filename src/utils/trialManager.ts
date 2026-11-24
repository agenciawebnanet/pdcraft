export const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas
export const SUPPORT_WHATSAPP_RAW = '556699977501';
export const SUPPORT_WHATSAPP_LOCAL = '66999775501';
export const SUPPORT_WHATSAPP_DISPLAY = '(66) 99977-5501';

const STORAGE_REGISTRY_KEY = 'pdcraft_cloud_registry_v1';
const STORAGE_BACKUP_KEY = 'pdcraft_cloud_backup_v1';
const COOKIE_NAME = 'pdcraft_cloud_reg';
const IDB_NAME = 'pdcraft_cloud_local_db';
const IDB_STORE = 'registry';
const IDB_KEY = 'primary';

export type TrialStatus = 'trial' | 'expired' | 'licensed';

export interface TrialLogEntry {
  id: string;
  timestamp: number;
  event: string;
  detail: string;
}

export interface LocalTrialRegistry {
  registrationId: string;
  machineSignature: string;
  startedAt: number;
  expiresAt: number;
  lastSeenAt: number;
  sessionCount: number;
  status: TrialStatus;
  licenseKey?: string;
  activatedAt?: number;
  logs: TrialLogEntry[];
}

function hashString(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(6, '0');
}

function getMachineSignature(): string {
  try {
    const parts = [
      navigator.language || 'pt-BR',
      String(screen.width || 0) + 'x' + String(screen.height || 0),
      String(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
      String(navigator.hardwareConcurrency || 0),
      navigator.platform || 'web',
    ];
    return hashString(parts.join('|'));
  } catch {
    return 'WEB001';
  }
}

function generateRegistrationId(sig: string): string {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timePart = (Date.now() % 1679616).toString(36).toUpperCase().padStart(4, '0');
  return `PDC-${sig.slice(0, 4)}-${timePart}-${rand}`;
}

export function computeLicenseActivationCode(registrationId: string): string {
  const clean = registrationId.trim().toUpperCase();
  const check = hashString(`PDCRAFT_CLOUD_PRO::${clean}`).slice(0, 6);
  return `PDC-PRO-${check}`;
}

export function verifyActivationKey(registrationId: string, candidateKey: string): boolean {
  const normalized = candidateKey.trim().toUpperCase();
  if (!normalized) return false;
  return normalized === computeLicenseActivationCode(registrationId);
}

function readCookieRegistry(): { registrationId?: string; startedAt?: number; status?: TrialStatus } | null {
  try {
    const pairs = document.cookie.split(';').map((c) => c.trim());
    const found = pairs.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!found) return null;
    const value = decodeURIComponent(found.slice(COOKIE_NAME.length + 1));
    const [registrationId, startedStr, status] = value.split('|');
    const startedAt = Number(startedStr);
    if (!registrationId || !Number.isFinite(startedAt) || startedAt <= 0) return null;
    return {
      registrationId,
      startedAt,
      status: status === 'licensed' ? 'licensed' : undefined,
    };
  } catch {
    return null;
  }
}

function writeCookieRegistry(reg: LocalTrialRegistry): void {
  try {
    const payload = encodeURIComponent(`${reg.registrationId}|${reg.startedAt}|${reg.status}`);
    document.cookie = `${COOKIE_NAME}=${payload}; max-age=31536000; path=/; SameSite=Lax`;
  } catch {
    // Ignore cookie errors in restricted contexts
  }
}

function readLocalStorageRegistry(): LocalTrialRegistry | null {
  for (const key of [STORAGE_REGISTRY_KEY, STORAGE_BACKUP_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as LocalTrialRegistry;
      if (parsed && typeof parsed.startedAt === 'number' && parsed.registrationId) {
        return parsed;
      }
    } catch {
      // Ignore parse/storage errors
    }
  }
  return null;
}

function writeLocalStorageRegistry(reg: LocalTrialRegistry): void {
  try {
    const serialized = JSON.stringify(reg);
    localStorage.setItem(STORAGE_REGISTRY_KEY, serialized);
    localStorage.setItem(STORAGE_BACKUP_KEY, serialized);
  } catch {
    // Ignore storage quota errors
  }
}

function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function readIndexedDbRegistry(): Promise<LocalTrialRegistry | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        db.close();
        const val = req.result as LocalTrialRegistry | undefined;
        resolve(val && typeof val.startedAt === 'number' ? val : null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

async function writeIndexedDbRegistry(reg: LocalTrialRegistry): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(reg, IDB_KEY);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  } catch {
    db.close();
  }
}

function makeLogEntry(event: string, detail: string, timestamp = Date.now()): TrialLogEntry {
  return {
    id: `log_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp,
    event,
    detail,
  };
}

function appendLogList(logs: TrialLogEntry[], entry: TrialLogEntry): TrialLogEntry[] {
  return [entry, ...logs].slice(0, 120);
}

export function evaluateRegistryState(
  reg: LocalTrialRegistry,
  now = Date.now()
): LocalTrialRegistry {
  if (reg.status === 'licensed') {
    return { ...reg, lastSeenAt: Math.max(reg.lastSeenAt, now) };
  }

  let logs = reg.logs;
  // Detecta retrocesso de relógio local
  const effectiveNow = Math.max(now, reg.lastSeenAt);
  if (now + 60_000 < reg.lastSeenAt) {
    const hasRecentClockWarn = logs.some(
      (l) => l.event === 'AJUSTE_RELOGIO' && Math.abs(now - l.timestamp) < 300_000
    );
    if (!hasRecentClockWarn) {
      logs = appendLogList(
        logs,
        makeLogEntry(
          'AJUSTE_RELOGIO',
          'Alteração de relógio local detectada; mantendo contagem real protegida.',
          effectiveNow
        )
      );
    }
  }

  const expired = effectiveNow >= reg.expiresAt;
  let status: TrialStatus = expired ? 'expired' : 'trial';

  if (expired && reg.status !== 'expired') {
    logs = appendLogList(
      logs,
      makeLogEntry(
        'TESTE_EXPIRADO',
        'Período gratuito de 24h encerrado. Acesso bloqueado até contratação.',
        effectiveNow
      )
    );
  }

  return {
    ...reg,
    lastSeenAt: effectiveNow,
    status,
    logs,
  };
}

export function persistTrialRegistry(reg: LocalTrialRegistry): void {
  writeLocalStorageRegistry(reg);
  writeCookieRegistry(reg);
  void writeIndexedDbRegistry(reg);
}

export function initializeTrialRegistrySync(): LocalTrialRegistry {
  const now = Date.now();
  const sig = getMachineSignature();
  const lsReg = readLocalStorageRegistry();
  const cookieReg = readCookieRegistry();

  if (lsReg) {
    const earliestStart =
      cookieReg?.startedAt && cookieReg.startedAt < lsReg.startedAt
        ? cookieReg.startedAt
        : lsReg.startedAt;
    const base: LocalTrialRegistry = {
      ...lsReg,
      startedAt: earliestStart,
      expiresAt: earliestStart + TRIAL_DURATION_MS,
      sessionCount: lsReg.sessionCount + 1,
      logs: appendLogList(
        lsReg.logs || [],
        makeLogEntry('SESSAO_ABERTA', `Sessão #${lsReg.sessionCount + 1} iniciada no PD Craft Cloud.`, now)
      ),
    };
    const evaluated = evaluateRegistryState(base, now);
    persistTrialRegistry(evaluated);
    return evaluated;
  }

  // Se localStorage foi limpo, mas existe registro no cookie
  if (cookieReg && cookieReg.startedAt && cookieReg.registrationId) {
    const restored: LocalTrialRegistry = {
      registrationId: cookieReg.registrationId,
      machineSignature: sig,
      startedAt: cookieReg.startedAt,
      expiresAt: cookieReg.startedAt + TRIAL_DURATION_MS,
      lastSeenAt: now,
      sessionCount: 1,
      status: cookieReg.status === 'licensed' ? 'licensed' : 'trial',
      logs: [
        makeLogEntry(
          'REGISTRO_RESTAURADO',
          'Registro local recuperado automaticamente após limpeza parcial de cache.',
          now
        ),
      ],
    };
    const evaluated = evaluateRegistryState(restored, now);
    persistTrialRegistry(evaluated);
    return evaluated;
  }

  // Primeiro acesso nesta máquina local
  const regId = generateRegistrationId(sig);
  const fresh: LocalTrialRegistry = {
    registrationId: regId,
    machineSignature: sig,
    startedAt: now,
    expiresAt: now + TRIAL_DURATION_MS,
    lastSeenAt: now,
    sessionCount: 1,
    status: 'trial',
    logs: [
      makeLogEntry(
        'INICIO_TESTE',
        `Teste de 24h do PD Craft Cloud ativado na máquina local (${regId}).`,
        now
      ),
    ],
  };
  persistTrialRegistry(fresh);
  return fresh;
}

export function mergeWithIndexedDbRegistry(
  current: LocalTrialRegistry,
  idbReg: LocalTrialRegistry | null
): LocalTrialRegistry {
  if (!idbReg) return current;

  const earliestStart = Math.min(current.startedAt, idbReg.startedAt);
  const isLicensed = current.status === 'licensed' || idbReg.status === 'licensed';

  // Mescla logs sem duplicar IDs
  const logMap = new Map<string, TrialLogEntry>();
  for (const item of [...current.logs, ...(idbReg.logs || [])]) {
    logMap.set(item.id, item);
  }
  const mergedLogs = Array.from(logMap.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 120);

  const merged: LocalTrialRegistry = {
    ...current,
    registrationId: idbReg.startedAt < current.startedAt ? idbReg.registrationId : current.registrationId,
    startedAt: earliestStart,
    expiresAt: earliestStart + TRIAL_DURATION_MS,
    lastSeenAt: Math.max(current.lastSeenAt, idbReg.lastSeenAt || 0),
    sessionCount: Math.max(current.sessionCount, idbReg.sessionCount || 1),
    status: isLicensed ? 'licensed' : current.status,
    licenseKey: current.licenseKey || idbReg.licenseKey,
    activatedAt: current.activatedAt || idbReg.activatedAt,
    logs: mergedLogs,
  };

  const evaluated = evaluateRegistryState(merged, Date.now());
  persistTrialRegistry(evaluated);
  return evaluated;
}

export function appendTrialLog(
  current: LocalTrialRegistry,
  event: string,
  detail: string
): LocalTrialRegistry {
  const next: LocalTrialRegistry = {
    ...current,
    logs: appendLogList(current.logs, makeLogEntry(event, detail)),
  };
  const evaluated = evaluateRegistryState(next, Date.now());
  persistTrialRegistry(evaluated);
  return evaluated;
}

export function getRemainingTrialMs(reg: LocalTrialRegistry, now = Date.now()): number {
  if (reg.status === 'licensed') return Infinity;
  const effectiveNow = Math.max(now, reg.lastSeenAt);
  return Math.max(0, reg.expiresAt - effectiveNow);
}

export function formatRemainingDurationPtBr(ms: number): string {
  if (!Number.isFinite(ms)) return 'Ativo';
  if (ms <= 0) return '00h 00m 00s';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

export function formatDateTimePtBr(ts: number): string {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function buildSupportWhatsAppUrl(reg: LocalTrialRegistry, expired: boolean): string {
  const msg = expired
    ? `Olá! Meu período de teste de 24h do PD Craft Cloud encerrou e gostaria de contratar/liberar o acesso pago.\n\nRegistro local: ${reg.registrationId}\nInício: ${formatDateTimePtBr(reg.startedAt)}\nTérmino: ${formatDateTimePtBr(reg.expiresAt)}`
    : `Olá! Estou utilizando o teste de 24h do PD Craft Cloud e preciso de suporte/informações sobre planos.\n\nRegistro local: ${reg.registrationId}`;
  return `https://wa.me/${SUPPORT_WHATSAPP_RAW}?text=${encodeURIComponent(msg)}`;
}

export function exportLocalLogsFile(reg: LocalTrialRegistry): void {
  const lines = [
    '=== REGISTRO LOCAL - PD CRAFT CLOUD ===',
    `ID do Registro: ${reg.registrationId}`,
    `Assinatura da Máquina: ${reg.machineSignature}`,
    `Status: ${reg.status === 'licensed' ? 'Licenciado' : reg.status === 'expired' ? 'Teste 24h Expirado' : 'Teste 24h Ativo'}`,
    `Início do Teste: ${formatDateTimePtBr(reg.startedAt)}`,
    `Término do Teste: ${formatDateTimePtBr(reg.expiresAt)}`,
    `Última Atividade: ${formatDateTimePtBr(reg.lastSeenAt)}`,
    `Sessões Registradas: ${reg.sessionCount}`,
    '',
    '--- LOGS DE ATIVIDADE ---',
    ...reg.logs.map(
      (l) => `[${formatDateTimePtBr(l.timestamp)}] [${l.event}] ${l.detail}`
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pdcraft-cloud-logs-${reg.registrationId}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
