import { test } from '@playwright/test';
import { ADMIN, login } from './helpers';

// Visual audit helper, not part of the smoke suite: SHOTS_DIR=... npx playwright test shots
const dir = process.env.SHOTS_DIR;

test.skip(!dir, 'set SHOTS_DIR to capture screenshots');

for (const [name, w, h] of [['desktop', 1440, 900], ['tablet', 768, 1000], ['phone', 375, 800]] as const) {
  test(`screenshots ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/projects/WEB');
    await page.waitForSelector('section[aria-label="Todo"]');
    await page.screenshot({ path: `${dir}/${name}-board.png` });
    await page.getByRole('button', { name: /^WEB-1 / }).first().click();
    await page.waitForSelector('[role="dialog"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/${name}-drawer.png` });
    await page.keyboard.press('Escape');
    await page.goto('/projects/insights');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${dir}/${name}-insights.png`, fullPage: true });
    await page.goto('/projects/my-work');
    await page.screenshot({ path: `${dir}/${name}-mywork.png` });
  });
}
