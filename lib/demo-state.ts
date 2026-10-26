import type { Board, Comment, Creator, Message, Post, SocialState } from './model';

const EPOCH = '1970-01-01T00:00:00.000Z';

export interface DemoSeedBundle {
  user: Creator;
  creators: Creator[];
  posts: Post[];
  comments: Comment[];
  messages: Message[];
  boards: Board[];
}

/** Keep seed objects independent from mutable browser state. */
function cloneState(state: SocialState): SocialState {
  return {
    user: state.user ? { ...state.user } : null,
    creators: state.creators.map((creator) => ({ ...creator })),
    posts: state.posts.map((post) => ({ ...post, tags: [...post.tags] })),
    comments: state.comments.map((comment) => ({ ...comment })),
    messages: state.messages.map((message) => ({ ...message })),
    boards: state.boards.map((board) => ({ ...board, postIds: [...board.postIds] })),
    likedIds: [...state.likedIds],
    savedIds: [...state.savedIds],
    repostedIds: [...state.repostedIds],
    followingIds: [...state.followingIds],
    readAt: { ...state.readAt },
    notificationsReadAt: state.notificationsReadAt,
  };
}

/** Build fresh demo data; the caller supplies the current bundled seeds. */
export function createDemoState(seeds: DemoSeedBundle): SocialState {
  return cloneState({
    user: seeds.user,
    creators: [seeds.user, ...seeds.creators.filter((creator) => creator.id !== seeds.user.id)],
    posts: seeds.posts,
    comments: seeds.comments,
    messages: seeds.messages,
    boards: seeds.boards,
    likedIds: [],
    savedIds: [...new Set(seeds.boards.flatMap((board) => board.postIds))],
    repostedIds: [],
    followingIds: [],
    readAt: {},
    notificationsReadAt: EPOCH,
  });
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function hasStrings(value: unknown, keys: string[]): value is Record<string, unknown> {
  return record(value) && keys.every((key) => typeof value[key] === 'string');
}

function validStoredState(value: unknown): value is SocialState {
  if (!record(value) || !hasStrings(value.user, ['id', 'name', 'username', 'avatar', 'bio'])) return false;
  if (!Array.isArray(value.creators) || !value.creators.every((creator) => hasStrings(creator, ['id', 'name', 'username', 'avatar', 'bio']))) return false;
  if (!Array.isArray(value.posts) || !value.posts.every((post) =>
    hasStrings(post, ['id', 'creatorId', 'title', 'description', 'mediaUrl', 'thumbnail', 'category', 'createdAt'])
    && ['image', 'video'].includes(String(post.mediaType))
    && ['portrait', 'landscape', 'square'].includes(String(post.aspect))
    && stringArray(post.tags)
    && typeof post.likes === 'number' && Number.isFinite(post.likes)
    && typeof post.views === 'number' && Number.isFinite(post.views))) return false;
  if (!Array.isArray(value.comments) || !value.comments.every((comment) => hasStrings(comment, ['id', 'postId', 'creatorId', 'text', 'createdAt']))) return false;
  if (!Array.isArray(value.messages) || !value.messages.every((message) => hasStrings(message, ['id', 'senderId', 'recipientId', 'text', 'createdAt']))) return false;
  if (!Array.isArray(value.boards) || !value.boards.every((board) => hasStrings(board, ['id', 'name']) && stringArray(board.postIds))) return false;
  return ['likedIds', 'savedIds', 'repostedIds', 'followingIds'].every((key) => stringArray(value[key]));
}

function mergeById<T extends { id: string }>(existing: T[], seeds: T[]): T[] {
  const seen = new Set<string>();
  return [...existing, ...seeds].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function sameSeedBoard(existing: Board, seeded: Board): boolean {
  // Legacy snapshots have no seed manifest. A matching stable marker identifies
  // their default collections without changing an unrelated custom ID collision.
  return existing.name === seeded.name
    || Boolean(seeded.description && existing.description === seeded.description)
    || Boolean(seeded.cover && existing.cover === seeded.cover);
}

/**
 * Upgrade a browser snapshot additively. Existing records win by ID, including
 * edited profiles, upload IDs, and accumulated like/follower counts. Default
 * collections may receive genuinely new seed posts, never previously unsaved
 * old posts. Reapplying an upgrade is therefore idempotent.
 */
export function restoreDemo(raw: string | null, base: SocialState): SocialState {
  if (!raw) return cloneState(base);
  let previous: SocialState;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!validStoredState(parsed)) return cloneState(base);
    previous = parsed;
  } catch {
    return cloneState(base);
  }

  const previousPostIds = new Set(previous.posts.map((post) => post.id));
  const newSeedPostIds = new Set(base.posts.filter((post) => !previousPostIds.has(post.id)).map((post) => post.id));
  const previousSavedIds = new Set(previous.savedIds);
  const seededBoards = new Map(base.boards.map((board) => [board.id, board]));
  const previousBoardIds = new Set(previous.boards.map((board) => board.id));
  const newSeedSavedIds = new Set<string>();

  const boards = previous.boards.map((board) => {
    const seed = seededBoards.get(board.id);
    if (!seed || !sameSeedBoard(board, seed)) return board;
    const additions = seed.postIds.filter((id) => newSeedPostIds.has(id));
    additions.forEach((id) => newSeedSavedIds.add(id));
    return { ...board, postIds: [...new Set([...board.postIds, ...additions])] };
  });
  for (const board of base.boards) {
    if (previousBoardIds.has(board.id)) continue;
    // A newly introduced collection must also respect global unsaves made
    // before that collection existed. Older, already-saved posts can appear.
    const postIds = board.postIds.filter((id) => newSeedPostIds.has(id) || previousSavedIds.has(id));
    postIds.filter((id) => newSeedPostIds.has(id)).forEach((id) => newSeedSavedIds.add(id));
    boards.push({ ...board, postIds: [...new Set(postIds)] });
  }

  const user = previous.user!;
  const creators = mergeById(previous.creators, base.creators).map((creator) => creator.id === user.id ? user : creator);
  if (!creators.some((creator) => creator.id === user.id)) creators.unshift(user);
  const readAt = record(previous.readAt)
    ? Object.fromEntries(Object.entries(previous.readAt).filter(([, value]) => typeof value === 'string')) as Record<string, string>
    : {};

  return cloneState({
    user,
    creators,
    posts: mergeById(previous.posts, base.posts),
    comments: mergeById(previous.comments, base.comments).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    messages: mergeById(previous.messages, base.messages).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    boards: mergeById(boards, []),
    likedIds: previous.likedIds,
    savedIds: [...new Set([...previous.savedIds, ...newSeedSavedIds])],
    repostedIds: previous.repostedIds,
    followingIds: previous.followingIds,
    readAt,
    notificationsReadAt: typeof previous.notificationsReadAt === 'string' ? previous.notificationsReadAt : EPOCH,
  });
}

/** Equivalent base-first form for callers that already have an initial state. */
export function mergeDemoState(base: SocialState, raw: string | null): SocialState {
  return restoreDemo(raw, base);
}
