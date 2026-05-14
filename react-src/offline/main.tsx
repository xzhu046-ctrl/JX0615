import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OfflineApp } from '../apps/OfflineApp';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <OfflineApp />
  </StrictMode>
);
