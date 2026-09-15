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

test('array reach lines only originate from placements marked as effectors, and zoom scales the board', async ({ page, request }) => {
  const ritualA = await (await request.post('/api/rituals', { data: {
    name: 'Reach Source', purpose: 'Boon', primary: 'Chaos', subs: [], effect: 'Source effect.',
  } })).json();
  const ritualB = await (await request.post('/api/rituals', { data: {
    name: 'Reach Target', purpose: 'Evocation', primary: 'Zenith', subs: [], effect: 'Target effect.',
  } })).json();

  // Two adjacent placements (distance 1), well within a size-1 placement's
  // range — neither starts as an effector, so no reach line should exist
  // until one is marked as one.
  const arr = await (await request.post('/api/arrays', { data: {
    name: 'E2E Reach Array',
    radius: 2,
    placements: [
      { id: 'p1', ritualId: ritualA.id, q: 0, r: 0, size: 1, isEffector: false },
      { id: 'p2', ritualId: ritualB.id, q: 1, r: 0, size: 1, isEffector: false },
    ],
  } })).json();

  await page.goto('/arrays.html');
  await page.locator('.array-card', { hasText: 'E2E Reach Array' }).click();

  const board = page.locator('.hex-board-wrap svg');
  await expect(board).toBeVisible();
  await expect(page.locator('svg line.hex-reach-line')).toHaveCount(0);

  await page.locator('.placement-item', { hasText: 'Reach Source' }).locator('.effector-tag').click();

  const line = page.locator('svg line.hex-reach-line');
  await expect(line).toHaveCount(1);
  await expect(line).toHaveAttribute('marker-end', 'url(#reach-arrowhead)');

  const boardWrap = page.locator('.hex-board-wrap > div');
  const widthBefore = await boardWrap.evaluate((el) => el.getBoundingClientRect().width);
  await page.locator('text=Zoom:').locator('xpath=following-sibling::button[2]').click();
  const widthAfter = await boardWrap.evaluate((el) => el.getBoundingClientRect().width);
  expect(widthAfter).toBeGreaterThan(widthBefore);

  await request.delete(`/api/arrays/${arr.id}`);
});
