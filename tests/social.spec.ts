import { expect, test, type Page } from '@playwright/test';
import { seedCreators, seedPosts } from '../lib/seed';

const origin = new URL(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000').origin;

async function home(page: Page) {
  await page.goto('/?demo=1');
  await expect(page.getByRole('heading', { name: 'Stay curious.' })).toBeVisible();
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
}

test('discovery feed loads local photography, category filters, and useful search results', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await home(page);
  expect(seedPosts.length).toBeGreaterThanOrEqual(35);
  await page.locator('.post-media img').evaluateAll(images => images.forEach(image => { (image as HTMLImageElement).loading = 'eager'; }));
  await expect.poll(() => page.locator('.post-media img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect(page.locator('.post-media img[src*="media-unavailable"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Food', exact: true }).click();
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.filter(post => post.category === 'Food').length);
  await page.getByRole('button', { name: 'For you', exact: true }).last().click();
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
  await page.getByRole('textbox', { name: 'Search TurboWatch' }).fill('golden');
  const goldenFinds = seedPosts.filter(post => `${post.title} ${post.description} ${post.tags.join(' ')} ${seedCreators.find(creator => creator.id === post.creatorId)?.name || ''}`.toLowerCase().includes('golden'));
  expect(goldenFinds.length).toBeGreaterThan(0);
  await expect(page.locator('.post-card')).toHaveCount(goldenFinds.length);
  for (const post of goldenFinds) await expect(page.getByRole('button', { name: post.title, exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search TurboWatch' }).fill('no-such-find-91871');
  await expect(page.getByRole('heading', { name: 'Nothing here just yet.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
  await expect(page.locator('body')).not.toContainText('Application error');
  expect(errors).toEqual([]);
});

test('likes and saves toggle independently and survive reload', async ({ page }) => {
  await home(page);
  const card = page.locator('.post-card').filter({ has: page.getByRole('button', { name: 'A little old-school soul.', exact: true }) });
  await card.getByRole('button', { name: 'Like post', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Unlike post', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await card.getByRole('button', { name: 'Save post', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Unsave post', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(card.getByRole('button', { name: 'Unlike post', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card.getByRole('button', { name: 'Unsave post', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await card.getByRole('button', { name: 'Unlike post', exact: true }).click();
  await card.getByRole('button', { name: 'Unsave post', exact: true }).click();
  await page.reload();
  await expect(card.getByRole('button', { name: 'Like post', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(card.getByRole('button', { name: 'Save post', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('post comments, reposts, and share links persist and open the selected post', async ({ page, context }) => {
  await home(page);
  await page.getByRole('button', { name: 'Open Take the scenic route.', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Take the scenic route.', exact: true });
  await detail.getByRole('textbox', { name: 'Write a comment' }).fill('A perspective worth saving — browser test.');
  await detail.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(detail.getByText('A perspective worth saving — browser test.', { exact: true })).toBeVisible();
  await detail.getByRole('button', { name: 'Repost post', exact: true }).click();
  await expect(detail.getByRole('button', { name: 'Repost post', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await detail.getByRole('button', { name: 'Share post', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Good things are better shared.', exact: true });
  await expect(share.getByRole('textbox', { name: 'Post link' })).toHaveValue(`${origin}/?demo=1&post=coast-escape`);
  await share.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(share.getByRole('button', { name: 'Link copied', exact: true })).toBeVisible();
  await share.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.reload();
  await expect(detail.getByText('A perspective worth saving — browser test.', { exact: true })).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Repost post', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const clean = await context.browser()!.newContext();
  const sharedPage = await clean.newPage();
  await sharedPage.goto(`${origin}/?demo=1&post=coast-escape`);
  await expect(sharedPage.getByRole('dialog', { name: 'Take the scenic route.', exact: true })).toBeVisible();
  await expect(sharedPage.getByText('A perspective worth saving — browser test.', { exact: true })).toHaveCount(0);
  await clean.close();
});

test('new collections accept posts and retain their membership', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: 'Collections', exact: true }).click();
  await page.getByRole('main').getByRole('button', { name: 'New collection', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'A home for your next obsession.', exact: true });
  await create.getByRole('textbox', { name: 'Collection name', exact: true }).fill('Weekend inspiration');
  await create.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(create).toBeHidden();
  await page.getByRole('button', { name: 'For you', exact: true }).first().click();
  await page.getByRole('button', { name: 'Open A little old-school soul.', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'A little old-school soul.', exact: true });
  await detail.getByRole('button', { name: 'Choose collection', exact: true }).click();
  await detail.getByRole('button', { name: 'Weekend inspiration', exact: true }).click();
  await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Collections', exact: true }).click();
  await page.locator('.board-card').filter({ hasText: 'Weekend inspiration' }).click();
  await expect(page.locator('.post-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'A little old-school soul.', exact: true })).toBeVisible();
  await page.reload();
  await page.locator('.board-card').filter({ hasText: 'Weekend inspiration' }).click();
  await expect(page.locator('.post-card')).toHaveCount(1);
});

test('profile edits are validated and persist', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'A little more you.', exact: true });
  await edit.getByRole('textbox', { name: 'Name', exact: true }).fill('Alex Explorer');
  await edit.getByRole('textbox', { name: 'Username', exact: true }).fill('alex_explorer');
  await edit.getByRole('textbox', { name: /^Bio/ }).fill('Finding the next good story.');
  await edit.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Alex Explorer', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Alex Explorer', exact: true })).toBeVisible();
  await expect(page.getByText('Finding the next good story.', { exact: true })).toBeVisible();
});

test('messages send once and survive reload without a fabricated reply', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: /^Messages/ }).first().click();
  const initialCount = await page.locator('.message-bubble').count();
  await page.getByRole('textbox', { name: 'Your message', exact: true }).fill('Let’s plan a creative weekend — browser test.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.locator('.message-bubble')).toHaveCount(initialCount + 1);
  await expect(page.locator('.message-bubble.outgoing').filter({ hasText: 'Let’s plan a creative weekend — browser test.' })).toBeVisible();
  const storedMessages = () => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('turbowatch:demo:v1')!);
    return state.messages.filter((message: { text: string }) => message.text === 'Let’s plan a creative weekend — browser test.');
  });
  expect(await storedMessages()).toHaveLength(1);
  await page.reload();
  await expect(page.locator('.message-bubble')).toHaveCount(initialCount + 1);
  await expect(page.locator('.message-bubble.outgoing').filter({ hasText: 'Let’s plan a creative weekend — browser test.' })).toBeVisible();
  expect(await storedMessages()).toHaveLength(1);
});

test('publishing a photo creates a persistent post and profile entry', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'Make something worth sharing.', exact: true });
  await create.getByRole('textbox', { name: /Or use a image link/ }).fill(`${origin}/media/studio.jpg`);
  await create.getByRole('textbox', { name: 'Title', exact: true }).fill('My creative corner');
  await create.getByRole('textbox', { name: 'Caption', exact: true }).fill('A little space to make something. #design');
  await create.getByRole('combobox', { name: 'Category', exact: true }).selectOption('Design');
  await create.getByRole('button', { name: 'Publish post', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'My creative corner', exact: true });
  await expect(detail).toBeVisible();
  await expect(detail.locator('.detail-media img')).toHaveAttribute('src', `${origin}/media/studio.jpg`);
  await page.reload();
  await expect(detail).toBeVisible();
  await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'My creative corner', exact: true })).toBeVisible();
});

test('all twelve distinct demo videos decode and play in the watch experience', async ({ page }) => {
  test.setTimeout(120_000);
  const videos = seedPosts.filter(post => post.mediaType === 'video');
  expect(videos).toHaveLength(12);
  expect(new Set(videos.map(post => post.mediaUrl)).size).toBe(videos.length);
  for (const post of videos) {
    await test.step(`Play ${post.title}`, async () => {
      await page.goto(`/?demo=1&post=${encodeURIComponent(post.id)}`);
      const video = page.getByRole('dialog', { name: post.title, exact: true }).locator('video');
      await expect(video).toBeVisible();
      await expect(video).toHaveAttribute('src', post.mediaUrl);
      await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
      await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).duration)).toBeGreaterThan(0.5);
      await video.evaluate(async element => { const media = element as HTMLVideoElement; media.muted = true; await media.play(); });
      await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0.05);
      expect(await video.evaluate(element => (element as HTMLVideoElement).error)).toBeNull();
      expect(await video.evaluate(element => (element as HTMLVideoElement).videoWidth)).toBeGreaterThan(0);
    });
  }
});

test('desktop and mobile render without overflow and mobile navigation works', async ({ page }) => {
  await home(page);
  await page.screenshot({ path: '/tmp/turbowatch-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/turbowatch-mobile.png', fullPage: true });
  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
  await mobileNav.getByRole('button', { name: 'Collections', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your kind of collection.', exact: true })).toBeVisible();
  await mobileNav.getByRole('button', { name: 'For you', exact: true }).click();
  await page.getByRole('button', { name: 'Open Take the scenic route.', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Take the scenic route.', exact: true });
  await expect(detail).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await mobileNav.getByRole('button', { name: 'Messages', exact: true }).click();
  await page.locator('.conversation-item').first().click();
  await expect(page.getByRole('textbox', { name: 'Your message', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to conversations', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Find a person to message', exact: true })).toBeVisible();
});
