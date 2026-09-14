const { defineConfig } = require('@playwright/test');

// Some sandboxes pre-install Chromium at a fixed path instead of letting
// Playwright manage its own browser cache; use it when present so tests
// don't try to download a browser there. Real CI installs its own browser
// via `npx playwright install` and won't have this path set.
const sandboxChromium = process.env.PLAYWRIGHT_BROWSERS_PATH === '/opt/pw-browsers'
  ? '/opt/pw-browsers/chromium'
  : undefined;

module.exports = defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    launchOptions: sandboxChromium ? { executablePath: sandboxChromium } : {},
  },
  webServer: {
    command: 'node server/index.js',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    env: {
      PORT: '3100',
      LIBRARY_DB_PATH: 'data/e2e-test.db',
    },
  },
});
