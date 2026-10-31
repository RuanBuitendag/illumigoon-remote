import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, startApp } from './domain';

startApp();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
