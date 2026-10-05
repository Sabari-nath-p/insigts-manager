import { expect, test } from '@playwright/test';
import { ADMIN, api, apiLogin, login, uniqueKey, waitForHydration } from './helpers';

test('a card can be reordered and moved between columns with the keyboard', async ({ page }) => {
  const key = uniqueKey();
  const token = await apiLogin(ADMIN.email, ADMIN.password);
  await api(token, 'POST', '/pm/projects', { name: `Keys ${key}`, key });
  for (const title of ['Alpha', 'Bravo', 'Charlie']) await api(token, 'POST', `/pm/projects/${key}/tasks`, { title });

  await login(page, ADMIN.email, ADMIN.password);
  await page.goto(`/projects/${key}`);
  await waitForHydration(page, '[aria-roledescription="sortable"]');
  const todo = page.getByRole('region', { name: 'Todo' });
  const titles = async (name: string) => page.getByRole('region', { name }).getByRole('button', { name: /^[A-Z0-9]+-\d+ / }).allTextContents();

  // Within a column: pick up Alpha, move it down one slot, drop it.
  await todo.getByRole('button', { name: /Alpha/ }).focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(300); // dnd-kit measures drop zones after pick-up
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300); // let the new drop target commit before dropping
  await page.keyboard.press('Space');
  await expect.poll(async () => (await titles('Todo')).map((t) => t.match(/Alpha|Bravo|Charlie/)?.[0])).toEqual(['Bravo', 'Alpha', 'Charlie']);

  // dnd-kit hands focus back to the dropped card shortly after a drop; let that settle first.
  await page.waitForTimeout(500);

  // Across columns: pick up Bravo and move right into Doing.
  await todo.getByRole('button', { name: /Bravo/ }).focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(300); // dnd-kit measures drop zones after pick-up
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300); // let the new drop target commit before dropping
  await page.keyboard.press('Space');
  await expect(page.getByRole('region', { name: 'Doing' }).getByText('Bravo')).toBeVisible();

  // Wait for the server to have the move before reloading, so the request is not cancelled.
  await expect
    .poll(async () => {
      const b = (await api(token, 'GET', `/pm/projects/${key}/board`)).json;
      const col = b.columns.find((c: { id: string }) => c.id === b.tasks.find((t: { title: string }) => t.title === 'Bravo').columnId);
      return col.name;
    })
    .toBe('Doing');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Doing' }).getByText('Bravo')).toBeVisible();
});
