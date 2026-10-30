import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.js', fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 1100 }, launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined } },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
