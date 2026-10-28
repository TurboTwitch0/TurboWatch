import { expect, test, type Locator } from '@playwright/test';
import type { SocialState } from '../lib/model';
import { seedPosts } from '../lib/seed';

const storageKey = 'turbowatch:demo:v1';
const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

test.skip(Boolean(process.env.LIVE_TEST_BASE_URL), 'Use the normal build and its explicitly selected sample library.');

const activeId = (stage: Locator) => stage.getAttribute('data-active-id');

test('the discovery stage supports scoped keyboard controls and opens a real story without resetting watch or share state', async ({ page }) => {
  await page.goto('/?demo=1');
  const stage = page.getByRole('region', { name: 'Content showcase', exact: true });
  const canvas = stage.getByTestId('showcase-stage');
  await expect(stage).toHaveAttribute('data-active-id', seedPosts[0].id);
  await expect(stage.locator('video')).toHaveCount(0);
  await page.evaluate(() => { document.documentElement.dataset.showcaseDocument = 'same-document'; });

  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await expect(stage).toHaveAttribute('data-active-id', seedPosts[1].id);
  await page.keyboard.press('End');
  await expect(stage).toHaveAttribute('data-active-id', seedPosts.at(-1)!.id);
  await page.keyboard.press('Home');
  await expect(stage).toHaveAttribute('data-active-id', seedPosts[0].id);
  await stage.getByRole('button', { name: 'Next discovery', exact: true }).click();
  await expect(stage).toHaveAttribute('data-active-id', seedPosts[1].id);
  await stage.getByRole('button', { name: 'Previous discovery', exact: true }).click();
  await expect(stage).toHaveAttribute('data-active-id', seedPosts[0].id);
  await stage.getByRole('button', { name: 'Watch this story', exact: true }).click();

  const detail = page.getByRole('dialog', { name: seedPosts[0].title, exact: true });
  await expect(detail).toBeVisible();
  const video = detail.locator('video');
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
  await video.evaluate(element => {
    const media = element as HTMLVideoElement;
    media.pause(); media.currentTime = 1.25; media.dataset.showcasePlayback = 'preserved';
  });
  await detail.getByRole('textbox', { name: 'Write a comment', exact: true }).fill('An unfinished thought beside a story.');
  await detail.getByRole('button', { name: 'Share post', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Good things are better shared.', exact: true });
  await expect(share.getByRole('textbox', { name: 'Post link', exact: true })).toHaveValue(/\?demo=1&post=coast-escape$/);
  await page.keyboard.press('Escape');
  await expect(share).toBeHidden();
  await expect(detail.getByRole('textbox', { name: 'Write a comment', exact: true })).toHaveValue('An unfinished thought beside a story.');
  expect(await video.getAttribute('data-showcase-playback')).toBe('preserved');
  expect(await video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeCloseTo(1.25, 1);
  await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(stage).toHaveAttribute('data-active-id', seedPosts[0].id);
  expect(await page.evaluate(() => document.documentElement.dataset.showcaseDocument)).toBe('same-document');
});

test('phone touch browsing has explicit controls, avoids accidental opening, and leaves input arrows alone', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/?demo=1`);
    const stage = page.getByRole('region', { name: 'Content showcase', exact: true });
    const canvas = stage.getByTestId('showcase-stage');
    await expect(stage).toHaveAttribute('data-active-id', seedPosts[0].id);
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    const start = { identifier: 1, clientX: box.x + box.width - 25, clientY: box.y + box.height / 2 };
    const end = { identifier: 1, clientX: box.x + 25, clientY: start.clientY };
    await canvas.dispatchEvent('touchstart', { touches: [start] });
    await canvas.dispatchEvent('touchend', { changedTouches: [end] });
    await expect(stage).toHaveAttribute('data-active-id', seedPosts[1].id);
    // Browsers may synthesize a click at the end of a swipe. It must not open
    // the newly focused card before the person explicitly chooses to watch.
    await stage.locator('.showcase-card.is-active').dispatchEvent('click');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await canvas.dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: start.clientX, clientY: box.y + 20 }] });
    await canvas.dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: start.clientX - 5, clientY: box.y + box.height - 20 }] });
    await expect(stage).toHaveAttribute('data-active-id', seedPosts[1].id);
    await stage.getByRole('button', { name: 'Previous discovery', exact: true }).click();
    await expect(stage).toHaveAttribute('data-active-id', seedPosts[0].id);
    const search = page.getByRole('textbox', { name: 'Search TurboWatch', exact: true });
    await search.focus();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-active-id', seedPosts[0].id);
    await expect(search).toBeFocused();
  } finally { await context.close(); }
});

test('an incoming post preserves the focused discovery by identity rather than array position', async ({ page, context }) => {
  await page.goto('/?demo=1');
  const stage = page.getByRole('region', { name: 'Content showcase', exact: true });
  await expect(stage).toHaveAttribute('data-active-id', seedPosts[0].id);
  await stage.getByRole('button', { name: 'Next discovery', exact: true }).click();
  await expect(stage).toHaveAttribute('data-active-id', seedPosts[1].id);
  await stage.locator('.showcase-card.is-active').evaluate(element => { (element as HTMLElement).dataset.selectionSurvived = 'yes'; });
  const otherTab = await context.newPage();
  try {
    await otherTab.goto('/?demo=1');
    await expect(otherTab.locator('.post-card')).toHaveCount(seedPosts.length);
    await otherTab.evaluate(key => {
      const state = JSON.parse(localStorage.getItem(key)!) as SocialState;
      state.posts.unshift({ ...state.posts[0], id: 'showcase-new-arrival', title: 'A newly shared discovery', createdAt: '2099-01-01T00:00:00.000Z' });
      localStorage.setItem(key, JSON.stringify(state));
    }, storageKey);
    await expect(page.locator('.post-card')).toHaveCount(seedPosts.length + 1);
    await expect(stage).toHaveAttribute('data-active-id', seedPosts[1].id);
    await expect(stage.locator('.showcase-card.is-active')).toHaveAttribute('data-selection-survived', 'yes');
  } finally { await otherTab.close(); }
});

test('the spatial showcase fits narrow screens, offers visible focus, and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const stage = page.getByRole('region', { name: 'Content showcase', exact: true });
  await expect(stage).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1050 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(stage.locator('.showcase-card.is-active')).toBeVisible();
    await expect(stage.getByRole('button', { name: 'Next discovery', exact: true })).toBeVisible();
    await expect(stage.locator('video')).toHaveCount(0);
  }
  const canvas = stage.getByTestId('showcase-stage');
  await canvas.focus();
  await expect(canvas).toBeFocused();
  const focus = await canvas.evaluate(element => {
    const style = getComputedStyle(element);
    return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
  });
  expect(focus).toBe(true);
  const offstage = stage.locator('.showcase-card:not(.is-active)');
  expect(await offstage.evaluateAll(elements => elements.every(element => element.getAttribute('aria-hidden') === 'true' && (element as HTMLElement).tabIndex < 0))).toBe(true);
  const duration = await stage.evaluate(element => {
    const seconds = (value: string) => value.split(',').map(item => item.trim().endsWith('ms') ? parseFloat(item) / 1000 : parseFloat(item));
    return Math.max(0, ...[element, ...Array.from(element.querySelectorAll('*'))].flatMap(item => [null, '::before', '::after'].flatMap(pseudo => {
      const style = getComputedStyle(item, pseudo);
      return [...seconds(style.animationDuration), ...seconds(style.transitionDuration)];
    })).filter(Number.isFinite));
  });
  expect(duration).toBeLessThanOrEqual(0.01);
  expect(await activeId(stage)).toBe('coast-escape');
  await stage.getByRole('button', { name: 'Watch this story', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Take the scenic route.', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('demo')).toBe('1');
  expect(new URL(page.url()).searchParams.get('post')).toBe('coast-escape');
  await expect(page.locator('.demo-indicator')).toHaveText('Demo · saved in this browser');
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.goto('/');
  await stage.getByRole('button', { name: /^Focus discovery 2:/ }).click();
  const photo = seedPosts.find(post => post.id === 'room-to-breathe')!;
  await expect(stage).toHaveAttribute('data-active-id', photo.id);
  await stage.getByRole('button', { name: 'Open this photo', exact: true }).click();
  const photoDetail = page.getByRole('dialog', { name: photo.title, exact: true });
  await expect(photoDetail.locator('.detail-media img')).toHaveAttribute('src', photo.mediaUrl);
});
