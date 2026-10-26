import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoState, mergeDemoState, restoreDemo } from '../lib/demo-state.ts';

const epoch = '1970-01-01T00:00:00.000Z';
const creator = (id, overrides = {}) => ({
  id, name: `Creator ${id}`, username: `creator_${id}`, avatar: '/media/avatar.svg',
  bio: 'Original bio', followers: 20, ...overrides,
});
const post = (id, overrides = {}) => ({
  id, creatorId: 'maya', title: `Post ${id}`, description: 'Original description',
  mediaType: 'image', mediaUrl: '/media/example.jpg', thumbnail: '/media/example.jpg',
  category: 'Travel', tags: ['travel'], aspect: 'landscape', views: 100, likes: 10,
  createdAt: '2026-10-25T10:00:00.000Z', ...overrides,
});
const comment = (id, overrides = {}) => ({
  id, postId: 'p01', creatorId: 'maya', text: `Comment ${id}`,
  createdAt: '2026-10-25T10:00:00.000Z', ...overrides,
});
const message = (id, overrides = {}) => ({
  id, senderId: 'maya', recipientId: 'demo-user', text: `Message ${id}`,
  createdAt: '2026-10-25T10:00:00.000Z', ...overrides,
});

function oldSeeds() {
  const user = creator('demo-user', { name: 'Alex Carter' });
  return {
    user,
    creators: [user, creator('maya'), creator('theo')],
    posts: Array.from({ length: 12 }, (_, index) => post(`p${String(index + 1).padStart(2, '0')}`)),
    comments: [comment('c1')],
    messages: [message('m1')],
    boards: [
      { id: 'board-travel', name: 'Somewhere, someday', description: 'Original collection', cover: '/media/travel.jpg', postIds: ['p01', 'p02'] },
      { id: 'board-design', name: 'Thoughtful spaces', description: 'Spaces I love', cover: '/media/design.jpg', postIds: ['p03'] },
    ],
  };
}

function newSeeds() {
  const original = oldSeeds();
  return {
    ...original,
    user: creator('demo-user', { name: 'Default name changed' }),
    creators: [...original.creators.map((person) => ({ ...person, bio: 'Updated seed bio', followers: 999 })), creator('new-creator')],
    posts: [
      ...original.posts.map((item) => ({ ...item, description: 'Updated seed description', likes: 999 })),
      ...Array.from({ length: 38 }, (_, index) => post(`new-${index + 1}`, { creatorId: 'new-creator', likes: 50 })),
    ],
    comments: [comment('c1', { text: 'Updated seed comment' }), comment('c2', { createdAt: '2026-10-25T11:00:00.000Z' })],
    messages: [message('m1', { text: 'Updated seed message' }), message('m2', { createdAt: '2026-10-25T11:00:00.000Z' })],
    boards: [
      { ...original.boards[0], postIds: ['p01', 'p02', 'new-1', 'new-2'] },
      original.boards[1],
      { id: 'board-new', name: 'A new collection', postIds: ['p01', 'p03', 'new-3'] },
    ],
  };
}

function upgradedBase() { return createDemoState(newSeeds()); }
function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}

test('fresh state includes current seeds without sharing mutable seed objects', () => {
  const seeds = oldSeeds();
  const state = createDemoState(deepFreeze(seeds));
  assert.equal(state.posts.length, 12);
  assert.equal(state.creators.filter((person) => person.id === 'demo-user').length, 1);
  assert.deepEqual(state.savedIds, ['p01', 'p02', 'p03']);
  state.user.name = 'An edit';
  state.posts[0].tags.push('custom');
  state.boards[0].postIds.push('upload');
  assert.equal(seeds.user.name, 'Alex Carter');
  assert.deepEqual(seeds.posts[0].tags, ['travel']);
  assert.deepEqual(seeds.boards[0].postIds, ['p01', 'p02']);
});

test('missing, malformed, or structurally invalid snapshots restore independent defaults', () => {
  const base = upgradedBase();
  for (const raw of [null, '', '{broken', 'null', '[]', '{}', JSON.stringify({ ...base, posts: [null] }), JSON.stringify({ ...base, likedIds: [null] })]) {
    const restored = restoreDemo(raw, deepFreeze(base));
    assert.deepEqual(restored, base);
    assert.notEqual(restored, base);
    assert.notEqual(restored.posts, base.posts);
  }
});

test('a legacy twelve-post snapshot gains new content while preserving uploads, edits, and activity', () => {
  const previous = createDemoState(oldSeeds());
  previous.user = { ...previous.user, name: 'My edited name', username: 'my_custom_name', bio: 'My own bio', avatar: '/my-avatar.png' };
  previous.creators = previous.creators.map((person) => person.id === 'maya' ? { ...person, followers: 21 } : person);
  previous.posts[0] = { ...previous.posts[0], likes: 11, title: 'My stored title' };
  const upload = post('upload-1', { creatorId: 'demo-user', mediaUrl: 'data:image/png;base64,AAAA', thumbnail: 'data:image/png;base64,AAAA', likes: 2 });
  previous.posts.unshift(upload);
  previous.comments.push(comment('own-comment', { creatorId: 'demo-user', text: 'I wrote this', createdAt: '2026-10-26T12:00:00.000Z' }));
  previous.messages.push(message('own-message', { senderId: 'demo-user', recipientId: 'maya', text: 'I sent this', createdAt: '2026-10-26T12:00:00.000Z' }));
  previous.likedIds = ['p01', 'upload-1'];
  previous.repostedIds = ['p02'];
  previous.followingIds = ['maya'];
  previous.readAt = { maya: '2026-10-26T13:00:00.000Z' };
  previous.notificationsReadAt = '2026-10-26T13:01:00.000Z';
  const restored = restoreDemo(JSON.stringify(previous), deepFreeze(upgradedBase()));
  assert.equal(restored.posts.length, 51);
  assert.deepEqual(restored.posts.find((item) => item.id === 'upload-1'), upload);
  assert.equal(restored.posts.find((item) => item.id === 'p01').likes, 11);
  assert.equal(restored.posts.find((item) => item.id === 'p01').title, 'My stored title');
  assert.equal(restored.posts.find((item) => item.id === 'p01').description, 'Original description');
  assert.deepEqual(restored.user, previous.user);
  assert.deepEqual(restored.creators.find((person) => person.id === previous.user.id), previous.user);
  assert.equal(restored.creators.find((person) => person.id === 'maya').followers, 21);
  assert.ok(restored.creators.some((person) => person.id === 'new-creator'));
  for (const key of ['likedIds', 'repostedIds', 'followingIds', 'readAt', 'notificationsReadAt']) assert.deepEqual(restored[key], previous[key]);
  assert.deepEqual(restored.comments.find((item) => item.id === 'own-comment'), previous.comments.at(-1));
  assert.deepEqual(restored.messages.find((item) => item.id === 'own-message'), previous.messages.at(-1));
});

test('default collections receive only genuinely new seed posts and preserve prior unsaves and edits', () => {
  const previous = createDemoState(oldSeeds());
  previous.savedIds = ['p03'];
  previous.boards[0] = { ...previous.boards[0], name: 'My travel board', description: 'My changed description', postIds: [] };
  previous.boards[1].postIds.push('p10');
  previous.boards.push({ id: 'custom-board', name: 'Weekend plans', postIds: ['p12'] });
  const restored = restoreDemo(JSON.stringify(previous), upgradedBase());
  assert.deepEqual(restored.boards.find((board) => board.id === 'board-travel'), {
    ...previous.boards[0], postIds: ['new-1', 'new-2'],
  });
  assert.deepEqual(restored.boards.find((board) => board.id === 'custom-board'), previous.boards[2]);
  assert.deepEqual(restored.boards.find((board) => board.id === 'board-design'), previous.boards[1]);
  assert.deepEqual(restored.boards.find((board) => board.id === 'board-new').postIds, ['p03', 'new-3']);
  assert.deepEqual(restored.savedIds, ['p03', 'new-1', 'new-2', 'new-3']);
  assert.ok(!restored.savedIds.includes('p01'));
  assert.ok(!restored.boards.some((board) => board.postIds.includes('p01')));
  assert.ok(!restored.boards.some((board) => board.postIds.includes('p02')));
});

test('stored custom IDs win over incoming seed IDs without being auto-saved or overwritten', () => {
  const previous = createDemoState(oldSeeds());
  const upload = post('new-1', { creatorId: 'demo-user', title: 'My upload uses this ID', likes: 7 });
  previous.posts.push(upload);
  previous.creators.push(creator('new-creator', { name: 'My custom creator', bio: 'My profile' }));
  const collision = { id: 'board-new', name: 'My custom board', description: 'Unrelated metadata', cover: '/custom.jpg', postIds: ['p12'] };
  previous.boards.push(collision);
  const restored = restoreDemo(JSON.stringify(previous), upgradedBase());
  assert.deepEqual(restored.posts.find((item) => item.id === 'new-1'), upload);
  assert.equal(restored.posts.filter((item) => item.id === 'new-1').length, 1);
  assert.equal(restored.creators.find((person) => person.id === 'new-creator').name, 'My custom creator');
  assert.deepEqual(restored.boards.find((board) => board.id === 'board-new'), collision);
  assert.ok(!restored.savedIds.includes('new-1'));
  assert.ok(!restored.savedIds.includes('new-3'));
});

test('new comments and messages merge by ID and retain chronological conversations', () => {
  const previous = createDemoState(oldSeeds());
  previous.comments[0].text = 'My stored comment edit';
  previous.messages[0].text = 'My stored message edit';
  previous.comments.push(comment('own-later-comment', { createdAt: '2026-10-27T12:00:00.000Z' }));
  previous.messages.push(message('own-later-message', { createdAt: '2026-10-27T12:00:00.000Z' }));
  const restored = restoreDemo(JSON.stringify(previous), upgradedBase());
  assert.deepEqual(restored.comments.map((item) => item.id), ['c1', 'c2', 'own-later-comment']);
  assert.deepEqual(restored.messages.map((item) => item.id), ['m1', 'm2', 'own-later-message']);
  assert.equal(restored.comments[0].text, 'My stored comment edit');
  assert.equal(restored.messages[0].text, 'My stored message edit');
});

test('persisting and restoring an upgrade is idempotent, including later unsaves of new seed posts', () => {
  const base = deepFreeze(upgradedBase());
  const upgraded = restoreDemo(JSON.stringify(createDemoState(oldSeeds())), base);
  assert.deepEqual(restoreDemo(JSON.stringify(upgraded), base), upgraded);
  upgraded.savedIds = upgraded.savedIds.filter((id) => id !== 'new-1');
  upgraded.boards = upgraded.boards.map((board) => ({ ...board, postIds: board.postIds.filter((id) => id !== 'new-1') }));
  upgraded.posts.find((item) => item.id === 'new-1').likes = 51;
  upgraded.likedIds.push('new-1');
  const restored = mergeDemoState(base, JSON.stringify(upgraded));
  assert.deepEqual(restored, upgraded);
  assert.ok(!restored.savedIds.includes('new-1'));
  assert.ok(!restored.boards.some((board) => board.postIds.includes('new-1')));
  assert.equal(restored.posts.find((item) => item.id === 'new-1').likes, 51);
});

test('legacy optional read markers get safe defaults without losing posts or profile edits', () => {
  const previous = createDemoState(oldSeeds());
  previous.user.name = 'Keep my profile';
  delete previous.readAt;
  delete previous.notificationsReadAt;
  const restored = restoreDemo(JSON.stringify(previous), upgradedBase());
  assert.equal(restored.user.name, 'Keep my profile');
  assert.equal(restored.posts.length, 50);
  assert.deepEqual(restored.readAt, {});
  assert.equal(restored.notificationsReadAt, epoch);
});

test('returned state never mutates current seed arrays or shares nested objects with them', () => {
  const base = deepFreeze(upgradedBase());
  const restored = restoreDemo(JSON.stringify(createDemoState(oldSeeds())), base);
  restored.posts.find((item) => item.id === 'new-1').tags.push('my-tag');
  restored.creators.find((person) => person.id === 'new-creator').name = 'Changed locally';
  restored.comments.find((item) => item.id === 'c2').text = 'Changed locally';
  restored.messages.find((item) => item.id === 'm2').text = 'Changed locally';
  restored.boards.find((board) => board.id === 'board-new').postIds.push('my-upload');
  assert.deepEqual(base.posts.find((item) => item.id === 'new-1').tags, ['travel']);
  assert.equal(base.creators.find((person) => person.id === 'new-creator').name, 'Creator new-creator');
  assert.equal(base.comments.find((item) => item.id === 'c2').text, 'Comment c2');
  assert.equal(base.messages.find((item) => item.id === 'm2').text, 'Message m2');
  assert.deepEqual(base.boards.find((board) => board.id === 'board-new').postIds, ['p01', 'p03', 'new-3']);
});
