import { expect, test, type Locator } from '@playwright/test';
import { createDemoState } from '../lib/demo-state';
import { demoUser, seedBoards, seedComments, seedCreators, seedMessages, seedPosts } from '../lib/seed';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const seedSavedIds = new Set(seedBoards.flatMap(board => board.postIds));
const savedPosts = seedPosts.filter(post => seedSavedIds.has(post.id));

// Explicit local samples exercise client behavior; these are not hosted-auth checks.
test.skip(Boolean(process.env.LIVE_TEST_BASE_URL), 'Use the normal unconfigured build and its explicitly selected sample library.');

async function ready(video: Locator) {
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
}

function hasVisibleFocus(element: Element) {
  const style = getComputedStyle(element);
  return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
}

test('following uses real follow choices and keeps feed filters through reload and browser history', async ({ page }) => {
  const person = seedCreators.find(creator => creator.id === 'maya')!;
  await page.goto('/?demo=1&view=explore');
  await page.getByRole('button', { name: `Follow ${person.name}`, exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('button', { name: 'For you', exact: true }).click();
  const source = page.getByRole('group', { name: 'Feed source', exact: true });
  await source.getByRole('button', { name: 'Following', exact: true }).click();
  const expected = seedPosts.filter(post => post.creatorId === person.id);
  await expect(page.locator('.post-card')).toHaveCount(expected.length);
  await expect(page.locator('.post-card .post-title')).toHaveText(expected.map(post => post.title));
  expect(new URL(page.url()).searchParams.get('following')).toBe('1');
  for (const stage of await page.locator('.content-showcase').all()) {
    const active = await stage.getAttribute('data-active-id');
    if (active) expect(expected.map(post => post.id)).toContain(active);
  }
  await page.getByRole('textbox', { name: 'Search TurboWatch', exact: true }).fill('@mayarivera');
  await page.getByRole('group', { name: 'Post format', exact: true }).getByRole('button', { name: 'Videos', exact: true }).click();
  await page.getByRole('combobox', { name: 'Sort posts', exact: true }).selectOption('newest');
  await page.getByRole('button', { name: 'Travel', exact: true }).click();
  const videos = expected.filter(post => post.mediaType === 'video' && post.category === 'Travel');
  await expect(page.locator('.post-card')).toHaveCount(videos.length);
  const before = new URL(page.url()).searchParams;
  for (const [key, value] of [['q', '@mayarivera'], ['category', 'Travel'], ['media', 'video'], ['sort', 'newest'], ['following', '1']]) expect(before.get(key)).toBe(value);
  await page.reload();
  await expect(source.getByRole('button', { name: 'Following', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.post-card')).toHaveCount(videos.length);
  await source.getByRole('button', { name: 'Discover', exact: true }).click();
  expect(new URL(page.url()).searchParams.has('following')).toBe(false);
  await page.goBack();
  await expect(source.getByRole('button', { name: 'Following', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.post-card .post-title').first().click();
  const detail = page.getByRole('dialog', { name: videos[0].title, exact: true });
  await detail.getByRole('button', { name: 'Following', exact: true }).click();
  await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.locator('.post-card')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.post-card')).toHaveCount(0);
});

test('phone Saved navigation finds a newly saved post and supports search, formats, sorting, and unsaving', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const post = seedPosts.find(item => item.mediaType === 'image' && !seedSavedIds.has(item.id))!;
    await page.goto(`${baseUrl}/?demo=1`);
    const card = page.locator('.post-card').filter({ has: page.getByRole('button', { name: post.title, exact: true }) });
    await card.getByRole('button', { name: 'Save post', exact: true }).tap();
    await page.getByRole('navigation', { name: 'Mobile navigation', exact: true }).getByRole('button', { name: 'Collections', exact: true }).tap();
    const library = page.getByRole('group', { name: 'Saved library', exact: true });
    await expect(library.getByRole('button', { name: /^All saved\b/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.post-card')).toHaveCount(savedPosts.length + 1);
    expect(new URL(page.url()).searchParams.get('library')).toBe('saved');
    const search = page.getByLabel('Search saved posts', { exact: true });
    await search.fill(post.title);
    await expect(page.locator('.post-card')).toHaveCount(1);
    await expect(page.locator('.post-card .post-title')).toHaveText(post.title);
    await page.getByRole('button', { name: 'Clear saved search', exact: true }).tap();
    const formats = page.getByRole('group', { name: 'Saved post format', exact: true });
    await formats.getByRole('button', { name: 'Photos', exact: true }).tap();
    const expected = [...savedPosts, post].filter(item => item.mediaType === 'image').sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    await page.getByRole('combobox', { name: 'Saved posts sort', exact: true }).selectOption('title');
    await expect(page.locator('.post-card .post-title')).toHaveText(expected.map(item => item.title));
    await search.fill(post.title);
    await page.locator('.post-card').getByRole('button', { name: 'Unsave post', exact: true }).tap();
    await expect(page.locator('.post-card')).toHaveCount(0);
    await page.reload();
    await expect(library.getByRole('button', { name: /^All saved\b/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.post-card')).toHaveCount(savedPosts.length);
    await expect(page.locator('.post-card .post-title').filter({ hasText: post.title })).toHaveCount(0);
  } finally { await context.close(); }
});

test('collection search and private board navigation restore the selected collection instead of losing it on reload', async ({ page }) => {
  const board = seedBoards[0];
  const expected = seedPosts.filter(post => board.postIds.includes(post.id));
  await page.goto('/?demo=1&view=boards');
  await page.getByLabel('Search collections', { exact: true }).fill('not-a-real-collection-729');
  await expect(page.locator('.board-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear collection search', exact: true }).click();
  await expect(page.locator('.board-card')).toHaveCount(seedBoards.length);
  await page.getByLabel('Search collections', { exact: true }).fill(board.name);
  await expect(page.locator('.board-card')).toHaveCount(1);
  await page.getByRole('button', { name: board.name, exact: true }).last().click();
  expect(new URL(page.url()).searchParams.get('board')).toBe(board.id);
  await expect(page.locator('.post-card')).toHaveCount(expected.length);
  await page.reload();
  await expect(page.getByRole('heading', { name: board.name, exact: true })).toBeVisible();
  await expect(page.locator('.post-card')).toHaveCount(expected.length);
  await page.getByRole('button', { name: 'All collections', exact: true }).click();
  await expect(page.locator('.board-card')).toHaveCount(seedBoards.length);
  await page.goBack();
  await expect(page.getByRole('heading', { name: board.name, exact: true })).toBeVisible();
  await expect(page.locator('.post-card')).toHaveCount(expected.length);
  await page.goto('/?demo=1&view=boards&board=not-owned-or-unavailable');
  await expect(page.getByRole('heading', { name: 'This collection is unavailable.', exact: true })).toBeVisible();
  await expect(page.locator('.post-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to collections', exact: true }).click();
  await expect(page.locator('.board-card')).toHaveCount(seedBoards.length);
});

test('signed-out saved and following views never expose a cached sample identity as a real account', async ({ page }) => {
  const sample = createDemoState({ user: demoUser, creators: seedCreators, posts: seedPosts, comments: seedComments, messages: seedMessages, boards: seedBoards });
  await page.addInitScript(value => localStorage.setItem('turbowatch:demo:v1', JSON.stringify(value)), sample);
  await page.goto('/?view=boards&library=saved');
  await expect(page.getByRole('heading', { name: 'Keep your good finds together.', exact: true })).toBeVisible();
  await expect(page.locator('.post-card')).toHaveCount(0);
  await expect(page.locator('.board-card')).toHaveCount(0);
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  await page.getByRole('button', { name: 'Sign in to save', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Account setup required', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/?following=1');
  await expect(page.locator('.post-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign in to follow creators', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Account setup required', exact: true })).toBeVisible();
  await expect(page.locator('.account-button strong')).toHaveText('Join the community');
  expect(new URL(page.url()).searchParams.has('demo')).toBe(false);
});

test('a failed video offers a real retry and keeps the same recovered media and draft during social actions', async ({ page }) => {
  const pattern = '**/media/coast.mp4';
  await page.route(pattern, route => route.fulfill({ status: 200, contentType: 'video/mp4', headers: { 'cache-control': 'no-store' }, body: 'unsupported-video-bytes' }));
  await page.goto('/?demo=1&post=coast-escape');
  const detail = page.getByRole('dialog', { name: 'Take the scenic route.', exact: true });
  const video = detail.locator('.detail-media video');
  await expect(detail.getByRole('button', { name: 'Retry video', exact: true })).toBeVisible();
  await video.evaluate(element => { (element as HTMLVideoElement).dataset.recoveredIdentity = 'same-native-player'; });
  await page.unroute(pattern);
  await detail.getByRole('button', { name: 'Retry video', exact: true }).click();
  await ready(video);
  await expect(detail.getByRole('button', { name: 'Retry video', exact: true })).toHaveCount(0);
  await expect(video).toHaveAttribute('data-recovered-identity', 'same-native-player');
  await video.evaluate(element => { const media = element as HTMLVideoElement; media.pause(); media.currentTime = 1.1; });
  const comment = detail.getByRole('textbox', { name: 'Write a comment', exact: true });
  await comment.fill('Still here after recovering the video.');
  await detail.getByRole('button', { name: 'Like post', exact: true }).click();
  await detail.getByRole('button', { name: 'Share post', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Good things are better shared.', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(comment).toHaveValue('Still here after recovering the video.');
  await expect(video).toHaveAttribute('data-recovered-identity', 'same-native-player');
  expect(await video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeCloseTo(1.1, 1);
  expect(await video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true);
});

test('covered players pause without restarting and resume only when the person had left them playing', async ({ page }) => {
  await page.goto('/?demo=1&view=shorts');
  const short = page.locator('.short-player video');
  await ready(short);
  await short.evaluate(async element => { const media = element as HTMLVideoElement; media.dataset.overlayIdentity = 'original-short'; media.muted = true; await media.play(); });
  await page.getByRole('button', { name: 'Comment on video', exact: true }).click();
  await expect.poll(() => short.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true);
  const detail = page.getByRole('dialog', { name: seedPosts.find(post => post.mediaType === 'video')!.title, exact: true });
  const detailVideo = detail.locator('.detail-media video');
  await ready(detailVideo);
  await detailVideo.evaluate(async element => { const media = element as HTMLVideoElement; media.muted = true; media.currentTime = 1; media.dataset.overlayIdentity = 'original-detail'; await media.play(); });
  await detail.getByRole('textbox', { name: 'Write a comment', exact: true }).fill('An unfinished thought while sharing.');
  await detail.getByRole('button', { name: 'Share post', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Good things are better shared.', exact: true })).toBeVisible();
  // The covered dialog is intentionally inert/hidden from accessibility queries.
  const coveredDetail = page.locator('.post-dialog .detail-media video');
  await expect.poll(() => coveredDetail.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(detailVideo).toHaveAttribute('data-overlay-identity', 'original-detail');
  await expect.poll(() => detailVideo.evaluate(element => (element as HTMLVideoElement).paused)).toBe(false);
  await expect(detail.getByRole('textbox', { name: 'Write a comment', exact: true })).toHaveValue('An unfinished thought while sharing.');
  await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(short).toHaveAttribute('data-overlay-identity', 'original-short');
  await expect.poll(() => short.evaluate(element => (element as HTMLVideoElement).paused)).toBe(false);
  await short.evaluate(element => (element as HTMLVideoElement).pause());
  await page.getByRole('button', { name: 'Share video', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Good things are better shared.', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(short).toHaveAttribute('data-overlay-identity', 'original-short');
  expect(await short.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true);
});

test('saved-library and following controls fit narrow screens and remain keyboard operable with reduced motion', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1050 });
    await page.goto('/?demo=1&view=boards&library=saved');
    const formats = page.getByRole('group', { name: 'Saved post format', exact: true });
    const photos = formats.getByRole('button', { name: 'Photos', exact: true });
    await photos.focus();
    await page.keyboard.press('Enter');
    await expect(photos).toHaveAttribute('aria-pressed', 'true');
    expect(await photos.evaluate(hasVisibleFocus)).toBe(true);
    expect((await photos.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Clear library filters', exact: true }).click();
    await expect(page.getByLabel('Search saved posts', { exact: true })).toBeFocused();
    await page.goto('/?demo=1');
    const following = page.getByRole('group', { name: 'Feed source', exact: true }).getByRole('button', { name: 'Following', exact: true });
    await following.focus();
    await page.keyboard.press('Enter');
    await expect(following).toHaveAttribute('aria-pressed', 'true');
    expect(await following.evaluate(hasVisibleFocus)).toBe(true);
    expect((await following.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/?demo=1&view=boards');
  const duration = await page.locator('.saved-library').evaluate(section => {
    const seconds = (value: string) => value.split(',').map(item => item.trim().endsWith('ms') ? parseFloat(item) / 1000 : parseFloat(item));
    return Math.max(0, ...[section, ...Array.from(section.querySelectorAll('*'))].flatMap(element => [null, '::before', '::after'].flatMap(pseudo => {
      const style = getComputedStyle(element, pseudo);
      return [...seconds(style.animationDuration), ...seconds(style.transitionDuration)];
    })).filter(Number.isFinite));
  });
  expect(duration).toBeLessThanOrEqual(0.01);
  expect(errors).toEqual([]);
});

test('shorts distinguish intentional vertical swipes from diagonal gestures and native control touches', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const videos = seedPosts.filter(post => post.mediaType === 'video');
    await page.goto(`${baseUrl}/?demo=1&view=shorts`);
    const player = page.locator('.short-player');
    const video = player.locator('video');
    await expect(video).toHaveAttribute('src', videos[0].mediaUrl);
    await player.scrollIntoViewIfNeeded();
    const box = (await player.boundingBox())!;
    const x = box.x + box.width / 2;
    async function swipe(fromX: number, fromY: number, toX: number, toY: number) {
      await player.dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: fromX, clientY: fromY }] });
      await player.dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: toX, clientY: toY }] });
    }
    await swipe(x, box.y + box.height - 20, x, box.y + box.height - 140);
    await expect(video).toHaveAttribute('src', videos[0].mediaUrl);
    await swipe(box.x + 15, box.y + 90, box.x + box.width - 15, box.y + 160);
    await expect(video).toHaveAttribute('src', videos[0].mediaUrl);
    await player.dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: x, clientY: box.y + 200 }] });
    await player.dispatchEvent('touchcancel');
    await player.dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: x, clientY: box.y + 80 }] });
    await expect(video).toHaveAttribute('src', videos[0].mediaUrl);
    await swipe(x, box.y + 200, x, box.y + 80);
    await expect(video).toHaveAttribute('src', videos[1].mediaUrl);
  } finally { await context.close(); }
});
