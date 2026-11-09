import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ICON_CANVAS, ICON_STROKE, Icon } from './icons';

// BR-8: every icon of the set is drawn on the one canvas with the one line, and none sets its own.
describe('the icon set', () => {
  for (const [name, draw] of Object.entries(Icon)) {
    it(`${name} is drawn on the icon canvas with the icon line`, () => {
      const markup = renderToStaticMarkup(createElement(draw));
      expect(markup).toContain(`viewBox="0 0 ${ICON_CANVAS} ${ICON_CANVAS}"`);
      expect(markup).toContain(`stroke-width="${ICON_STROKE}"`);
      expect(markup.match(/viewBox=|stroke-width=/g)).toHaveLength(2);
      expect(markup).not.toContain('opacity');
      expect(markup).toContain('stroke-linecap="round"');
      expect(markup).toContain('stroke-linejoin="round"');
    });
  }
});
