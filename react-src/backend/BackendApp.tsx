import { useEffect, useMemo, useState } from 'react';
import {
  BACKEND_LOG_STORAGE_KEY,
  clearBackendLogs,
  formatBackendLogTime,
  readBackendLogs,
  serializeBackendLogs
} from './backendRuntime';
import './backend.css';

function useBackendLogs() {
  const [logs, setLogs] = useState(() => readBackendLogs());

  useEffect(() => {
    const refresh = () => setLogs(readBackendLogs());
    const onStorage = (event: StorageEvent) => {
      if (event.key === BACKEND_LOG_STORAGE_KEY) refresh();
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'BACKEND_LOG_UPDATED') refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);
    const timer = window.setInterval(refresh, 1500);
    refresh();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
      window.clearInterval(timer);
    };
  }, []);

  return logs;
}

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('clipboard unavailable');
}

export function BackendApp() {
  const logs = useBackendLogs();
  const reversedLogs = useMemo(() => logs.slice().reverse(), [logs]);
  const errorCount = useMemo(
    () => logs.filter((item) => String(item?.level || '') === 'error').length,
    [logs]
  );

  const copyLogs = async () => {
    const text = serializeBackendLogs(logs);
    if (!text) {
      window.alert('后台现在还是空的。');
      return;
    }
    try {
      await writeClipboard(text);
      window.alert('后台日志已经复制好了。');
    } catch {
      window.alert(text);
    }
  };

  const clearLogs = () => {
    if (!window.confirm('要清空后台日志吗？')) return;
    clearBackendLogs();
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <main className="backend-shell">
      <section className="backend-hero">
        <div className="backend-hero-top">
          <div>
            <h1 className="backend-title">后台</h1>
            <p className="backend-sub">
              这里会收所有 app 的运行日志和报错。黑字是正常运行，红字是异常，线下启动链也会在这里写全过程。
            </p>
          </div>
          <div className="backend-actions">
            <button className="backend-btn" type="button" onClick={copyLogs}>复制</button>
            <button className="backend-btn" type="button" onClick={clearLogs}>清空</button>
          </div>
        </div>
        <div className="backend-status-row">
          <span className={errorCount ? 'backend-pill backend-pill-error' : 'backend-pill'}>
            {errorCount ? `发现 ${errorCount} 条异常` : '正常运行'}
          </span>
          <span className="backend-pill">{logs.length} 条日志</span>
        </div>
      </section>

      <section className="backend-log-list" aria-live="polite">
        {!reversedLogs.length ? (
          <div className="backend-empty">暂时没有记录到异常。线下、聊天、通知这些如果炸了，新的日志会直接掉到这里。</div>
        ) : reversedLogs.map((item, index) => {
          const level = String(item?.level || 'info');
          const detail = String(item?.detail || '').trim();
          return (
            <article className={level === 'error' ? 'backend-log-card error' : 'backend-log-card'} key={item.id || `${item.ts || 0}-${index}`}>
              <div className="backend-log-meta">
                <div className="backend-log-chip">{String(item.app || 'shell')} · {String(item.source || 'runtime')}</div>
                <time className="backend-log-time">{formatBackendLogTime(item.ts)}</time>
              </div>
              <div className="backend-log-message">{String(item.message || '(empty)')}</div>
              {detail ? <pre className="backend-log-detail">{detail}</pre> : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
