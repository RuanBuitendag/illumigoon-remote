import { expect, test } from '@playwright/test';

test('each gallery section looks as saved', async ({ page }) => {
  await page.goto('/?gallery');
  await page.evaluate(() => document.fonts.ready);
  const sections = page.locator('[data-gallery]');
  await expect(sections.first()).toBeVisible();
  for (const name of await sections.evaluateAll((all) => all.map((section) => section.dataset.gallery))) {
    // Soft, so one run lists every section that changed.
    await expect.soft(page.locator(`[data-gallery="${name}"]`)).toHaveScreenshot(`${name}.png`);
  }
});
