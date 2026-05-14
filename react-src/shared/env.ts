export type BackendLogEntry = {
  id?: string;
  ts?: number;
  level?: string;
  app?: string;
  source?: string;
  message?: string;
  detail?: string;
};

export type BackstageRuntimeApi = {
  getLogs?: () => BackendLogEntry[];
  clearLogs?: () => void;
};

export function getParentWindow(): Window | null {
  try {
    return window.parent && window.parent !== window ? window.parent : null;
  } catch {
    return null;
  }
}

export function getBackstageRuntime(): BackstageRuntimeApi | null {
  const parentWindow = getParentWindow() as (Window & { BackstageRuntime?: BackstageRuntimeApi }) | null;
  if (parentWindow?.BackstageRuntime) return parentWindow.BackstageRuntime;
  return (window as Window & { BackstageRuntime?: BackstageRuntimeApi }).BackstageRuntime || null;
}
