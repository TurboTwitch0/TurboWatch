import { expect, test, type Page } from '@playwright/test';
import type { SocialState } from '../lib/model';
import { demoUser, seedBoards, seedComments, seedCreators, seedMessages, seedPosts } from '../lib/seed';

const storageKey = 'turbowatch:demo:v1';
const origin = new URL(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000').origin;
const legacyPostIds = ['coast-escape', 'mountain-morning', 'slow-sunday', 'sweet-simple', 'golden-hour', 'under-the-stars', 'vintage-soul', 'picnic-club', 'closer-to-clouds', 'creative-director', 'room-to-breathe', 'last-light'];
const legacyCreatorIds = ['demo-user', 'maya', 'theo', 'studio', 'noa', 'jules', 'elena', 'milo'];
const uploadData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jMZkAAAAASUVORK5CYII=';

function legacyState(): SocialState {
  const user = { ...demoUser, name: 'Alex Kept My Edits', username: 'alex_kept', bio: 'My old profile survived the new demo.' };
  const memberships: Record<string, string[]> = {
    'board-someday': ['mountain-morning', 'under-the-stars'],
    'board-little-things': ['sweet-simple', 'picnic-club', 'creative-director'],
    'board-room': ['slow-sunday', 'room-to-breathe'],
  };
  const boards = Object.entries(memberships).map(([id, postIds]) => ({ ...seedBoards.find(board => board.id === id)!, postIds }));
  const posts = seedPosts.filter(post => legacyPostIds.includes(post.id)).map(post => post.id === 'coast-escape' ? { ...post, title: 'My original edited coast post', likes: post.likes + 1 } : post);
  return {
    user,
    creators: seedCreators.filter(creator => legacyCreatorIds.includes(creator.id)).map(creator => creator.id === user.id ? user : creator),
    posts: [...posts, {
      id: 'legacy-upload', creatorId: user.id, title: 'My upload from the first demo',
      description: 'This browser-local upload must survive an expanded demo.',
      mediaType: 'image', mediaUrl: uploadData, thumbnail: uploadData,
      category: 'Design', tags: ['mine'], aspect: 'square', views: 0, likes: 0,
      createdAt: '2026-10-25T18:00:00.000Z',
    }],
    comments: [...seedComments.slice(0, 8), {
      id: 'legacy-comment', postId: 'coast-escape', creatorId: user.id,
      text: 'My original comment is still here.', createdAt: '2026-10-25T18:01:00.000Z',
    }],
    messages: [...seedMessages.slice(0, 5), {
      id: 'legacy-message', senderId: user.id, recipientId: 'maya',
      text: 'My original message is still here.', createdAt: '2026-10-25T18:02:00.000Z',
    }],
    boards: [...boards, { id: 'legacy-personal-board', name: 'My original collection', description: 'A collection I made before the new demo.', postIds: ['legacy-upload'] }],
    likedIds: ['coast-escape'],
    savedIds: [...new Set([...boards.flatMap(board => board.postIds), 'legacy-upload'])],
    repostedIds: ['mountain-morning'],
    followingIds: ['maya'],
    readAt: { maya: '2026-10-25T17:00:00.000Z' },
    notificationsReadAt: '2026-10-25T17:30:00.000Z',
  };
}

async function expectDemoParameter(page: Page, view?: string) {
  await expect.poll(() => new URL(page.url()).searchParams.get('demo')).toBe('1');
  if (view) await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBe(view);
  await expect(page.locator('.demo-indicator')).toHaveText('Demo · saved in this browser');
}

test('the expanded demo has forty varied posts and a populated social community', async ({ page }) => {
  expect(seedPosts).toHaveLength(40);
  expect(seedCreators).toHaveLength(14);
  expect(seedBoards).toHaveLength(7);
  expect(seedComments.length).toBeGreaterThanOrEqual(45);
  expect(new Set(seedPosts.map(post => post.id)).size).toBe(seedPosts.length);
  expect(new Set(seedPosts.filter(post => post.mediaType === 'video').map(post => post.mediaUrl)).size).toBe(12);
  const peopleInMessages = new Set(seedMessages.map(message => message.senderId === demoUser.id ? message.recipientId : message.senderId));
  expect(peopleInMessages.size).toBe(8);

  await page.goto('/?demo=1');
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
  await expectDemoParameter(page);
  await page.getByRole('button', { name: 'Collections', exact: true }).click();
  await expect(page.locator('.board-card')).toHaveCount(seedBoards.length);
  await page.getByRole('button', { name: /^Messages/ }).first().click();
  await expect(page.locator('.conversation-item')).toHaveCount(8);
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.filter(post => post.creatorId === demoUser.id).length);
  expect(seedPosts.filter(post => post.creatorId === demoUser.id).length).toBeGreaterThan(0);
});

test('upgrading an old twelve-post demo preserves edits, unsaves, likes, uploads, and conversations', async ({ page }) => {
  const old = legacyState();
  expect(old.posts).toHaveLength(13);
  expect(old.creators).toHaveLength(8);
  await page.goto('/?demo=1');
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: storageKey, value: old });
  await page.reload();
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length + 1);
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: old.user!.name, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'My upload from the first demo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'For you', exact: true }).first().click();
  await page.getByRole('button', { name: 'Open My original edited coast post', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'My original edited coast post', exact: true });
  await expect(detail.getByRole('button', { name: 'Unlike post', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(detail.getByRole('button', { name: 'Save post', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(detail.getByText('My original comment is still here.', { exact: true })).toBeVisible();
  await detail.getByRole('textbox', { name: 'Write a comment', exact: true }).fill('The expanded demo kept my discoveries.');
  await detail.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(detail.getByText('The expanded demo kept my discoveries.', { exact: true })).toBeVisible();
  await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();

  const upgraded = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!) as SocialState, storageKey);
  expect(upgraded.posts).toHaveLength(seedPosts.length + 1);
  expect(upgraded.creators).toHaveLength(seedCreators.length);
  expect(upgraded.user).toEqual(old.user);
  expect(upgraded.creators.find(creator => creator.id === old.user!.id)).toEqual(old.user);
  expect(upgraded.posts.find(post => post.id === 'coast-escape')).toEqual(old.posts.find(post => post.id === 'coast-escape'));
  expect(upgraded.posts.find(post => post.id === 'legacy-upload')?.mediaUrl).toBe(uploadData);
  expect(upgraded.likedIds).toEqual(old.likedIds);
  expect(upgraded.savedIds).not.toContain('coast-escape');
  expect(upgraded.followingIds).toEqual(old.followingIds);
  expect(upgraded.repostedIds).toEqual(old.repostedIds);
  expect(upgraded.readAt).toEqual(old.readAt);
  expect(upgraded.notificationsReadAt).toBe(old.notificationsReadAt);
  expect(upgraded.messages.find(message => message.id === 'legacy-message')).toEqual(old.messages.find(message => message.id === 'legacy-message'));
  expect(upgraded.boards.find(board => board.id === 'legacy-personal-board')).toEqual(old.boards.find(board => board.id === 'legacy-personal-board'));
  expect(upgraded.boards.find(board => board.id === 'board-someday')?.postIds).not.toContain('coast-escape');
  for (const post of seedPosts) expect(upgraded.posts.some(item => item.id === post.id)).toBe(true);
  for (const creator of seedCreators) expect(upgraded.creators.some(item => item.id === creator.id)).toBe(true);
  for (const board of seedBoards) expect(upgraded.boards.some(item => item.id === board.id)).toBe(true);
  for (const comment of seedComments) expect(upgraded.comments.some(item => item.id === comment.id)).toBe(true);
  for (const message of seedMessages) expect(upgraded.messages.some(item => item.id === message.id)).toBe(true);

  await page.reload();
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length + 1);
  await page.getByRole('button', { name: 'Collections', exact: true }).click();
  await expect(page.locator('.board-card')).toHaveCount(seedBoards.length + 1);
  await page.locator('.board-card').filter({ hasText: 'My original collection' }).click();
  await expect(page.locator('.post-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'My upload from the first demo', exact: true })).toBeVisible();
});

test('explicit demo mode remains in navigation, creator profiles, and shared post links', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
  for (const [label, view] of [['Explore', 'explore'], ['Shorts', 'shorts'], ['Collections', 'boards'], ['Messages', 'messages']] as const) {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: new RegExp(`^${label}`) }).click();
    await expectDemoParameter(page, view);
  }
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await expectDemoParameter(page, 'profile');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  const creator = seedCreators.find(person => person.id !== demoUser.id)!;
  await page.locator('.creator-chip').filter({ hasText: creator.name }).getByRole('button', { name: `View ${creator.name} profile`, exact: true }).click();
  await expectDemoParameter(page, 'profile');
  expect(new URL(page.url()).searchParams.get('creator')).toBe(creator.id);
  await page.getByRole('button', { name: 'TurboWatch home', exact: true }).click();
  await expectDemoParameter(page);
  await page.getByRole('button', { name: 'Open Take the scenic route.', exact: true }).click();
  await expectDemoParameter(page);
  const detail = page.getByRole('dialog', { name: 'Take the scenic route.', exact: true });
  await detail.getByRole('button', { name: 'Share post', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Good things are better shared.', exact: true });
  await expect(share.getByRole('textbox', { name: 'Post link' })).toHaveValue(`${origin}/?demo=1&post=coast-escape`);
  const sharedUrl = await share.getByRole('textbox', { name: 'Post link' }).inputValue();
  await page.goto(sharedUrl);
  await expect(page.getByRole('dialog', { name: 'Take the scenic route.', exact: true })).toBeVisible();
  await expectDemoParameter(page);
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Take the scenic route.', exact: true })).toBeVisible();
  await expectDemoParameter(page);
});

test('shorts respond to keyboard and vertical swipe navigation while search keeps keyboard focus', async ({ page }) => {
  const videos = seedPosts.filter(post => post.mediaType === 'video');
  await page.goto('/?demo=1&view=shorts');
  const video = page.locator('.short-player video');
  await expect(video).toHaveAttribute('src', videos[0].mediaUrl);
  await page.keyboard.press('ArrowDown');
  await expect(video).toHaveAttribute('src', videos[1].mediaUrl);
  await page.keyboard.press('ArrowLeft');
  await expect(video).toHaveAttribute('src', videos[0].mediaUrl);
  await page.keyboard.press('ArrowUp');
  await expect(video).toHaveAttribute('src', videos.at(-1)!.mediaUrl);
  await page.keyboard.press('ArrowRight');
  await expect(video).toHaveAttribute('src', videos[0].mediaUrl);
  await page.getByRole('textbox', { name: 'Search TurboWatch', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(video).toHaveAttribute('src', videos[0].mediaUrl);
  await page.getByRole('heading', { name: 'A moment of escape.', exact: true }).click();

  async function swipe(delta: number) {
    await page.locator('.short-player').evaluate((target, movement) => {
      const box = target.getBoundingClientRect();
      const start = new Touch({ identifier: 1, target, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 });
      const end = new Touch({ identifier: 1, target, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 + movement });
      target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start], changedTouches: [start] }));
      target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [end] }));
    }, delta);
  }
  await swipe(-120);
  await expect(video).toHaveAttribute('src', videos[1].mediaUrl);
  await swipe(120);
  await expect(video).toHaveAttribute('src', videos[0].mediaUrl);
  await expectDemoParameter(page, 'shorts');
});

test('social updates preserve feed nodes, scroll, open drafts, and video progress without refreshing', async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto('/?demo=1');
  await expect(page.locator('.post-card')).toHaveCount(seedPosts.length);
  await page.evaluate(() => { document.documentElement.dataset.testDocument = 'same-document'; });
  const target = seedPosts.find(post => post.id === 'vintage-soul')!;
  const card = page.locator('.post-card').filter({ has: page.getByRole('button', { name: target.title, exact: true }) });
  await card.scrollIntoViewIfNeeded();
  await card.evaluate(node => { (node as HTMLElement).dataset.testStableCard = 'same-card'; });
  await card.locator('.post-media img, .post-media video').evaluate(node => { (node as HTMLElement).dataset.testStableMedia = 'same-media'; });
  const scrollBefore = await page.evaluate(() => window.scrollY);

  async function expectFeedStable() {
    await expect(card).toHaveAttribute('data-test-stable-card', 'same-card');
    await expect(card.locator('.post-media img, .post-media video')).toHaveAttribute('data-test-stable-media', 'same-media');
    expect(await page.evaluate(() => document.documentElement.dataset.testDocument)).toBe('same-document');
    expect(Math.abs(await page.evaluate(() => window.scrollY) - scrollBefore)).toBeLessThanOrEqual(2);
  }
  await card.getByRole('button', { name: 'Like post', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Unlike post', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectFeedStable();
  await card.getByRole('button', { name: 'Save post', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Unsave post', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectFeedStable();

  const secondTab = await context.newPage();
  await secondTab.goto('/?demo=1');
  await expect(secondTab.locator('.post-card')).toHaveCount(seedPosts.length);
  await secondTab.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!) as SocialState;
    state.comments.push({ id: 'incoming-feed-comment', postId: 'vintage-soul', creatorId: 'maya', text: 'An incoming update without refreshing.', createdAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(state));
  }, storageKey);
  const initialCommentCount = seedComments.filter(comment => comment.postId === target.id).length;
  await expect(card.getByRole('button', { name: `Comment on ${target.title}`, exact: true })).toHaveText(String(initialCommentCount + 1));
  await expectFeedStable();

  await page.getByRole('button', { name: 'Open Take the scenic route.', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Take the scenic route.', exact: true });
  const video = detail.locator('video');
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  await video.evaluate(async node => {
    const media = node as HTMLVideoElement;
    media.dataset.testStableVideo = 'same-playing-video';
    media.muted = true; media.currentTime = 3; await media.play();
  });
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(3);
  const progressBefore = await video.evaluate(node => (node as HTMLVideoElement).currentTime);
  const draft = 'Keep this draft while the community changes.';
  await detail.getByRole('textbox', { name: 'Write a comment', exact: true }).fill(draft);

  async function expectDetailStable(keepDraft = true) {
    await expect(video).toHaveAttribute('data-test-stable-video', 'same-playing-video');
    expect(await video.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThanOrEqual(progressBefore - 0.1);
    expect(await page.evaluate(() => document.documentElement.dataset.testDocument)).toBe('same-document');
    if (keepDraft) await expect(detail.getByRole('textbox', { name: 'Write a comment', exact: true })).toHaveValue(draft);
  }
  await detail.getByRole('button', { name: 'Like post', exact: true }).click();
  await expectDetailStable();
  await detail.getByRole('button', { name: 'Unsave post', exact: true }).click();
  await expectDetailStable();
  await detail.getByRole('button', { name: 'Repost post', exact: true }).click();
  await expectDetailStable();
  await secondTab.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!) as SocialState;
    state.comments.push({ id: 'incoming-detail-comment', postId: 'coast-escape', creatorId: 'theo', text: 'A second perspective just arrived.', createdAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(state));
  }, storageKey);
  await expect(detail.getByText('A second perspective just arrived.', { exact: true })).toBeVisible();
  await expectDetailStable();
  await detail.getByRole('button', { name: 'Share post', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Good things are better shared.', exact: true });
  await expect(share).toBeVisible();
  await expect(page.locator('.post-dialog video')).toHaveAttribute('data-test-stable-video', 'same-playing-video');
  expect(await page.locator('.post-dialog video').evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThanOrEqual(progressBefore - 0.1);
  for (let tab = 0; tab < 6; tab += 1) {
    await page.keyboard.press('Tab');
    expect(await share.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(share).toBeHidden();
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Share post', exact: true })).toBeFocused();
  await expectDetailStable();
  await detail.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(detail.getByText(draft, { exact: true })).toBeVisible();
  await expect(detail.getByRole('textbox', { name: 'Write a comment', exact: true })).toHaveValue('');
  await expectDetailStable(false);
  await secondTab.close();
});
