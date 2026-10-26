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
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
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
import { createDemoState, restoreDemo } from './demo-state';
import { createRefreshQueue, reconcileRows, sameStrings, type RefreshQueue } from './live-sync';

const STORAGE_KEY = 'turbowatch:demo:v1';
const EPOCH = '1970-01-01T00:00:00.000Z';
const BACKEND_SETUP_MESSAGE = 'Real accounts are not configured yet. The site owner must set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy. No demo account is signed in.';

function initialDemoState(): SocialState {
  return createDemoState({ user: demoUser, creators: seedCreators, posts: seedPosts, comments: seedComments, messages: seedMessages, boards: seedBoards });
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

interface LikeRow { user_id: string; post_id: string; created_at: string }
interface FollowRow { follower_id: string; following_id: string; created_at: string }
interface PublicActivity { likes: LikeRow[]; follows: FollowRow[]; reposts: LikeRow[] }
const EMPTY_ACTIVITY: PublicActivity = { likes: [], follows: [], reposts: [] };

function reconcileState(previous: SocialState, incoming: SocialState): SocialState {
  const creators = reconcileRows(previous.creators, incoming.creators);
  const next: SocialState = {
    ...incoming,
    user: incoming.user ? creators.find((creator) => creator.id === incoming.user?.id) ?? incoming.user : null,
    creators,
    posts: reconcileRows(previous.posts, incoming.posts),
    comments: reconcileRows(previous.comments, incoming.comments),
    messages: reconcileRows(previous.messages, incoming.messages),
    boards: reconcileRows(previous.boards, incoming.boards),
    likedIds: sameStrings(previous.likedIds, incoming.likedIds),
    savedIds: sameStrings(previous.savedIds, incoming.savedIds),
    repostedIds: sameStrings(previous.repostedIds, incoming.repostedIds),
    followingIds: sameStrings(previous.followingIds, incoming.followingIds),
    readAt: JSON.stringify(previous.readAt) === JSON.stringify(incoming.readAt) ? previous.readAt : incoming.readAt,
  };
  return (Object.keys(next) as (keyof SocialState)[]).every((key) => next[key] === previous[key]) ? previous : next;
}

export interface SocialContextValue extends SocialState {
  currentUser: Creator | null;
  mode: 'demo' | 'live';
  backendConfigured: boolean;
  loading: boolean;
  error: string | null;
  notice: string | null;
  conversations: Conversation[];
  notifications: Notification[];
  publicReposts: Record<string, string[]>;
  syncStatus: 'connecting' | 'live' | 'polling' | 'offline';
  refreshCommunity: () => Promise<void>;
  setDemoMode: (enabled: boolean) => void;
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
  signUp: (email: string, password: string, name: string) => Promise<{ needsEmailConfirmation: boolean }>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  // A missing backend must never sign every visitor into the same fictional
  // identity. Sample data is available only through an explicit demo URL.
  const [state, setState] = useState<SocialState>(emptyLiveState);
  const stateRef = useRef(state);
  const demoHydratedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publicActivity, setPublicActivity] = useState<PublicActivity>(EMPTY_ACTIVITY);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'live' | 'polling' | 'offline'>('connecting');
  const [demoRequested, setDemoRequested] = useState<boolean | null>(null);
  const demoRequestedRef = useRef<boolean | null>(null);
  const mode = demoRequested === true ? 'demo' : 'live';
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const liveUserId = useRef<string | null>(null);
  const modeGeneration = useRef(0);
  const refreshGeneration = useRef(0);
  const refreshQueueRef = useRef<RefreshQueue | null>(null);
  const syncErrorRef = useRef(false);

  const replaceState = useCallback((next: SocialState) => {
    const reconciled = reconcileState(stateRef.current, next);
    if (reconciled === stateRef.current) return;
    stateRef.current = reconciled;
    setState(reconciled);
  }, []);

  const ensureDemoHydrated = useCallback(() => {
    if (modeRef.current !== 'demo' || demoHydratedRef.current) return;
    // Child effects can run before this provider's hydration effect. Read the
    // saved snapshot before any mutation computes from the initial seed state.
    // If reading storage fails, leave the guard unset and refuse to overwrite it.
    const restored = restoreDemo(window.localStorage.getItem(STORAGE_KEY), initialDemoState());
    replaceState(restored);
    demoHydratedRef.current = true;
  }, [replaceState]);

  const setLiveIdentity = useCallback((userId: string | null) => {
    if (modeRef.current !== 'live') return;
    if (liveUserId.current !== userId || (stateRef.current.user && stateRef.current.user.id !== userId)) {
      // Never keep the previous account's private data on screen while a new
      // session loads, even if that refresh fails or the machine goes offline.
      replaceState({
        ...stateRef.current,
        user: null, messages: [], boards: [], likedIds: [], savedIds: [],
        repostedIds: [], followingIds: [], readAt: {}, notificationsReadAt: EPOCH,
      });
      refreshGeneration.current += 1;
      setLoading(true);
    }
    liveUserId.current = userId;
  }, [replaceState]);

  const setDemoMode = useCallback((enabled: boolean) => {
    if (demoRequestedRef.current === enabled) return;
    const alreadyInitialized = demoRequestedRef.current !== null;
    demoRequestedRef.current = enabled;
    const nextMode = enabled ? 'demo' : 'live';
    setDemoRequested(enabled);
    if (alreadyInitialized && nextMode === modeRef.current) return;
    modeRef.current = nextMode;
    modeGeneration.current += 1;
    demoHydratedRef.current = false;
    refreshGeneration.current += 1;
    refreshQueueRef.current?.dispose();
    refreshQueueRef.current = null;
    liveUserId.current = null;
    setError(null);
    setNotice(null);
    syncErrorRef.current = false;
    setPublicActivity(EMPTY_ACTIVITY);
    setLoading(true);
    replaceState(nextMode === 'demo' ? initialDemoState() : emptyLiveState());
  }, [replaceState]);

  useEffect(() => {
    const readMode = () => setDemoMode(new URLSearchParams(window.location.search).get('demo') === '1');
    readMode();
    window.addEventListener('popstate', readMode);
    return () => window.removeEventListener('popstate', readMode);
  }, [setDemoMode]);

  const commitDemo = useCallback((update: (previous: SocialState) => SocialState) => {
    if (modeRef.current !== 'demo') throw new DOMException('This demo session is no longer active.', 'AbortError');
    ensureDemoHydrated();
    const next = update(stateRef.current);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error('Your browser storage is full or unavailable. Try a smaller upload or enable site storage. This change was not saved.');
    }
    replaceState(next);
  }, [ensureDemoHydrated, replaceState]);

  const refreshLive = useCallback(async (userId: string | null) => {
    if (modeRef.current !== 'live') return;
    const db = getSupabase();
    if (!db) throw new Error(BACKEND_SETUP_MESSAGE);
    const generation = ++refreshGeneration.current;
    const [profiles, currentProfile, posts, likes, comments, follows, reposts, saved, boards, boardPosts, messages, reads] = await Promise.all([
      db.from('profiles').select('*'),
      // The community listing may be capped by PostgREST. Fetch this account
      // directly so a profile outside that page never looks like a broken login.
      userId ? db.from('profiles').select('*').eq('id', userId) : Promise.resolve({ data: [], error: null }),
      db.from('posts').select('*').order('created_at', { ascending: false }).limit(200),
      db.from('post_likes').select('post_id,user_id,created_at'),
      db.from('comments').select('*').order('created_at', { ascending: false }).limit(1000),
      db.from('follows').select('follower_id,following_id,created_at'),
      db.from('reposts').select('post_id,user_id,created_at'),
      userId ? db.from('saved_posts').select('post_id').eq('user_id', userId) : Promise.resolve({ data: [], error: null }),
      userId ? db.from('boards').select('*').eq('user_id', userId).order('created_at') : Promise.resolve({ data: [], error: null }),
      userId ? db.from('board_posts').select('board_id,post_id') : Promise.resolve({ data: [], error: null }),
      userId ? db.from('messages').select('*').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', { ascending: false }).limit(1000) : Promise.resolve({ data: [], error: null }),
      userId ? db.from('message_reads').select('peer_id,read_at').eq('user_id', userId) : Promise.resolve({ data: [], error: null }),
    ]);
    if (generation !== refreshGeneration.current || userId !== liveUserId.current || modeRef.current !== 'live') return;
    const failure = [profiles, currentProfile, posts, likes, comments, follows, reposts, saved, boards, boardPosts, messages, reads].find((result) => result.error)?.error;
    if (failure) {
      if (failure.code === 'PGRST205' || failure.code === '42P01') {
        throw new Error('Community database setup is incomplete. The site owner needs to create or refresh the schema using the setup instructions below, then try again.');
      }
      throw new Error(`Could not load your community: ${failure.message}`);
    }
    const profileRows = new Map<string, ProfileRow>();
    for (const row of [...(profiles.data ?? []), ...(currentProfile.data ?? [])] as ProfileRow[]) profileRows.set(row.id, row);
    const creators: Creator[] = [...profileRows.values()].map((row) => profileFromRow(row, (follows.data ?? []).filter((follow) => follow.following_id === row.id).length));
    if (userId && !creators.some((creator) => creator.id === userId)) {
      throw new Error('You are signed in, but your account profile is missing. The site owner needs to run the complete updated supabase/schema.sql to create profiles for existing accounts.');
    }
    replaceState({
      user: creators.find((creator) => creator.id === userId) ?? null,
      creators,
      posts: (posts.data ?? []).map((row: PostRow) => postFromRow(row, (likes.data ?? []).filter((like) => like.post_id === row.id).length)),
      comments: [...(comments.data ?? [])].reverse().map((row) => ({ id: row.id, postId: row.post_id, creatorId: row.creator_id, text: row.text, createdAt: row.created_at })),
      messages: [...(messages.data ?? [])].reverse().map((row) => ({ id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, text: row.text, createdAt: row.created_at })),
      boards: (boards.data ?? []).map((row) => ({ id: row.id, name: row.name, description: row.description, postIds: (boardPosts.data ?? []).filter((item) => item.board_id === row.id).map((item) => item.post_id) })),
      likedIds: (likes.data ?? []).filter((like) => like.user_id === userId).map((like) => like.post_id),
      savedIds: (saved.data ?? []).map((item) => item.post_id),
      repostedIds: (reposts.data ?? []).filter((item) => item.user_id === userId).map((item) => item.post_id),
      followingIds: (follows.data ?? []).filter((follow) => follow.follower_id === userId).map((follow) => follow.following_id),
      readAt: Object.fromEntries((reads.data ?? []).map((row) => [row.peer_id, row.read_at])),
      notificationsReadAt: stateRef.current.notificationsReadAt,
    });
    const activity: PublicActivity = {
      likes: (likes.data ?? []) as LikeRow[],
      follows: (follows.data ?? []) as FollowRow[],
      reposts: (reposts.data ?? []) as LikeRow[],
    };
    setPublicActivity((previous) => JSON.stringify(previous) === JSON.stringify(activity) ? previous : activity);
  }, [replaceState]);

  useEffect(() => {
    if (demoRequested === null) return;
    setError(null);
    if (mode === 'demo') {
      try {
        const restored = restoreDemo(window.localStorage.getItem(STORAGE_KEY), initialDemoState());
        replaceState(restored);
        demoHydratedRef.current = true;
        // Persist added demo content without discarding existing activity.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      } catch {
        setError('Browser storage is unavailable. Enable site storage to save demo activity.');
      }
      setLoading(false);
      const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY && modeRef.current === 'demo') {
          replaceState(restoreDemo(event.newValue, initialDemoState()));
          demoHydratedRef.current = true;
        }
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    let db: ReturnType<typeof getSupabase>;
    try { db = getSupabase(); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Community connection settings are invalid.');
      setLoading(false);
      return;
    }
    if (!db) {
      replaceState(emptyLiveState());
      setError(BACKEND_SETUP_MESSAGE);
      setSyncStatus('offline');
      setLoading(false);
      return;
    }
    const client = db;
    let active = true;
    let authVersion = 0;
    let channel: RealtimeChannel | null = null;
    let channelIdentity: string | null | undefined;
    let realtimeConnected = false;
    let pollTicks = 0;

    const reportFailure = (cause: unknown) => {
      if (!active || modeRef.current !== 'live') return;
      syncErrorRef.current = true;
      setError(cause instanceof Error ? cause.message : 'Could not load the community.');
      setSyncStatus('offline');
    };
    const queue = createRefreshQueue(async () => {
      const userId = liveUserId.current;
      const identityVersion = authVersion;
      try {
        await refreshLive(userId);
        if (!active || modeRef.current !== 'live' || identityVersion !== authVersion || userId !== liveUserId.current) return;
        if (syncErrorRef.current) { syncErrorRef.current = false; setError(null); }
        setSyncStatus(realtimeConnected ? 'live' : 'polling');
      } catch (cause) {
        if (active && modeRef.current === 'live' && identityVersion === authVersion && userId === liveUserId.current) {
          reportFailure(cause);
          throw cause;
        }
      } finally {
        if (active && identityVersion === authVersion) setLoading(false);
      }
    });
    refreshQueueRef.current = queue;
    const request = (immediate = false) => { void queue.request(immediate).catch(() => {}); };

    const applySession = async (session: Session | null, version: number) => {
      if (!active || version !== authVersion) return;
      const userId = session?.user.id ?? null;
      if (channel && channelIdentity !== userId) {
        const previousChannel = channel;
        channel = null;
        realtimeConnected = false;
        void client.removeChannel(previousChannel).catch(() => {});
      }
      try {
        // Set the actual authenticated JWT before subscribing. The server still
        // applies RLS to every public/private INSERT delivered to this channel.
        await client.realtime.setAuth(session?.access_token ?? null);
        if (!active || version !== authVersion || modeRef.current !== 'live') return;
        if (!channel) {
          const created = client.channel(`turbowatch-community-${userId ?? 'public'}-${version}`);
          for (const table of ['profiles', 'posts', 'post_likes', 'comments', 'follows', 'reposts']) {
            created.on('postgres_changes', { event: '*', schema: 'public', table }, () => { if (active && channel === created) request(); });
          }
          if (userId) {
            created.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, () => { if (active && channel === created) request(); });
            created.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, () => { if (active && channel === created) request(); });
          }
          channel = created;
          channelIdentity = userId;
          created.subscribe((status) => {
            if (!active || channel !== created) return;
            realtimeConnected = status === 'SUBSCRIBED';
            setSyncStatus(realtimeConnected ? 'live' : 'polling');
            if (realtimeConnected) request(true);
          });
        }
      } catch {
        // HTTP synchronization stays available if the socket cannot connect.
        if (active && version === authVersion) { realtimeConnected = false; setSyncStatus('polling'); }
      }
      if (active && version === authVersion) request(true);
    };
    const receiveSession = (session: Session | null) => {
      if (!active || modeRef.current !== 'live') return;
      const version = ++authVersion;
      setLiveIdentity(session?.user.id ?? null);
      // Leave the auth callback before SDK/database work to avoid auth-lock
      // deadlocks. Version checks discard stale bootstrap/token callbacks.
      window.setTimeout(() => { void applySession(session, version); }, 0);
    };
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => receiveSession(session));
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authVersion !== 0) return;
      if (sessionError) reportFailure(sessionError);
      receiveSession(data.session);
    }).catch((cause) => {
      if (!active || authVersion !== 0) return;
      reportFailure(cause);
      receiveSession(null);
    });

    const onVisible = () => { if (document.visibilityState === 'visible') request(true); };
    const onOnline = () => request(true);
    const onOffline = () => { if (active) setSyncStatus('offline'); };
    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      // Five-second fallback when sockets are unavailable; a slower safety
      // read also catches private collection/read-marker changes in other tabs.
      pollTicks += 1;
      if (!realtimeConnected || pollTicks % 6 === 0) request();
    }, 5000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      active = false;
      authVersion += 1;
      refreshGeneration.current += 1;
      queue.dispose();
      if (refreshQueueRef.current === queue) refreshQueueRef.current = null;
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      listener.subscription.unsubscribe();
      if (channel) void client.removeChannel(channel).catch(() => {});
    };
  }, [demoRequested, mode, refreshLive, replaceState, setLiveIdentity]);

  const refreshAfterMutation = async (userId: string | null) => {
    if (modeRef.current !== 'live' || userId !== liveUserId.current) return;
    if (refreshQueueRef.current) await refreshQueueRef.current.request(true);
    else await refreshLive(userId);
  };

  const refreshCommunity = async () => {
    if (modeRef.current !== 'live') return;
    setError(null);
    try { await refreshAfterMutation(liveUserId.current); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not reconnect to the community.';
      setError(message);
      throw new Error(message);
    }
  };

  const run = async <T,>(action: () => Promise<T> | T, changesIdentity = false): Promise<T> => {
    // Hydrate before action closures read profiles/posts or construct updates.
    // commitDemo repeats this check as a final protection for direct callers.
    try { ensureDemoHydrated(); }
    catch {
      const message = 'Browser storage is unavailable. Enable site storage to save demo activity.';
      setError(message);
      throw new Error(message);
    }
    const generation = modeGeneration.current;
    const originalMode = modeRef.current;
    const originalUserId = stateRef.current.user?.id ?? null;
    const current = () => generation === modeGeneration.current && originalMode === modeRef.current
      && (changesIdentity || originalUserId === (stateRef.current.user?.id ?? null));
    setError(null);
    syncErrorRef.current = false;
    try {
      const result = await action();
      if (!current()) throw new DOMException('This action belongs to a previous session.', 'AbortError');
      return result;
    } catch (cause) {
      if (!current() || (cause instanceof Error && cause.name === 'AbortError')) {
        throw new DOMException('This action belongs to a previous session.', 'AbortError');
      }
      const message = cause instanceof Error ? cause.message : 'That change could not be saved. Please try again.';
      setError(message);
      throw new Error(message);
    }
  };

  const requireUser = (): Creator => {
    ensureDemoHydrated();
    if (modeRef.current === 'live' && !liveBackendConfigured) throw new Error(BACKEND_SETUP_MESSAGE);
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
    await refreshAfterMutation(user.id);
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
    await refreshAfterMutation(user.id);
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
    await refreshAfterMutation(user.id);
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
    await refreshAfterMutation(user.id);
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
    await refreshAfterMutation(user.id);
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
    await refreshAfterMutation(user.id);
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
    await refreshAfterMutation(user.id);
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
    await refreshAfterMutation(user.id);
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
    await refreshAfterMutation(user.id);
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
    await refreshAfterMutation(user.id);
  });

  const markNotificationsRead = () => {
    try { ensureDemoHydrated(); }
    catch { setError('Browser storage is unavailable. Enable site storage to save demo activity.'); return; }
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
    if (modeRef.current !== 'live') throw new Error('Leave the sample preview to sign in to your own real account.');
    const db = getSupabase();
    if (!db) throw new Error(BACKEND_SETUP_MESSAGE);
    return db;
  };

  const signIn = (email: string, password: string) => run(async () => {
    const db = requireAuthBackend();
    const generation = modeGeneration.current;
    const { data, error: failure } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (modeRef.current !== 'live' || generation !== modeGeneration.current) throw new DOMException('This sign-in belongs to a previous session.', 'AbortError');
    if (failure) throw new Error(failure.message);
    if (!data.session || !data.user) throw new Error('Sign-in did not return a valid account session. Please try again.');
    setLiveIdentity(data.user.id);
    await refreshAfterMutation(data.user.id);
    if (modeRef.current !== 'live' || generation !== modeGeneration.current) return;
    setNotice('Welcome back.');
  }, true);

  const signUp = (email: string, password: string, name: string) => run(async () => {
    const db = requireAuthBackend();
    const generation = modeGeneration.current;
    const clean = textValue(name, 'Name', 60);
    if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
    const { data, error: failure } = await db.auth.signUp({
      email: email.trim(), password,
      options: { data: { name: clean }, emailRedirectTo: new URL('/', window.location.origin).href },
    });
    if (modeRef.current !== 'live' || generation !== modeGeneration.current) throw new DOMException('This signup belongs to a previous session.', 'AbortError');
    if (failure) throw new Error(failure.message);
    if (!data.user) throw new Error('Account creation did not complete. Please try again.');
    if (data.session && data.user) {
      setLiveIdentity(data.user.id);
      await refreshAfterMutation(data.user.id);
      if (modeRef.current !== 'live' || generation !== modeGeneration.current) throw new DOMException('This signup belongs to a previous session.', 'AbortError');
      setNotice('Your account is ready. Make yourself at home.');
      return { needsEmailConfirmation: false };
    }
    setNotice('Check your email to confirm your account, then sign in.');
    return { needsEmailConfirmation: true };
  }, true);

  const resendConfirmation = (email: string) => run(async () => {
    const db = requireAuthBackend();
    const generation = modeGeneration.current;
    const cleanEmail = textValue(email, 'Email address', 320);
    const { error: failure } = await db.auth.resend({
      type: 'signup', email: cleanEmail,
      options: { emailRedirectTo: new URL('/', window.location.origin).href },
    });
    if (modeRef.current !== 'live' || generation !== modeGeneration.current) throw new DOMException('This confirmation belongs to a previous session.', 'AbortError');
    if (failure) throw new Error(failure.message);
  });

  const signOut = () => run(async () => {
    if (mode === 'demo') {
      setNotice('You are exploring a local demo profile. Real accounts are available when a Supabase project is connected.');
      return;
    }
    const generation = modeGeneration.current;
    const { error: failure } = await requireAuthBackend().auth.signOut();
    if (modeRef.current !== 'live' || generation !== modeGeneration.current) return;
    if (failure) throw new Error(failure.message);
    setLiveIdentity(null);
    await refreshAfterMutation(null);
  }, true);

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
    const items: Notification[] = state.comments.filter((comment) => comment.creatorId !== userId && ownPosts.has(comment.postId)).map((comment) => ({
      id: `comment:${comment.id}`, creatorId: comment.creatorId, text: `commented: ${comment.text}`, createdAt: comment.createdAt,
      postId: comment.postId, read: comment.createdAt <= state.notificationsReadAt,
    }));
    if (mode === 'live') {
      for (const like of publicActivity.likes) {
        if (like.user_id === userId || !ownPosts.has(like.post_id)) continue;
        const createdAt = like.created_at ?? EPOCH;
        items.push({ id: `like:${like.user_id}:${like.post_id}`, creatorId: like.user_id, text: 'liked your post', postId: like.post_id, createdAt, read: createdAt <= state.notificationsReadAt });
      }
      for (const repost of publicActivity.reposts) {
        if (repost.user_id === userId || !ownPosts.has(repost.post_id)) continue;
        const createdAt = repost.created_at ?? EPOCH;
        items.push({ id: `repost:${repost.user_id}:${repost.post_id}`, creatorId: repost.user_id, text: 'reposted your post', postId: repost.post_id, createdAt, read: createdAt <= state.notificationsReadAt });
      }
      for (const follow of publicActivity.follows) {
        if (follow.follower_id === userId || follow.following_id !== userId) continue;
        const createdAt = follow.created_at ?? EPOCH;
        items.push({ id: `follow:${follow.follower_id}:${userId}`, creatorId: follow.follower_id, text: 'started following you', createdAt, read: createdAt <= state.notificationsReadAt });
      }
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.user, state.posts, state.comments, state.notificationsReadAt, publicActivity, mode]);

  const publicReposts = useMemo(() => {
    if (mode === 'demo') return state.user ? { [state.user.id]: state.repostedIds } : {};
    const result: Record<string, string[]> = {};
    for (const repost of publicActivity.reposts) (result[repost.user_id] ??= []).push(repost.post_id);
    return result;
  }, [mode, state.user, state.repostedIds, publicActivity.reposts]);

  return <SocialContext.Provider value={{
    ...state, currentUser: state.user, mode, backendConfigured: liveBackendConfigured, loading, error, notice, conversations, notifications,
    publicReposts, syncStatus, refreshCommunity, setDemoMode,
    clearError: () => setError(null), clearNotice: () => setNotice(null),
    toggleLike, toggleSave, toggleRepost, toggleFollow, addComment, createPost, updateProfile,
    sendMessage, createBoard, saveToBoard, markConversationRead, markNotificationsRead,
    uploadMedia, signIn, signUp, resendConfirmation, signOut,
  }}>{children}</SocialContext.Provider>;
}

export function useSocial(): SocialContextValue {
  const value = useContext(SocialContext);
  if (!value) throw new Error('useSocial must be used inside SocialProvider.');
  return value;
}
