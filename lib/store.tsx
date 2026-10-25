'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Board,
  Comment,
  Conversation,
  CreatePostInput,
  Creator,
  Message,
  Notification,
  Post,
  ProfilePatch,
  SocialState,
} from './model';
import { demoUser, seedBoards, seedComments, seedCreators, seedMessages, seedPosts } from './seed';
import { getSupabase, liveBackendConfigured } from './supabase';

const STORAGE_KEY = 'turbowatch:demo:v1';
const EPOCH = '1970-01-01T00:00:00.000Z';

function initialDemoState(): SocialState {
  const creators = [demoUser, ...seedCreators.filter((creator) => creator.id !== demoUser.id)];
  return {
    user: demoUser,
    creators,
    posts: seedPosts,
    comments: seedComments,
    messages: seedMessages,
    boards: seedBoards,
    likedIds: [],
    savedIds: [...new Set(seedBoards.flatMap((board) => board.postIds))],
    repostedIds: [],
    followingIds: [],
    readAt: {},
    notificationsReadAt: EPOCH,
  };
}

function emptyLiveState(): SocialState {
  return {
    user: null,
    creators: [],
    posts: [],
    comments: [],
    messages: [],
    boards: [],
    likedIds: [],
    savedIds: [],
    repostedIds: [],
    followingIds: [],
    readAt: {},
    notificationsReadAt: EPOCH,
  };
}

function uniqueToggle(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

function textValue(value: string, label: string, max: number): string {
  const clean = value.trim();
  if (!clean) throw new Error(`${label} cannot be empty.`);
  if (clean.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return clean;
}

function validMediaUrl(value: string, allowData = true): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (allowData && /^data:(image|video)\/[a-z0-9.+-]+;base64,/i.test(value)) return true;
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function restoreDemo(raw: string | null): SocialState {
  if (!raw) return initialDemoState();
  try {
    const parsed: SocialState = JSON.parse(raw);
    const arrays: (keyof SocialState)[] = ['creators', 'posts', 'comments', 'messages', 'boards', 'likedIds', 'savedIds', 'repostedIds', 'followingIds'];
    if (!parsed.user || !arrays.every((key) => Array.isArray(parsed[key]))) return initialDemoState();
    return { ...initialDemoState(), ...parsed, readAt: parsed.readAt ?? {}, notificationsReadAt: parsed.notificationsReadAt ?? EPOCH };
  } catch {
    return initialDemoState();
  }
}

interface ProfileRow {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  verified: boolean;
  cover: string;
}

interface PostRow {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail: string;
  category: string;
  tags: string[];
  aspect: 'portrait' | 'landscape' | 'square';
  duration: string | null;
  views: number;
  created_at: string;
}

function profileFromRow(row: ProfileRow, followers = 0): Creator {
  return { id: row.id, name: row.name, username: row.username, avatar: row.avatar, bio: row.bio, verified: row.verified, cover: row.cover, followers };
}

function postFromRow(row: PostRow, likes = 0): Post {
  return {
    id: row.id, creatorId: row.creator_id, title: row.title, description: row.description,
    mediaType: row.media_type, mediaUrl: row.media_url, thumbnail: row.thumbnail,
    category: row.category, tags: row.tags ?? [], aspect: row.aspect,
    duration: row.duration ?? undefined, views: row.views, likes, createdAt: row.created_at,
  };
}

export interface SocialContextValue extends SocialState {
  currentUser: Creator | null;
  mode: 'demo' | 'live';
  loading: boolean;
  error: string | null;
  notice: string | null;
  conversations: Conversation[];
  notifications: Notification[];
  clearError: () => void;
  clearNotice: () => void;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;
  toggleFollow: (creatorId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  createPost: (input: CreatePostInput) => Promise<Post>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  sendMessage: (recipientId: string, text: string) => Promise<void>;
  createBoard: (name: string) => Promise<Board>;
  saveToBoard: (postId: string, boardId: string) => Promise<void>;
  markConversationRead: (creatorId: string) => Promise<void>;
  markNotificationsRead: () => void;
  uploadMedia: (file: File) => Promise<string>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SocialState>(() => liveBackendConfigured ? emptyLiveState() : initialDemoState());
  const stateRef = useRef(state);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mode = liveBackendConfigured ? 'live' : 'demo';
  const liveUserId = useRef<string | null>(null);
  const refreshGeneration = useRef(0);

  const replaceState = useCallback((next: SocialState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const setLiveIdentity = useCallback((userId: string | null) => {
    if (liveUserId.current !== userId || (stateRef.current.user && stateRef.current.user.id !== userId)) {
      // Never keep the previous account's private data on screen while a new
      // session loads, even if that refresh fails or the machine goes offline.
      replaceState({
        ...stateRef.current,
        user: null, messages: [], boards: [], likedIds: [], savedIds: [],
        repostedIds: [], followingIds: [], readAt: {}, notificationsReadAt: EPOCH,
      });
      setLoading(true);
    }
    liveUserId.current = userId;
  }, [replaceState]);

  const commitDemo = useCallback((update: (previous: SocialState) => SocialState) => {
    const next = update(stateRef.current);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error('Your browser storage is full or unavailable. Try a smaller upload or enable site storage. This change was not saved.');
    }
    replaceState(next);
  }, [replaceState]);

  const refreshLive = useCallback(async (userId: string | null) => {
    const db = getSupabase();
    if (!db) return;
    const generation = ++refreshGeneration.current;
    const [profiles, posts, likes, comments, follows, reposts, saved, boards, boardPosts, messages, reads] = await Promise.all([
      db.from('profiles').select('*'),
      db.from('posts').select('*').order('created_at', { ascending: false }).limit(200),
      db.from('post_likes').select('post_id,user_id'),
      db.from('comments').select('*').order('created_at', { ascending: false }).limit(1000),
      db.from('follows').select('follower_id,following_id'),
      userId ? db.from('reposts').select('post_id').eq('user_id', userId) : Promise.resolve({ data: [], error: null }),
      userId ? db.from('saved_posts').select('post_id').eq('user_id', userId) : Promise.resolve({ data: [], error: null }),
      userId ? db.from('boards').select('*').eq('user_id', userId).order('created_at') : Promise.resolve({ data: [], error: null }),
      userId ? db.from('board_posts').select('board_id,post_id') : Promise.resolve({ data: [], error: null }),
      userId ? db.from('messages').select('*').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', { ascending: false }).limit(1000) : Promise.resolve({ data: [], error: null }),
      userId ? db.from('message_reads').select('peer_id,read_at').eq('user_id', userId) : Promise.resolve({ data: [], error: null }),
    ]);
    const failure = [profiles, posts, likes, comments, follows, reposts, saved, boards, boardPosts, messages, reads].find((result) => result.error)?.error;
    if (failure) throw new Error(`Could not load your community: ${failure.message}. Verify that the Supabase schema has been applied.`);
    if (generation !== refreshGeneration.current || userId !== liveUserId.current) return;
    const creators: Creator[] = (profiles.data ?? []).map((row: ProfileRow) => profileFromRow(row, (follows.data ?? []).filter((follow) => follow.following_id === row.id).length));
    replaceState({
      user: creators.find((creator) => creator.id === userId) ?? null,
      creators,
      posts: (posts.data ?? []).map((row: PostRow) => postFromRow(row, (likes.data ?? []).filter((like) => like.post_id === row.id).length)),
      comments: [...(comments.data ?? [])].reverse().map((row) => ({ id: row.id, postId: row.post_id, creatorId: row.creator_id, text: row.text, createdAt: row.created_at })),
      messages: [...(messages.data ?? [])].reverse().map((row) => ({ id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, text: row.text, createdAt: row.created_at })),
      boards: (boards.data ?? []).map((row) => ({ id: row.id, name: row.name, description: row.description, postIds: (boardPosts.data ?? []).filter((item) => item.board_id === row.id).map((item) => item.post_id) })),
      likedIds: (likes.data ?? []).filter((like) => like.user_id === userId).map((like) => like.post_id),
      savedIds: (saved.data ?? []).map((item) => item.post_id),
      repostedIds: (reposts.data ?? []).map((item) => item.post_id),
      followingIds: (follows.data ?? []).filter((follow) => follow.follower_id === userId).map((follow) => follow.following_id),
      readAt: Object.fromEntries((reads.data ?? []).map((row) => [row.peer_id, row.read_at])),
      notificationsReadAt: stateRef.current.notificationsReadAt,
    });
  }, [replaceState]);

  useEffect(() => {
    if (mode === 'demo') {
      try {
        replaceState(restoreDemo(window.localStorage.getItem(STORAGE_KEY)));
      } catch {
        setError('Browser storage is unavailable. Enable site storage to save demo activity.');
      }
      setLoading(false);
      const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) replaceState(restoreDemo(event.newValue));
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    const db = getSupabase();
    if (!db) return;
    let active = true;
    const load = async (userId: string | null) => {
      if (!active) return;
      setLiveIdentity(userId);
      try {
        await refreshLive(userId);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load the community.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void db.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError && active) setError(sessionError.message);
      return load(data.session?.user.id ?? null);
    });
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => {
      // Defer database work outside the auth callback to avoid auth-lock deadlocks.
      window.setTimeout(() => { void load(session?.user.id ?? null); }, 0);
    });
    const channel = db.channel('turbowatch-community')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => { void load(liveUserId.current); })
      .subscribe();
    return () => {
      active = false;
      refreshGeneration.current += 1;
      listener.subscription.unsubscribe();
      void db.removeChannel(channel);
    };
  }, [mode, refreshLive, replaceState, setLiveIdentity]);

  const run = async <T,>(action: () => Promise<T> | T): Promise<T> => {
    setError(null);
    try {
      return await action();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'That change could not be saved. Please try again.';
      setError(message);
      throw new Error(message);
    }
  };

  const requireUser = (): Creator => {
    const user = stateRef.current.user;
    if (!user) throw new Error('Sign in to join the conversation.');
    return user;
  };

  const requirePost = (postId: string): Post => {
    const post = stateRef.current.posts.find((item) => item.id === postId);
    if (!post) throw new Error('This post is no longer available.');
    return post;
  };

  const toggleRelation = async (table: 'post_likes' | 'reposts', field: 'likedIds' | 'repostedIds', postId: string) => {
    const user = requireUser();
    requirePost(postId);
    const removing = stateRef.current[field].includes(postId);
    if (mode === 'demo') {
      commitDemo((previous) => ({
        ...previous,
        [field]: uniqueToggle(previous[field], postId),
        posts: field === 'likedIds' ? previous.posts.map((post) => post.id === postId ? { ...post, likes: Math.max(0, post.likes + (removing ? -1 : 1)) } : post) : previous.posts,
      }));
      return;
    }
    const db = getSupabase()!;
    const { error: failure } = removing
      ? await db.from(table).delete().eq('user_id', user.id).eq('post_id', postId)
      : await db.from(table).insert({ user_id: user.id, post_id: postId });
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
  };

  const toggleLike = (postId: string) => run(() => toggleRelation('post_likes', 'likedIds', postId));
  const toggleRepost = (postId: string) => run(() => toggleRelation('reposts', 'repostedIds', postId));

  const toggleSave = (postId: string) => run(async () => {
    const user = requireUser();
    requirePost(postId);
    const removing = stateRef.current.savedIds.includes(postId);
    if (mode === 'demo') {
      commitDemo((previous) => ({
        ...previous,
        savedIds: uniqueToggle(previous.savedIds, postId),
        boards: removing
          ? previous.boards.map((board) => ({ ...board, postIds: board.postIds.filter((id) => id !== postId) }))
          : previous.boards.some((board) => board.name === 'Saved')
            ? previous.boards.map((board) => board.name === 'Saved' ? { ...board, postIds: [...new Set([...board.postIds, postId])] } : board)
            : [...previous.boards, { id: crypto.randomUUID(), name: 'Saved', postIds: [postId] }],
      }));
      return;
    }
    const { error: failure } = await getSupabase()!.rpc('set_post_saved', { target_post_id: postId, should_save: !removing });
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
  });

  const toggleFollow = (creatorId: string) => run(async () => {
    const user = requireUser();
    if (creatorId === user.id) throw new Error('You cannot follow your own profile.');
    if (!stateRef.current.creators.some((creator) => creator.id === creatorId)) throw new Error('This creator is not available.');
    const removing = stateRef.current.followingIds.includes(creatorId);
    if (mode === 'demo') {
      commitDemo((previous) => ({
        ...previous, followingIds: uniqueToggle(previous.followingIds, creatorId),
        creators: previous.creators.map((creator) => creator.id === creatorId ? { ...creator, followers: Math.max(0, (creator.followers ?? 0) + (removing ? -1 : 1)) } : creator),
      }));
      return;
    }
    const db = getSupabase()!;
    const { error: failure } = removing
      ? await db.from('follows').delete().eq('follower_id', user.id).eq('following_id', creatorId)
      : await db.from('follows').insert({ follower_id: user.id, following_id: creatorId });
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
  });

  const addComment = (postId: string, text: string) => run(async () => {
    const user = requireUser();
    requirePost(postId);
    const clean = textValue(text, 'Comment', 2000);
    const comment: Comment = { id: crypto.randomUUID(), postId, creatorId: user.id, text: clean, createdAt: new Date().toISOString() };
    if (mode === 'demo') {
      commitDemo((previous) => ({ ...previous, comments: [...previous.comments, comment] }));
      return;
    }
    const { error: failure } = await getSupabase()!.from('comments').insert({ id: comment.id, post_id: postId, creator_id: user.id, text: clean });
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
  });

  const createPost = (input: CreatePostInput) => run(async () => {
    const user = requireUser();
    const title = textValue(input.title, 'Title', 120);
    if (!validMediaUrl(input.mediaUrl)) throw new Error('Choose a media file or a valid HTTP(S) media URL.');
    if ((input.mediaType === 'image' && !input.thumbnail) || (input.thumbnail && !validMediaUrl(input.thumbnail))) throw new Error('Add a valid image thumbnail for your post.');
    if (mode === 'live' && (!/^https?:\/\//.test(input.mediaUrl) || (input.thumbnail && !/^https?:\/\//.test(input.thumbnail)))) throw new Error('Use uploaded media or an absolute HTTP(S) URL for shared posts.');
    if (input.description.length > 2000) throw new Error('Description must be 2000 characters or fewer.');
    if (!['image', 'video'].includes(input.mediaType) || !['portrait', 'landscape', 'square'].includes(input.aspect)) throw new Error('Choose a supported media type and format.');
    const post: Post = {
      ...input, title, description: input.description.trim(), category: textValue(input.category, 'Category', 60),
      tags: input.tags.map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean).slice(0, 12),
      id: crypto.randomUUID(), creatorId: user.id, likes: 0, views: 0, createdAt: new Date().toISOString(),
    };
    if (mode === 'demo') {
      commitDemo((previous) => ({ ...previous, posts: [post, ...previous.posts] }));
      return post;
    }
    const { error: failure } = await getSupabase()!.from('posts').insert({
      id: post.id, creator_id: user.id, title: post.title, description: post.description,
      media_type: post.mediaType, media_url: post.mediaUrl, thumbnail: post.thumbnail,
      category: post.category, tags: post.tags, aspect: post.aspect, duration: post.duration ?? null,
    });
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
    return post;
  });

  const updateProfile = (patch: ProfilePatch) => run(async () => {
    const user = requireUser();
    const updated = { ...user, ...patch };
    updated.name = textValue(updated.name, 'Name', 60);
    updated.username = updated.username.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(updated.username)) throw new Error('Username must be 3–24 letters, numbers, or underscores.');
    if (updated.bio.length > 240) throw new Error('Bio must be 240 characters or fewer.');
    if (updated.avatar && !validMediaUrl(updated.avatar)) throw new Error('Choose a valid profile image.');
    if (stateRef.current.creators.some((creator) => creator.id !== user.id && creator.username.toLowerCase() === updated.username)) throw new Error('That username is already taken.');
    if (mode === 'demo') {
      commitDemo((previous) => ({ ...previous, user: updated, creators: previous.creators.map((creator) => creator.id === user.id ? updated : creator) }));
      return;
    }
    const { error: failure } = await getSupabase()!.from('profiles').update({ name: updated.name, username: updated.username, bio: updated.bio, avatar: updated.avatar }).eq('id', user.id);
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
  });

  const sendMessage = (recipientId: string, text: string) => run(async () => {
    const user = requireUser();
    if (recipientId === user.id || !stateRef.current.creators.some((creator) => creator.id === recipientId)) throw new Error('Choose another creator to message.');
    const clean = textValue(text, 'Message', 2000);
    const message: Message = { id: crypto.randomUUID(), senderId: user.id, recipientId, text: clean, createdAt: new Date().toISOString() };
    if (mode === 'demo') {
      commitDemo((previous) => ({ ...previous, messages: [...previous.messages, message] }));
      return;
    }
    const { error: failure } = await getSupabase()!.from('messages').insert({ id: message.id, sender_id: user.id, recipient_id: recipientId, text: clean });
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
  });

  const createBoard = (name: string) => run(async () => {
    const user = requireUser();
    const clean = textValue(name, 'Collection name', 60);
    const existing = stateRef.current.boards.find((board) => board.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const board: Board = { id: crypto.randomUUID(), name: clean, postIds: [] };
    if (mode === 'demo') {
      commitDemo((previous) => ({ ...previous, boards: [...previous.boards, board] }));
      return board;
    }
    const { error: failure } = await getSupabase()!.from('boards').insert({ id: board.id, user_id: user.id, name: clean });
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
    return board;
  });

  const saveToBoard = (postId: string, boardId: string) => run(async () => {
    const user = requireUser();
    requirePost(postId);
    if (!stateRef.current.boards.some((board) => board.id === boardId)) throw new Error('This collection is no longer available.');
    if (mode === 'demo') {
      commitDemo((previous) => ({
        ...previous,
        savedIds: [...new Set([...previous.savedIds, postId])],
        boards: previous.boards.map((board) => board.id === boardId ? { ...board, postIds: [...new Set([...board.postIds, postId])] } : board),
      }));
      return;
    }
    const { error: failure } = await getSupabase()!.rpc('save_post_to_board', { target_post_id: postId, target_board_id: boardId });
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
  });

  const markConversationRead = (creatorId: string) => run(async () => {
    const user = requireUser();
    const readAt = new Date().toISOString();
    if (mode === 'demo') {
      commitDemo((previous) => ({ ...previous, readAt: { ...previous.readAt, [creatorId]: readAt } }));
      return;
    }
    const { error: failure } = await getSupabase()!.from('message_reads').upsert({ user_id: user.id, peer_id: creatorId, read_at: readAt }, { onConflict: 'user_id,peer_id' });
    if (failure) throw new Error(failure.message);
    await refreshLive(user.id);
  });

  const markNotificationsRead = () => {
    const next = { ...stateRef.current, notificationsReadAt: new Date().toISOString() };
    if (mode === 'demo') {
      try { commitDemo(() => next); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save read status.'); }
    } else replaceState(next);
  };

  const uploadMedia = (file: File) => run(async () => {
    const user = requireUser();
    if (!/^(image|video)\//.test(file.type) || file.type === 'image/svg+xml') throw new Error('Choose a JPEG, PNG, WebP, GIF, or video file.');
    const maxBytes = mode === 'demo' ? 2 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxBytes) throw new Error(mode === 'demo' ? 'Demo uploads must be 2 MB or smaller. Use a hosted media URL for larger videos.' : 'Uploads must be 50 MB or smaller.');
    if (mode === 'demo') {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('This file could not be read. Please try another.'));
        reader.readAsDataURL(file);
      });
    }
    const db = getSupabase()!;
    const suffix = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
    const path = `${user.id}/${crypto.randomUUID()}.${suffix}`;
    const { error: failure } = await db.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
    if (failure) throw new Error(failure.message);
    return db.storage.from('media').getPublicUrl(path).data.publicUrl;
  });

  const requireAuthBackend = () => {
    const db = getSupabase();
    if (!db) throw new Error('Real accounts require a connected Supabase project. You can explore all demo features with the demo profile.');
    return db;
  };

  const signIn = (email: string, password: string) => run(async () => {
    const db = requireAuthBackend();
    const { data, error: failure } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (failure) throw new Error(failure.message);
    setLiveIdentity(data.user.id);
    await refreshLive(data.user.id);
    setNotice('Welcome back.');
  });

  const signUp = (email: string, password: string, name: string) => run(async () => {
    const db = requireAuthBackend();
    const clean = textValue(name, 'Name', 60);
    if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
    const { data, error: failure } = await db.auth.signUp({ email: email.trim(), password, options: { data: { name: clean } } });
    if (failure) throw new Error(failure.message);
    if (data.session && data.user) {
      setLiveIdentity(data.user.id);
      await refreshLive(data.user.id);
      setNotice('Your account is ready. Make yourself at home.');
    } else setNotice('Check your email to confirm your account, then sign in.');
  });

  const signOut = () => run(async () => {
    if (mode === 'demo') {
      setNotice('You are exploring a local demo profile. Real accounts are available when a Supabase project is connected.');
      return;
    }
    const { error: failure } = await getSupabase()!.auth.signOut();
    if (failure) throw new Error(failure.message);
    setLiveIdentity(null);
    await refreshLive(null);
  });

  const conversations = useMemo(() => {
    if (!state.user) return [];
    const userId = state.user.id;
    const peers = [...new Set(state.messages.filter((message) => message.senderId === userId || message.recipientId === userId).map((message) => message.senderId === userId ? message.recipientId : message.senderId))];
    return peers.map((creatorId): Conversation => {
      const messages = state.messages.filter((message) => (message.senderId === userId && message.recipientId === creatorId) || (message.senderId === creatorId && message.recipientId === userId));
      return { id: `conversation-${creatorId}`, creatorId, messages, unread: messages.filter((message) => message.senderId === creatorId && message.createdAt > (state.readAt[creatorId] ?? EPOCH)).length };
    }).sort((a, b) => (b.messages.at(-1)?.createdAt ?? '').localeCompare(a.messages.at(-1)?.createdAt ?? ''));
  }, [state.user, state.messages, state.readAt]);

  const notifications = useMemo(() => {
    if (!state.user) return [];
    const userId = state.user.id;
    const ownPosts = new Set(state.posts.filter((post) => post.creatorId === userId).map((post) => post.id));
    return state.comments.filter((comment) => comment.creatorId !== userId && ownPosts.has(comment.postId)).map((comment): Notification => ({
      id: comment.id, creatorId: comment.creatorId, text: `commented: ${comment.text}`, createdAt: comment.createdAt,
      postId: comment.postId, read: comment.createdAt <= state.notificationsReadAt,
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.user, state.posts, state.comments, state.notificationsReadAt]);

  return <SocialContext.Provider value={{
    ...state, currentUser: state.user, mode, loading, error, notice, conversations, notifications,
    clearError: () => setError(null), clearNotice: () => setNotice(null),
    toggleLike, toggleSave, toggleRepost, toggleFollow, addComment, createPost, updateProfile,
    sendMessage, createBoard, saveToBoard, markConversationRead, markNotificationsRead,
    uploadMedia, signIn, signUp, signOut,
  }}>{children}</SocialContext.Provider>;
}

export function useSocial(): SocialContextValue {
  const value = useContext(SocialContext);
  if (!value) throw new Error('useSocial must be used inside SocialProvider.');
  return value;
}
