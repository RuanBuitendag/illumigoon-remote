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
