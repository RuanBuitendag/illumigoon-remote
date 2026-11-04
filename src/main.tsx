import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { App, loadComponentPage, startApp } from './domain';

const root = document.getElementById('root');

function show(Page: ComponentType) {
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <Page />
      </StrictMode>,
    );
  }
}

// The component page is for the dev server only, so the release build leaves it out.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('components')) {
  void loadComponentPage().then(show);
} else {
  startApp();
  show(App);
}
