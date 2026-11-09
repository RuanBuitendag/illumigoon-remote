import { addons } from 'storybook/manager-api';
import { themes } from 'storybook/theming';

// Storybook itself in the app's dark colours. The panel with Controls sits at the right, so a phone screen keeps
// the full height of the window.
addons.setConfig({ theme: themes.dark, panelPosition: 'right' });
