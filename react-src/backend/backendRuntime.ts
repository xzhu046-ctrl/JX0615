import { BackendLogEntry, getBackstageRuntime } from '../shared/env';

const BACKEND_LOG_STORAGE_KEY = 'backend_runtime_logs_v1';

export function readBackendLogs(): BackendLogEntry[] {
  try {
    const runtime = getBackstageRuntime();
    const live = runtime?.getLogs?.();
    if (Array.isArray(live)) return live;
  } catch {
    // Fall through to local mirror.
  }
  try {
    const raw = localStorage.getItem(BACKEND_LOG_STORAGE_KEY) || '[]';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearBackendLogs(): void {
  try {
    const runtime = getBackstageRuntime();
    if (runtime?.clearLogs) {
      runtime.clearLogs();
      return;
    }
  } catch {
    // Fall through to local mirror.
  }
  try {
    localStorage.removeItem(BACKEND_LOG_STORAGE_KEY);
  } catch {
    // Ignore storage denial.
  }
}

export function formatBackendLogTime(ts?: number): string {
  const date = new Date(Number(ts) || Date.now());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export function serializeBackendLogs(logs: BackendLogEntry[]): string {
  return logs.slice().reverse().map((item) => {
    const level = String(item.level || 'info').toUpperCase();
    const app = String(item.app || 'shell');
    const source = String(item.source || 'runtime');
    const message = String(item.message || '');
    const detail = item.detail ? `\n${String(item.detail)}` : '';
    return `[${formatBackendLogTime(item.ts)}][${level}][${app}/${source}] ${message}${detail}`;
  }).join('\n\n');
}

export { BACKEND_LOG_STORAGE_KEY };
