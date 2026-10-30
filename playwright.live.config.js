import { defineConfig } from '@playwright/test';
import config from './playwright.config.js';
export default defineConfig({ ...config, testMatch: '**/*.smoke.js', workers: 1, timeout: 90_000 });
