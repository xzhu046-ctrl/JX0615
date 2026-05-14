import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BackendApp } from './BackendApp';

const root = document.getElementById('root');

if (!root) {
  throw new Error('React root is missing');
}

createRoot(root).render(
  <StrictMode>
    <BackendApp />
  </StrictMode>
);
