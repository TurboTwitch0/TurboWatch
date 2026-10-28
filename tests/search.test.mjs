import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesCreator, matchesPost } from '../lib/search.ts';

const creator = { id: 'maya', name: 'Maya Rivera', username: 'maya', bio: 'Travel and nature', avatar: '' };
const post = { title: 'A quiet coast', description: 'A morning walk', category: 'Travel', tags: ['travel', 'nature'] };

test('comma-separated hashtags and creator handles search all requested terms', () => {
  assert.equal(matchesPost(post, creator, '#travel, #nature, @maya'), true);
  assert.equal(matchesPost(post, creator, '#travel,#nature'), true);
  assert.equal(matchesCreator(creator, 'Rivera, Maya'), true);
  assert.equal(matchesPost(post, creator, '#travel, #food'), false);
  assert.equal(matchesCreator(creator, 'Maya, missing'), false);
});

test('search keeps accent-insensitive matching, whitespace, and empty-query behavior', () => {
  assert.equal(matchesCreator({ ...creator, name: 'José Rivera' }, 'jose, rivera'), true);
  assert.equal(matchesPost(post, creator, '  #travel  @maya  '), true);
  assert.equal(matchesPost(post, undefined, ''), true);
  assert.equal(matchesPost(post, undefined, ', ,'), true);
});
