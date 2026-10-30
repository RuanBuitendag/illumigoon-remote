import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { startFleet } from './store/fleet-store';
import './styles.css';

startFleet();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
