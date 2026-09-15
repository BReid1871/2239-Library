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

test('the resolution log lists reaches as text, matching the board', async ({ page, request }) => {
  const ritualA = await (await request.post('/api/rituals', { data: {
    name: 'Log Source', purpose: 'Enchantment', primary: 'Nadir', subs: [], effect: 'a',
  } })).json();
  const ritualB = await (await request.post('/api/rituals', { data: {
    name: 'Log Target', purpose: 'Familiar/Summoning', primary: 'Genesis', subs: [], effect: 'b',
  } })).json();
  const arr = await (await request.post('/api/arrays', { data: {
    name: 'E2E Log Array',
    radius: 2,
    placements: [
      { id: 'p1', ritualId: ritualA.id, q: 0, r: 0, size: 1, isEffector: true },
      { id: 'p2', ritualId: ritualB.id, q: 1, r: 0, size: 1, isEffector: false },
    ],
  } })).json();

  await page.goto('/arrays.html');
  await page.locator('.array-card', { hasText: 'E2E Log Array' }).click();

  await expect(page.locator('text=Resolution order (1)')).toBeVisible();
  await expect(page.locator('li', { hasText: 'Log Source → Log Target (distance 1)' })).toBeVisible();

  // Collapsing hides the list but keeps the count visible in the header.
  await page.locator('text=Resolution order (1)').click();
  await expect(page.locator('li', { hasText: 'Log Source → Log Target (distance 1)' })).toBeHidden();

  await request.delete(`/api/arrays/${arr.id}`);
});

test('the range preview highlights the board while the ritual picker is open', async ({ page, request }) => {
  const arr = await (await request.post('/api/arrays', { data: { name: 'E2E Preview Array', radius: 4, placements: [] } })).json();

  await page.goto('/arrays.html');
  await page.locator('.array-card', { hasText: 'E2E Preview Array' }).click();
  await page.waitForSelector('#hex-board-svg');

  await expect(page.locator('.hex-cell.preview-footprint, .hex-cell.preview-range')).toHaveCount(0);

  await page.locator('.hex-cell').first().click();
  await page.waitForSelector('#ritual-picker');
  const countAtSizeOne = await page.locator('.hex-cell.preview-footprint, .hex-cell.preview-range').count();
  expect(countAtSizeOne).toBeGreaterThan(0);

  await page.locator('.picker-size-row button', { hasText: '+' }).click();
  const countAtSizeTwo = await page.locator('.hex-cell.preview-footprint, .hex-cell.preview-range').count();
  expect(countAtSizeTwo).toBeGreaterThan(countAtSizeOne);

  await page.locator('.array-picker-cancel button').click();
  await expect(page.locator('.hex-cell.preview-footprint, .hex-cell.preview-range')).toHaveCount(0);

  await request.delete(`/api/arrays/${arr.id}`);
});

test('duplicating an array clones its placements under a new id', async ({ page, request }) => {
  const ritual = await (await request.post('/api/rituals', { data: {
    name: 'Dup Ritual', purpose: 'Bailiwick', primary: 'Coda', subs: [], effect: 'a',
  } })).json();
  const arr = await (await request.post('/api/arrays', { data: {
    name: 'E2E Duplicate Array', radius: 2, placements: [{ id: 'p1', ritualId: ritual.id, q: 0, r: 0, size: 1, isEffector: false }],
  } })).json();

  await page.goto('/arrays.html');
  await page.locator('.array-card', { hasText: 'E2E Duplicate Array' }).first().click();
  await page.locator('button', { hasText: 'Duplicate' }).click();

  const copyCard = page.locator('.array-card', { hasText: 'E2E Duplicate Array (copy)' });
  await expect(copyCard).toBeVisible();
  await expect(copyCard.locator('.array-card-meta')).toContainText('1 ritual');
  // The duplicate opens automatically and keeps the same placement data.
  await expect(page.locator('.placement-item-name', { hasText: 'Dup Ritual' })).toBeVisible();

  const arrays = await (await request.get('/api/arrays')).json();
  const original = arrays.find((a) => a.id === arr.id);
  const copy = arrays.find((a) => a.name === 'E2E Duplicate Array (copy)');
  expect(copy.placements[0].id).not.toBe(original.placements[0].id);

  await request.delete(`/api/arrays/${arr.id}`);
  await request.delete(`/api/arrays/${copy.id}`);
});

test('exporting an array downloads a PNG named after it', async ({ page, request }) => {
  const arr = await (await request.post('/api/arrays', { data: { name: 'E2E Export Array', radius: 2, placements: [] } })).json();

  await page.goto('/arrays.html');
  await page.locator('.array-card', { hasText: 'E2E Export Array' }).click();
  await page.waitForSelector('#hex-board-svg');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button', { hasText: 'Export PNG' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('E2E_Export_Array.png');

  await request.delete(`/api/arrays/${arr.id}`);
});

test('a ritual detail page links back to arrays it is placed in', async ({ page, request }) => {
  const ritual = await (await request.post('/api/rituals', { data: {
    name: 'Backlink Ritual', purpose: 'Bailiwick', primary: 'Vigour', subs: [], effect: 'a',
  } })).json();
  const arr = await (await request.post('/api/arrays', { data: {
    name: 'E2E Backlink Array', radius: 2, placements: [{ id: 'p1', ritualId: ritual.id, q: 0, r: 0, size: 1, isEffector: false }],
  } })).json();

  await page.goto('/');
  await page.locator('.rli-name', { hasText: 'Backlink Ritual' }).click();

  const link = page.locator('#detail-content a', { hasText: 'E2E Backlink Array' });
  await expect(link).toHaveAttribute('href', `arrays.html?open=${arr.id}`);

  await link.click();
  await page.waitForSelector('#hex-board-svg');
  await expect(page.locator('.array-name-input')).toHaveValue('E2E Backlink Array');

  await request.delete(`/api/arrays/${arr.id}`);
});

test('Ctrl+scroll zooms the array board; a plain scroll does not', async ({ page, request }) => {
  const arr = await (await request.post('/api/arrays', { data: { name: 'E2E Zoom Array', radius: 5, placements: [] } })).json();

  await page.goto('/arrays.html');
  await page.locator('.array-card', { hasText: 'E2E Zoom Array' }).click();
  await page.waitForSelector('#hex-board-svg');

  const zoomLabel = page.locator('#zoom-val');
  await expect(zoomLabel).toHaveText('100%');

  const box = await page.locator('.hex-board-wrap').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -200);
  await page.keyboard.up('Control');
  await expect(zoomLabel).not.toHaveText('100%');
  const zoomedIn = await zoomLabel.textContent();
  expect(parseInt(zoomedIn, 10)).toBeGreaterThan(100);

  await page.mouse.wheel(0, 40);
  await expect(zoomLabel).toHaveText(zoomedIn);

  await request.delete(`/api/arrays/${arr.id}`);
});
