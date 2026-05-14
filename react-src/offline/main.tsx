import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OfflineApp } from './OfflineApp';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <OfflineApp />
  </StrictMode>
);
