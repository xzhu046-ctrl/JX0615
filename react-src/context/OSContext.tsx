import { createContext, ReactNode, useContext } from 'react';
import type { ShellAppHostSnapshot } from '../types';

type OSContextValue = {
  activeApp: string;
  title: string;
  hideTopbar: boolean;
  open: boolean;
  handleBack: () => unknown;
};

const OSContext = createContext<OSContextValue | null>(null);

export function OSProvider({ snapshot, children }: { snapshot: ShellAppHostSnapshot; children: ReactNode }) {
  const value: OSContextValue = {
    activeApp: String(snapshot.appId || ''),
    title: String(snapshot.title || 'App'),
    hideTopbar: !!snapshot.hideTopbar,
    open: !!snapshot.open,
    handleBack: () => window.handleBack?.()
  };

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
}

export function useOS() {
  const value = useContext(OSContext);
  if (!value) {
    throw new Error('useOS must be used inside OSProvider');
  }
  return value;
}
