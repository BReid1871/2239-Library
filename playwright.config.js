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
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  // The e2e run shares a MySQL database across tests (truncated once in
  // globalSetup, not per test), so tests can't run in parallel workers
  // without stepping on each other's data.
  fullyParallel: false,
  workers: 1,
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
      MYSQLDATABASE: process.env.MYSQLDATABASE || 'library_test',
      MYSQL_URL: process.env.MYSQL_URL || '',
      MYSQLHOST: process.env.MYSQLHOST || '',
      MYSQLPORT: process.env.MYSQLPORT || '',
      MYSQLUSER: process.env.MYSQLUSER || '',
      MYSQLPASSWORD: process.env.MYSQLPASSWORD || '',
    },
  },
});
