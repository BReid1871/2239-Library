const { test, expect } = require('@playwright/test');

test('home page loads and the server is healthy', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByText('2239 Library')).toBeVisible();

  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toEqual({ ok: true });
});
