const { test, expect } = require('@playwright/test');

test('the server is healthy and the app loads', async ({ page, request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  await page.goto('/');
  await expect(page.locator('.lib-header h2')).toHaveText('Library');
});

test('adding a ritual persists in the database, not just this browser session', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.locator('#lib-count-sub')).toHaveText('0 rituals');

  await page.locator('#f-name').fill('E2E Test Ritual');
  await page.locator('#f-purpose').selectOption('Boon');
  await page.locator('#f-primary .tag', { hasText: 'Aether' }).click();
  await page.locator('#f-effect').fill('Created by an end-to-end test.');
  await page.getByRole('button', { name: 'Save to library' }).click();

  await expect(page.locator('.rli-name', { hasText: 'E2E Test Ritual' })).toBeVisible();

  // A brand-new browser context shares no localStorage/cookies with the page
  // above — if the ritual still shows up there, the data is coming from the
  // server's database, not from browser-side storage.
  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto('/');
  await expect(freshPage.locator('.rli-name', { hasText: 'E2E Test Ritual' })).toBeVisible();
  await freshContext.close();
});

test('the theme toggle switches and persists across reload', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.locator('.theme-toggle');

  await expect(html).not.toHaveAttribute('data-theme', /.+/);
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.locator('.theme-toggle').click();
  await expect(html).toHaveAttribute('data-theme', 'light');
});
