import { expect, type Page } from '@playwright/test';

export const API = process.env.E2E_API_URL ?? 'http://localhost:3011/api';
export const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? 'admin@test.local', password: process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe123!' };
export const PASSWORD = 'ChangeMe123!';

export async function apiLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const json = await res.json();
  return json.accessToken;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(token: string, method: string, path: string, body?: unknown): Promise<{ status: number; json: T }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : (null as T) };
}

/** Creates an employee (idempotent on email) and returns its id. */
export async function ensureUser(adminToken: string, name: string, email: string): Promise<string> {
  const created = await api(adminToken, 'POST', '/users', {
    fullName: name,
    email,
    password: PASSWORD,
    phone: '3333333333',
    role: 'employee',
    workingType: 'flexible',
    flexibleMonthlyHours: 160,
    currentSalary: 1000,
  });
  if (created.status === 201 || created.status === 200) return created.json.id;
  const all = await api<Array<{ id: string; email: string }>>(adminToken, 'GET', '/users');
  return all.json.find((u) => u.email === email)!.id;
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await expect(page).not.toHaveURL(/login/);
}

export const uniqueKey = () => 'E' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');

/**
 * Resolves once the board is interactive: React has hydrated the element and dnd-kit has mounted
 * (it renders its screen-reader live region only after mounting client-side, which is when its
 * keyboard and pointer sensors are registered).
 */
export async function waitForHydration(page: Page, selector: string) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      const hydrated = !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
      return hydrated && !!document.querySelector('[id^="DndLiveRegion"]');
    },
    selector,
  );
}
