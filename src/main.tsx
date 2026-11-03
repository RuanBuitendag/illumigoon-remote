import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, GalleryScreen, startApp } from './domain';

// `?gallery` on the dev server shows every primitive in each state, for `npm run screenshots`.
const isGallery = import.meta.env.DEV && new URLSearchParams(window.location.search).has('gallery');
if (!isGallery) startApp();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<StrictMode>{isGallery ? <GalleryScreen /> : <App />}</StrictMode>);
}
