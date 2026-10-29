import { expect, test } from '@playwright/test';
import { seedCreators, seedPosts } from '../lib/seed';
import { matchesPost } from '../lib/search';

test.skip(Boolean(process.env.LIVE_TEST_BASE_URL), 'These checks use the explicitly selected local sample community.');

test('search result types preserve useful history and open the matching creator profile', async ({ page }) => {
  const person = seedCreators.find(creator => creator.id === 'maya')!;
  await page.goto(`/?demo=1&q=${encodeURIComponent(`@${person.username}`)}`);
  const types = page.getByRole('group', { name: 'Search result type', exact: true });
  const posts = seedPosts.filter(post => matchesPost(post, seedCreators.find(creator => creator.id === post.creatorId), `@${person.username}`));
  await expect(page.locator('.post-card')).toHaveCount(posts.length);
  await types.getByRole('button', { name: /^People\b/ }).click();
  await expect(page.locator('.post-card')).toHaveCount(0);
  await expect(page.locator('.creator-chip')).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('results')).toBe('people');
  await types.getByRole('button', { name: /^Posts\b/ }).click();
  await expect(page.locator('.post-card')).toHaveCount(posts.length);
  await expect(page.locator('.creator-chip')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('results')).toBe('posts');
  await page.goBack();
  await expect(types.getByRole('button', { name: /^People\b/ })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(types.getByRole('button', { name: /^People\b/ })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.creator-chip').getByRole('button', { name: `View ${person.name} profile`, exact: true }).click();
  await expect(page.getByRole('heading', { name: person.name, exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('creator')).toBe(person.id);
});

test('clearing restrictive discovery filters preserves the search and local-preview identity', async ({ page }) => {
  const query = 'golden';
  await page.goto('/?demo=1&q=golden&category=Music&media=video&sort=liked');
  await expect(page.locator('.post-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  const expected = seedPosts.filter(post => matchesPost(post, seedCreators.find(creator => creator.id === post.creatorId), query));
  expect(expected.length).toBeGreaterThan(0);
  await expect(page.locator('.post-card')).toHaveCount(expected.length);
  await expect(page.getByRole('textbox', { name: 'Search TurboWatch', exact: true })).toHaveValue(query);
  await expect(page.getByRole('textbox', { name: 'Search TurboWatch', exact: true })).toBeFocused();
  const params = new URL(page.url()).searchParams;
  expect(params.get('q')).toBe(query);
  expect(params.get('demo')).toBe('1');
  for (const key of ['category', 'media', 'sort']) expect(params.has(key)).toBe(false);
  await expect(page.getByRole('combobox', { name: 'Sort posts', exact: true })).toHaveValue('recommended');
  await expect(page.getByRole('group', { name: 'Post format', exact: true }).getByRole('button', { name: 'All posts', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('an editorial topic is a real category action, not a decorative cover', async ({ page }) => {
  await page.goto('/?demo=1&view=explore');
  const topics = page.locator('.discovery-topics');
  await expect(topics).toBeVisible();
  await expect(topics.locator('video')).toHaveCount(0);
  const topic = topics.locator('button[data-category]').first();
  const category = await topic.getAttribute('data-category');
  expect(category).toBeTruthy();
  await topic.focus();
  await page.keyboard.press('Enter');
  expect(new URL(page.url()).searchParams.get('category')).toBe(category);
  const expected = seedPosts.filter(post => post.category === category);
  await expect(page.locator('.post-card')).toHaveCount(expected.length);
  await expect(page.locator('.post-card .post-title')).toHaveText(expected.map(post => post.title));
});

test('related stories only switch playback after deliberate selection and never carry a draft to another post', async ({ page }) => {
  const original = seedPosts.find(post => post.id === 'coast-escape')!;
  await page.goto(`/?demo=1&post=${original.id}`);
  let detail = page.getByRole('dialog', { name: original.title, exact: true });
  await expect(detail).toBeVisible();
  await page.evaluate(() => { document.documentElement.dataset.discoveryDocument = 'same-document'; });
  const video = detail.locator('.detail-media video');
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
  await video.evaluate(element => {
    const media = element as HTMLVideoElement;
    media.pause(); media.currentTime = 1.1; media.dataset.discoveryPlayback = 'preserved';
  });
  const comment = detail.getByRole('textbox', { name: 'Write a comment', exact: true });
  await comment.fill('A thought that belongs only to this story.');
  const related = detail.locator('.related-stories');
  await expect(related).toBeVisible();
  await expect(related.locator('video')).toHaveCount(0);
  const destination = related.locator('button[data-post-id]').first();
  const nextId = await destination.getAttribute('data-post-id');
  expect(nextId).not.toBe(original.id);
  const nextPost = seedPosts.find(post => post.id === nextId)!;
  expect(nextPost).toBeTruthy();
  await detail.getByRole('button', { name: 'Like post', exact: true }).click();
  await expect(comment).toHaveValue('A thought that belongs only to this story.');
  await expect(video).toHaveAttribute('data-discovery-playback', 'preserved');
  expect(await video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeCloseTo(1.1, 1);
  await destination.focus();
  await page.keyboard.press('Enter');
  detail = page.getByRole('dialog', { name: nextPost.title, exact: true });
  await expect(detail).toBeVisible();
  expect(new URL(page.url()).searchParams.get('post')).toBe(nextPost.id);
  const media = detail.locator(`.detail-media ${nextPost.mediaType === 'video' ? 'video' : 'img'}`);
  await expect(media).toHaveAttribute('src', nextPost.mediaUrl);
  await expect(detail.getByRole('textbox', { name: 'Write a comment', exact: true })).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.dataset.discoveryDocument)).toBe('same-document');
});

test('new discovery controls remain readable, keyboard reachable, and still with reduced motion on narrow screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?demo=1&view=explore');
  await expect(page.locator('.discovery-topics')).toBeVisible();
  const motionDuration = await page.locator('.discovery-topics').evaluate(section => {
    const seconds = (value: string) => value.split(',').map(item => item.trim().endsWith('ms') ? parseFloat(item) / 1000 : parseFloat(item));
    return Math.max(0, ...[section, ...Array.from(section.querySelectorAll('*'))].flatMap(element => [null, '::before', '::after'].flatMap(pseudo => {
      const style = getComputedStyle(element, pseudo);
      return [...seconds(style.animationDuration), ...seconds(style.transitionDuration)];
    })).filter(Number.isFinite));
  });
  expect(motionDuration).toBeLessThanOrEqual(0.01);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1050 });
    await page.goto('/?demo=1&view=explore');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const topic = page.locator('.discovery-topics button[data-category]').first();
    await expect(topic).toBeVisible();
    await topic.focus();
    await expect(topic).toBeFocused();
    expect(await topic.evaluate(element => {
      const style = getComputedStyle(element);
      return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
    })).toBe(true);
    const box = await topic.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    await page.getByRole('textbox', { name: 'Search TurboWatch', exact: true }).fill('maya');
    const people = page.getByRole('group', { name: 'Search result type', exact: true }).getByRole('button', { name: /^People\b/ });
    await people.focus();
    await page.keyboard.press('Enter');
    await expect(people).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await people.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?demo=1&post=coast-escape');
  const related = page.getByRole('dialog').locator('.related-stories');
  const suggestion = related.locator('button[data-post-id]').first();
  await suggestion.focus();
  await expect(suggestion).toBeFocused();
  expect((await suggestion.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const panel = (await page.getByRole('dialog').boundingBox())!;
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(390);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
