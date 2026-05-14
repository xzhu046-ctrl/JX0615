import { useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';

type ScrollMode = 'bottom' | 'preserve' | 'top' | 'none';

type OfflineStorySnapshot = {
  html: string;
  scrollMode?: ScrollMode;
  scrollTop?: number;
  renderKey?: string;
};

declare global {
  interface Window {
    OfflineModeReactRenderer?: {
      render: (snapshot: OfflineStorySnapshot) => boolean;
      unmount: () => void;
    };
  }
}

let root: Root | null = null;
let mountedNode: HTMLElement | null = null;

function getStoryList() {
  return document.getElementById('storyList');
}

function StorySurface({ snapshot }: { snapshot: OfflineStorySnapshot }) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const list = getStoryList();
    if (!list) return;
    const mode = snapshot.scrollMode || 'bottom';
    if (mode === 'top') {
      list.scrollTop = 0;
      return;
    }
    if (mode === 'preserve') {
      const maxTop = Math.max(0, list.scrollHeight - list.clientHeight);
      list.scrollTop = Math.min(Math.max(0, Number(snapshot.scrollTop || 0) || 0), maxTop);
      return;
    }
    if (mode === 'bottom') {
      list.scrollTop = list.scrollHeight;
    }
  }, [snapshot.html, snapshot.renderKey, snapshot.scrollMode, snapshot.scrollTop]);

  return (
    <div
      ref={surfaceRef}
      className="offline-react-story-surface"
      data-react-story-render-key={snapshot.renderKey || ''}
      dangerouslySetInnerHTML={{ __html: snapshot.html || '' }}
    />
  );
}

function ensureRoot() {
  const node = getStoryList();
  if (!node) return null;
  if (!root || mountedNode !== node) {
    if (root) {
      try {
        root.unmount();
      } catch {
        // Ignore a stale root during iframe reloads.
      }
    }
    mountedNode = node;
    root = createRoot(node);
  }
  return root;
}

window.OfflineModeReactRenderer = {
  render(snapshot: OfflineStorySnapshot) {
    const currentRoot = ensureRoot();
    if (!currentRoot) return false;
    const safeSnapshot: OfflineStorySnapshot = {
      html: String(snapshot?.html || ''),
      scrollMode: snapshot?.scrollMode || 'bottom',
      scrollTop: Number(snapshot?.scrollTop || 0) || 0,
      renderKey: String(snapshot?.renderKey || Date.now())
    };
    flushSync(() => {
      currentRoot.render(<StorySurface snapshot={safeSnapshot} />);
    });
    return true;
  },
  unmount() {
    if (!root) return;
    root.unmount();
    root = null;
    mountedNode = null;
  }
};
