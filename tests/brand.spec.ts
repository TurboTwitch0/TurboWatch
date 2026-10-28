import { expect, test } from '@playwright/test';
import { seedPosts } from '../lib/seed';

// These checks use the normal build without a hosted Supabase connection.
// Real Auth API behavior is covered separately by the controlled SDK fixtures.
test.skip(Boolean(process.env.LIVE_TEST_BASE_URL), 'Run brand checks against the normal unconfigured build.');

test('the product preview labels sample content and opens real account setup from the keyboard', async ({ page }) => {
  await page.goto('/');
  const preview = page.getByRole('region', { name: 'Discover TurboWatch', exact: true });
  await expect(preview.getByRole('heading', { name: /Follow your curiosity/ })).toBeVisible();
  await expect(preview).toContainText('Sample content · not published community posts');
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  await expect(page.locator('.post-card')).toHaveCount(0);

  const join = preview.locator('.primary-button');
  await join.focus();
  await page.keyboard.press('Enter');
  const setup = page.getByRole('dialog', { name: 'Account setup required', exact: true });
  await expect(setup).toBeVisible();
  await expect(setup.getByRole('textbox')).toHaveCount(0);
  await expect(setup.getByRole('link', { name: 'Supabase setup instructions', exact: true })).toHaveAttribute('href', /supabase\/SETUP\.md/);
  await page.keyboard.press('Escape');
  await expect(setup).toBeHidden();
  await expect(join).toBeFocused();
});

test('the sample preview keeps navigation, watching, sharing, and unfinished comments in the same document', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Discover TurboWatch', exact: true })).toBeVisible();
  await page.evaluate(() => { document.documentElement.dataset.brandDocument = 'original-document'; });
  await page.getByRole('button', { name: 'See the sample library', exact: true }).click();
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
  expect(new URL(page.url()).searchParams.get('demo')).toBe('1');
  expect(await page.evaluate(() => document.documentElement.dataset.brandDocument)).toBe('original-document');

  await page.getByRole('group', { name: 'Post format', exact: true }).getByRole('button', { name: 'Videos', exact: true }).click();
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.filter(post => post.mediaType === 'video').length);
  await page.getByRole('combobox', { name: 'Sort posts', exact: true }).selectOption('newest');
  await page.getByRole('textbox', { name: 'Search TurboWatch', exact: true }).fill('scenic');
  await page.getByRole('button', { name: 'Open Take the scenic route.', exact: true }).click();

  const detail = page.getByRole('dialog', { name: 'Take the scenic route.', exact: true });
  const video = detail.locator('video');
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
  await video.evaluate(element => { const media = element as HTMLVideoElement; media.pause(); media.currentTime = 1.25; media.dataset.brandVideo = 'same-video'; });
  await detail.getByRole('textbox', { name: 'Write a comment', exact: true }).fill('An unfinished thought, preserved while sharing.');
  await detail.getByRole('button', { name: 'Share post', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Good things are better shared.', exact: true });
  await expect(share.getByRole('textbox', { name: 'Post link', exact: true })).toHaveValue(/\?demo=1&post=coast-escape$/);
  await page.keyboard.press('Escape');
  await expect(share).toBeHidden();
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('textbox', { name: 'Write a comment', exact: true })).toHaveValue('An unfinished thought, preserved while sharing.');
  expect(await video.getAttribute('data-brand-video')).toBe('same-video');
  expect(await video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeCloseTo(1.25, 1);
  expect(await page.evaluate(() => document.documentElement.dataset.brandDocument)).toBe('original-document');
});

test('the brand system fits narrow and wide screens and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const preview = page.getByRole('region', { name: 'Discover TurboWatch', exact: true });
  await expect(preview).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1050 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(preview.getByRole('button', { name: 'See the sample library', exact: true })).toBeVisible();
    await expect.poll(() => preview.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  }
  const motion = await preview.evaluate(element => {
    const durations = (value: string) => value.split(',').map(item => item.trim().endsWith('ms') ? parseFloat(item) / 1000 : parseFloat(item));
    return [element, ...Array.from(element.querySelectorAll('*'))].flatMap(item => {
      return [null, '::before', '::after'].flatMap(pseudo => {
        const style = getComputedStyle(item, pseudo);
        return [...durations(style.animationDuration), ...durations(style.transitionDuration)];
      });
    }).filter(Number.isFinite);
  });
  expect(Math.max(0, ...motion)).toBeLessThanOrEqual(0.01);
});
