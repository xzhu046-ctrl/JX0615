import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import App from './App';
import type { ShellAppHostSnapshot } from './types';

declare global {
  interface Window {
    ShellReactAppHost?: {
      render: (snapshot: ShellAppHostSnapshot) => boolean;
      unmount: () => void;
    };
    handleBack?: () => unknown;
  }
}

let root: Root | null = null;
let mountedNode: HTMLElement | null = null;

function getContainer() {
  return document.getElementById('app-container');
}

function ensureRoot() {
  const node = getContainer();
  if (!node) return null;
  if (!root || mountedNode !== node) {
    if (root) {
      try {
        root.unmount();
      } catch {
        // A previous shell host can disappear during a hard refresh.
      }
    }
    mountedNode = node;
    root = createRoot(node);
  }
  return root;
}

window.ShellReactAppHost = {
  render(snapshot: ShellAppHostSnapshot) {
    const currentRoot = ensureRoot();
    if (!currentRoot) return false;
    const safeSnapshot: ShellAppHostSnapshot = {
      appId: String(snapshot?.appId || ''),
      title: String(snapshot?.title || 'App'),
      hideTopbar: !!snapshot?.hideTopbar,
      open: !!snapshot?.open
    };
    flushSync(() => {
      currentRoot.render(<App snapshot={safeSnapshot} />);
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
