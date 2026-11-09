import type { Preview } from '@storybook/react-vite';
// The doors load the fonts and both style sheets, so every story draws with the app's own tokens.
import '../src/design-system';
import '../src/composites';
// The component page's frame (name, layer, notes, states side by side) loads with that page in the app, so the
// stories load it here.
import '../src/composites/component-page.css';
import { themes } from 'storybook/theming';

// The two sizes the app is made for: the iPhone and the laptop window. `--wide` is 900 px, so the laptop size
// is over it and the phone size under it.
const SIZES = {
  phone: { name: 'Phone', styles: { width: '393px', height: '852px' }, type: 'mobile' },
  laptop: { name: 'Laptop', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
} as const;

// Storybook stays on this machine, as the journey tests do. The in-page `/api` asks the online look server
// for shared looks, so a story would show whatever somebody published last. Here that server has nothing.
const browserFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  if (url.hostname === location.hostname) return browserFetch(input, init);
  return Promise.reject(new TypeError(`Storybook stays local: ${url.host} is not reached`));
};

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    viewport: { options: SIZES },
    backgrounds: { disable: true },
    controls: { expanded: true },
    // The app is dark, so the Docs pages are too, or its light words vanish on white.
    docs: { theme: themes.dark },
    a11y: { test: 'todo' },
    options: {
      storySort: { order: ['Foundations', 'Design system', 'Composites', 'Screens'] },
    },
  },
  tags: ['autodocs'],
};

export default preview;
