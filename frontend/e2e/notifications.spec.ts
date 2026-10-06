import { expect, test } from '@playwright/test';
import { ADMIN, PASSWORD, api, apiLogin, ensureUser, login } from './helpers';

test('employees see in the bell when a teammate starts work and takes a break', async ({ page }) => {
  const stamp = Date.now();
  const starterName = `E2E Starter ${stamp}`;
  const starterEmail = `e2e.starter.${stamp}@test.local`;
  const adminToken = await apiLogin(ADMIN.email, ADMIN.password);
  await ensureUser(adminToken, starterName, starterEmail);
  await ensureUser(adminToken, 'E2E Watcher', 'e2e.watcher@test.local');

  // The watcher is already signed in and looking at the site.
  await login(page, 'e2e.watcher@test.local');
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /^Notifications/ }).waitFor();

  // A teammate starts work, then pauses.
  const starter = await apiLogin(starterEmail, PASSWORD);
  expect((await api(starter, 'POST', '/attendance/check-in')).status).toBe(201);
  expect((await api(starter, 'POST', '/attendance/break-start')).status).toBe(200);

  // The bell picks it up on reload (it also polls every 30 seconds).
  await page.reload();
  const bell = page.getByRole('button', { name: /^Notifications/ });
  await expect(bell).toHaveAccessibleName(/[1-9]\d* unread/);
  await bell.click();
  await expect(page.getByText(`${starterName} started work`)).toBeVisible();
  await expect(page.getByText(`${starterName} paused for a break`)).toBeVisible();

  // The person who acted is not told about themselves.
  const own = await api(starter, 'GET', '/notifications');
  expect(own.json.items.some((n: { title: string }) => n.title.startsWith(starterName))).toBe(false);

  // Mark all read clears the badge.
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByRole('button', { name: /^Notifications, 0 unread/ })).toBeVisible();
});

test('desktop alerts control explains what is missing instead of failing silently', async ({ page }) => {
  await login(page, 'e2e.watcher@test.local');
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /^Notifications/ }).click();
  // Either a working switch, or a plain sentence saying why not. Never nothing.
  const control = page.getByText('Desktop alerts on this device');
  await expect(control).toBeVisible();
  const help = page.getByText(/not set up on the server|cannot show desktop alerts|blocked for this site/);
  const sw = page.getByRole('switch', { name: 'Desktop alerts on this device' });
  await expect(sw.or(help)).toBeVisible();
});
