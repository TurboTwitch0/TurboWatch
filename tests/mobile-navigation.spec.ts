import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('phone navigation owns keyboard focus, closes with Escape, and restores its opener', async ({ page }) => {
  await page.goto('/?demo=1');
  const opener = page.getByRole('button', { name: 'Open navigation', exact: true });
  await opener.click();
  const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
  const close = drawer.getByRole('button', { name: 'Close navigation', exact: true });
  await expect(close).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  for (let index = 0; index < 18; index += 1) {
    await page.keyboard.press(index % 2 ? 'Tab' : 'Shift+Tab');
    expect(await drawer.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('/');
  expect(await drawer.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  // Off-screen links must not remain in the phone's tab sequence.
  await page.keyboard.press('Shift+Tab');
  expect(await page.locator('.sidebar').evaluate(element => element.contains(document.activeElement))).toBe(false);
});

test('drawer destinations receive focus and a nested form closes back into navigation', async ({ page }) => {
  await page.goto('/?demo=1');
  const opener = page.getByRole('button', { name: 'Open navigation', exact: true });
  await opener.click();
  const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
  await drawer.getByRole('button', { name: 'New collection', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'A home for your next obsession.', exact: true });
  await form.getByRole('textbox', { name: 'Collection name', exact: true }).fill('Keep this collection draft');
  await page.keyboard.press('Escape');
  await expect(form).toHaveCount(0);
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'New collection', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await drawer.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  expect(new URL(page.url()).searchParams.get('view')).toBe('explore');
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('short screens can reach the account and desktop resize releases the modal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/?demo=1');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
  const account = drawer.locator('.account-button');
  await account.scrollIntoViewIfNeeded();
  const bounds = (await account.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(568);
  expect(await drawer.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await expect(page.getByRole('button', { name: 'TurboWatch home', exact: true })).toBeFocused();
  const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await navigation.getByRole('button', { name: 'Explore', exact: true }).click();
  expect(new URL(page.url()).searchParams.get('view')).toBe('explore');
  await expect(page.locator('#main-content')).toBeFocused();
});

for (const width of [800, 1440]) {
  test(`a nested form returns focus to the visible sidebar after resizing to ${width}px`, async ({ page }) => {
    await page.goto('/?demo=1');
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('dialog', { name: 'Navigation', exact: true }).getByRole('button', { name: 'New collection', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'A home for your next obsession.', exact: true });
    await form.getByRole('textbox', { name: 'Collection name', exact: true }).fill('Keep this while resizing');
    await page.setViewportSize({ width, height: 1050 });
    await expect(page.locator('.sidebar')).not.toHaveAttribute('role', 'dialog');
    await expect(form.getByRole('textbox', { name: 'Collection name', exact: true })).toHaveValue('Keep this while resizing');
    await page.keyboard.press('Escape');
    await expect(form).toHaveCount(0);
    await expect(page.locator('.sidebar').getByRole('button', { name: width === 1440 ? 'New collection' : 'TurboWatch home', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });
}

test('the visible close control and outside backdrop dismiss phone navigation', async ({ page }) => {
  await page.goto('/?demo=1');
  const opener = page.getByRole('button', { name: 'Open navigation', exact: true });
  await opener.click();
  const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
  const close = drawer.getByRole('button', { name: 'Close navigation', exact: true });
  const bounds = (await close.boundingBox())!;
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole('button', { name: 'Dismiss navigation backdrop', exact: true }).click({ position: { x: 370, y: 200 } });
  await expect(drawer).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('opening navigation pauses a covered short and preserves a deliberate pause on close', async ({ page }) => {
  await page.goto('/?demo=1&view=shorts');
  const video = page.locator('.short-player video');
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  await video.evaluate(async element => { const media = element as HTMLVideoElement; media.muted = true; await media.play(); });
  const opener = page.getByRole('button', { name: 'Open navigation', exact: true });
  await opener.click();
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(false);
  await video.evaluate(element => (element as HTMLVideoElement).pause());
  await opener.click();
  await page.keyboard.press('Escape');
  expect(await video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true);
});

test('arrow keys scroll the phone drawer without changing the short underneath it', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/?demo=1&view=shorts');
  const video = page.locator('.short-player video');
  await expect(video).toBeVisible();
  const source = await video.getAttribute('src');

  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
  await expect(drawer.getByRole('button', { name: 'Close navigation', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(video).toHaveAttribute('src', source!, { timeout: 1500 });
  await expect.poll(() => drawer.evaluate(element => element.scrollTop)).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await expect(video).not.toHaveAttribute('src', source!);
});
