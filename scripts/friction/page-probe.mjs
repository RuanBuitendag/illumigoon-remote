// Runs inside the page. Lists the controls on the top layer, or taps one of them.
export function findControls({ tap }) {
  const CONTROLS = 'button, a[href], input, select, textarea, [role="button"], [role="switch"], [role="slider"]';
  // Controls that repeat in a list. Tapping one shows what tapping any of them shows.
  const REPEATS = ['.swatch-key', '.swatch-set .text-key', '.colour-slot', '.look-item', '.look-preset-press', '.recent-look'];
  const isScroller = (element) => /auto|scroll/.test(getComputedStyle(element).overflowY);

  function topLayer() {
    const middle = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const dialog = middle?.closest('[role="dialog"]');
    if (dialog) return dialog;
    for (let element = middle; element; element = element.parentElement) {
      if (isScroller(element) && element.scrollHeight > element.clientHeight) return element;
    }
    return document.body;
  }

  function isShown(element) {
    const { width, height } = element.getBoundingClientRect();
    if (width === 0 || height === 0) return false;
    if (element.closest('[inert], [aria-hidden="true"]')) return false;
    return getComputedStyle(element).visibility !== 'hidden';
  }

  // A number or a colour is a value, so "Colour 3" and "Colour 4" count as one control.
  function labelOf(element) {
    const text = element.getAttribute('aria-label') || element.innerText || element.placeholder || element.title;
    const label = (text || '').replace(/\s+/g, ' ').trim();
    const general = label.replace(/#[0-9a-f]{3,8}/gi, '#').replace(/\d+/g, '#');
    return general || `Unnamed ${element.className || element.tagName.toLowerCase()}`;
  }

  function kindOf(element) {
    if (element.matches('input[type="range"], [role="slider"]')) return 'slider';
    if (element.matches('input, textarea, select')) return 'text';
    return 'key';
  }

  const layer = topLayer();
  const screen =
    layer.getAttribute('aria-label') || layer.querySelector('h1')?.innerText || 'Home';
  const layerTop = layer === document.body ? 0 : layer.getBoundingClientRect().top;
  const counts = new Map();
  const controls = [...layer.querySelectorAll(CONTROLS)].filter(isShown).map((element) => {
    const label = labelOf(element);
    const key = `${screen} | ${label}`;
    const nth = counts.get(key) ?? 0;
    counts.set(key, nth + 1);
    return { element, key, label, nth };
  });

  if (tap) {
    const found = controls.find(({ key, nth }) => key === tap.key && nth === tap.nth);
    found?.element.click();
    return Boolean(found);
  }

  const offset = layer === document.body ? 0 : layer.scrollTop;
  return controls
    .filter(({ nth }) => nth === 0)
    .map(({ element, key, label }) => {
      const box = element.getBoundingClientRect();
      const down = box.top - layerTop + offset;
      return {
        key,
        label,
        screen,
        kind: kindOf(element),
        disabled: element.disabled === true,
        copies: counts.get(key),
        width: Math.round(box.width),
        height: Math.round(box.height),
        repeat: REPEATS.find((selector) => element.matches(selector)) ?? null,
        pixelsDown: Math.round(down),
        pixelsBelowScreen: Math.max(0, Math.round(down + box.height - innerHeight)),
        pixelsPastEdge: Math.max(0, Math.round(box.right - innerWidth)),
      };
    });
}
