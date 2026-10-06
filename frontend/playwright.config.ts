import { defineConfig } from '@playwright/test';

/**
 * Smoke tests for the Projects area. They expect the backend running against a disposable
 * MySQL database (E2E_API_URL, default http://localhost:3011/api) with a super admin of
 * E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD, and serve the built frontend themselves:
 *   npm run build && npm run test:e2e
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:3011/api';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx next start -p 3100',
    url: 'http://localhost:3100/login',
    reuseExistingServer: true,
    timeout: 60_000,
    env: { INTERNAL_API_URL: API, NEXT_PUBLIC_API_URL: API },
  },
});
