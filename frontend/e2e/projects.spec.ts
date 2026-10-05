import { expect, test } from '@playwright/test';
import { ADMIN, PASSWORD, api, apiLogin, ensureUser, login, uniqueKey, waitForHydration } from './helpers';

let adminToken = '';
const staffA = 'e2e.a@test.local';
const staffB = 'e2e.b@test.local';
let staffBId = '';

test.beforeAll(async () => {
  adminToken = await apiLogin(ADMIN.email, ADMIN.password);
  await ensureUser(adminToken, 'E2E Alice', staffA);
  staffBId = await ensureUser(adminToken, 'E2E Bob', staffB);
});

test('admin creates a project, adds a task inline, moves it across columns, and it persists', async ({ page }) => {
  const key = uniqueKey();
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  await page.getByLabel('Name').fill(`Project ${key}`);
  await page.getByLabel('Key').fill(key);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${key}$`));
  await waitForHydration(page, 'section[aria-label="Todo"]');

  // Inline add: type a title, press Enter.
  await page.getByRole('button', { name: 'Add task to Todo' }).click();
  await page.getByLabel('New task title').fill('Write the brief');
  await page.keyboard.press('Enter');
  const todo = page.getByRole('region', { name: 'Todo' });
  await expect(todo.getByText('Write the brief')).toBeVisible();
  await expect(todo.getByText(`${key}-1`)).toBeVisible();

  // Drag across columns with the pointer.
  const card = todo.getByRole('button', { name: /Write the brief/ });
  const doing = page.getByRole('region', { name: 'Doing' });
  const from = await card.boundingBox();
  const to = await doing.boundingBox();
  await page.mouse.move(from!.x + 20, from!.y + 15);
  await page.mouse.down();
  await page.mouse.move(from!.x + 60, from!.y + 30, { steps: 5 });
  await page.mouse.move(to!.x + to!.width / 2, to!.y + 60, { steps: 12 });
  await page.mouse.up();
  await expect(doing.getByText('Write the brief')).toBeVisible();

  // Wait for the server to have the move before reloading, so the request is not cancelled.
  await expect
    .poll(async () => {
      const b = (await api(adminToken, 'GET', `/pm/projects/${key}/board`)).json;
      const task = b.tasks.find((t: { title: string }) => t.title === 'Write the brief');
      return b.columns.find((c: { id: string }) => c.id === task.columnId).name;
    })
    .toBe('Doing');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Doing' }).getByText('Write the brief')).toBeVisible();
});

test('staff assigns a task and posts an update; the assignee is notified', async ({ browser }) => {
  const key = uniqueKey();
  const tokenA = await apiLogin(staffA, PASSWORD);
  await api(tokenA, 'POST', '/pm/projects', { name: `Notify ${key}`, key });
  await api(tokenA, 'POST', `/pm/projects/${key}/tasks`, { title: 'Review the contract' });

  const ctxA = await browser.newContext();
  const a = await ctxA.newPage();
  await login(a, staffA);
  await a.goto(`/projects/${key}?task=${key}-1`);
  await a.getByRole('dialog').getByLabel('Assignee').selectOption({ label: 'E2E Bob' });
  await a.getByLabel('Post a work update').fill('Contract reviewed, two clauses flagged.');
  await a.getByRole('button', { name: 'Post update' }).click();
  await expect(a.getByText('Contract reviewed, two clauses flagged.')).toBeVisible();

  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  await login(b, staffB);
  await b.goto('/projects/my-work');
  await expect(b.getByText('Review the contract').first()).toBeVisible();
  await b.getByRole('button', { name: /Notifications/ }).click();
  await expect(b.getByText('assigned you').first()).toBeVisible();
  await expect(b.getByText('posted an update on').first()).toBeVisible();
  await ctxA.close();
  await ctxB.close();
});

test('staff cannot reach admin-only actions and see no per-member comparisons', async ({ page }) => {
  const tokenA = await apiLogin(staffA, PASSWORD);
  expect((await api(tokenA, 'PUT', `/pm/team/${staffBId}/access`, { role: 'admin', revoked: false })).status).toBe(403);
  expect((await api(tokenA, 'GET', '/pm/insights/export/workload')).status).toBe(403);
  const ins = await api(tokenA, 'GET', `/pm/insights?member=${staffBId}`);
  expect(ins.json.workload).toBeNull();

  await login(page, staffA);
  await page.goto('/projects/insights');
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
  await expect(page.getByText('Workload by member')).toHaveCount(0);
  await expect(page.getByLabel('Member')).toHaveCount(0);
  await page.goto('/projects/team');
  await expect(page.getByLabel(/Projects access for/)).toHaveCount(0);
});

test('revoked users lose access to Projects', async ({ page }) => {
  const email = `e2e.revoked.${Date.now()}@test.local`;
  const id = await ensureUser(adminToken, 'E2E Revoked', email);
  await api(adminToken, 'PUT', `/pm/team/${id}/access`, { role: 'staff', revoked: true });
  await login(page, email);
  await page.goto('/projects');
  await expect(page.getByText('Projects is not available to you')).toBeVisible();
});

test('moving a task into Done sets completion and shows in insights; moving it back clears it', async ({ page }) => {
  const key = uniqueKey();
  await api(adminToken, 'POST', '/pm/projects', { name: `Flow ${key}`, key });
  await api(adminToken, 'POST', `/pm/projects/${key}/tasks`, { title: 'Ship it' });
  const board = (await api(adminToken, 'GET', `/pm/projects/${key}/board`)).json;
  const done = board.columns.find((c: { type: string }) => c.type === 'done');
  const todo = board.columns.find((c: { type: string }) => c.type === 'todo');

  const completed = async () => (await api(adminToken, 'GET', `/pm/insights?project=${key}&range=7d`)).json.summary.completed;
  expect(await completed()).toBe(0);

  await login(page, ADMIN.email, ADMIN.password);
  await page.goto(`/projects/${key}?task=${key}-1`);
  await page.getByRole('dialog').getByLabel('Status').selectOption(done.id);
  await expect.poll(completed).toBe(1);

  await page.goto(`/projects/insights?project=${key}&range=7d`);
  await expect(page.getByText('1 task completed in this range.', { exact: true })).toBeVisible();

  await page.goto(`/projects/${key}?task=${key}-1`);
  await page.getByRole('dialog').getByLabel('Status').selectOption(todo.id);
  await expect.poll(completed).toBe(0);
});

test('insights date range is stored in the URL and survives a reload', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto('/projects/insights');
  await page.getByLabel('Date range').selectOption('7d');
  await expect(page).toHaveURL(/range=7d/);
  await expect(page.getByLabel('Date range')).toHaveValue('7d');
  await page.reload();
  await expect(page.getByLabel('Date range')).toHaveValue('7d');
  await page.getByLabel('Date range').selectOption('last-month');
  await expect(page).toHaveURL(/range=last-month/);
  await expect(page.getByLabel('Date range')).toHaveValue('last-month');
});
