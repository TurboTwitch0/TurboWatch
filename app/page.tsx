'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bell, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Compass, Grid2X2, Heart, Home, Image as ImageIcon, Link as LinkIcon, LogOut, Menu, MessageCircle, MoreHorizontal, Play, Plus, Repeat2, Search, Send, Settings2, Sparkles, Users, UserRound, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { useSocial } from '@/lib/store';
import Avatar from '@/components/Avatar';
import PostCover from '@/components/PostCover';
import FeedGrid from '@/components/Feed';
import AccountMenu from '@/components/AccountMenu';
import BrandMark from '@/components/BrandMark';
import ProductPreview from '@/components/ProductPreview';
import type { Board, Creator, Post } from '@/lib/model';
import { sitePath } from '@/lib/navigation';
import { matchesCreator, matchesPost } from '@/lib/search';
import { AuthDialog, CreateDialog, Dialog, EditProfileDialog, NewBoardDialog, PasswordRecoveryDialog, ShareDialog } from '@/components/Dialogs';

type View = 'feed' | 'explore' | 'shorts' | 'boards' | 'messages' | 'profile';
type Popup = 'create' | 'edit' | 'auth' | 'board' | null;
const navItems = [
  { id: 'feed' as View, label: 'For you', icon: Home },
  { id: 'explore' as View, label: 'Explore', icon: Compass },
  { id: 'shorts' as View, label: 'Shorts', icon: Clapperboard },
  { id: 'boards' as View, label: 'Collections', icon: Bookmark },
  { id: 'messages' as View, label: 'Messages', icon: MessageCircle },
];
const number = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const date = (s: string) => new Date(s).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });



export default function TurboWatch() {
  const social = useSocial();
  const { posts, creators, user, boards, conversations, likedIds, savedIds, followingIds, repostedIds, notifications: communityActivity, mode, loading, error } = social;
  const [view, setView] = useState<View>('feed');
  const [category, setCategory] = useState('All');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video'>('all');
  const [sortOrder, setSortOrder] = useState<'recommended' | 'newest' | 'liked'>('recommended');
  const [search, setSearch] = useState('');
  const [popup, setPopup] = useState<Popup>(null);
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [authLinkError, setAuthLinkError] = useState('');
  const [profileTab, setProfileTab] = useState('Posts');
  const [selectedShortId, setSelectedShortId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [activity, setActivity] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const swipeStartY = useRef<number | null>(null);
  const previousOwner = useRef<string | null>(null);

  useEffect(() => {
    const readURL = () => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('view');
      setView(navItems.some(n => n.id === next) || next === 'profile' ? next as View : 'feed');
      setSelectedPostId(params.get('post'));
      setCreatorId(params.get('creator'));
      setSearch(params.get('q') || '');
      setCategory(params.get('category') || 'All');
      setMediaFilter(params.get('media') === 'image' ? 'image' : params.get('media') === 'video' ? 'video' : 'all');
      setSortOrder(params.get('sort') === 'newest' ? 'newest' : params.get('sort') === 'liked' ? 'liked' : 'recommended');
      setProfileTab('Posts');
      const callback = new URLSearchParams(window.location.hash.slice(1));
      if (params.get('auth') !== 'recovery' && (callback.has('error') || callback.has('error_code') || params.has('error'))) {
        setAuthLinkError('Your email confirmation link has expired or is invalid. If you already confirmed your email, sign in. Otherwise, request a fresh confirmation email from the sign-in form.');
      }
    };
    readURL();
    window.addEventListener('popstate', readURL);
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest('input, textarea, select, [role="dialog"]')))) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('popstate', readURL); window.removeEventListener('keydown', keyboard); };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const owner = user ? `${mode}:${user.id}` : null;
    if (previousOwner.current !== owner) {
      setActivity([]); setToast(''); setNotifications(false); setProfileTab('Posts');
      setConversationId(null);
      if (previousOwner.current) {
        // A deliberate preview → sign-in transition opens account access in
        // this render. Preserve it while clearing dialogs owned by a real
        // account when that account signs out or changes.
        if (previousOwner.current.startsWith(`${mode}:`)) setPopup(null);
        else setPopup(current => current === 'auth' ? current : null);
        setSharePost(null);
      }
    }
    previousOwner.current = owner;
  }, [user?.id, mode]);
  useEffect(() => {
    if (social.notice) { setToast(social.notice); social.clearNotice(); }
  }, [social.notice]);
  useEffect(() => {
    if (social.recoveryRequested) { setPopup(null); setSelectedPostId(null); setSharePost(null); setNotifications(false); }
  }, [social.recoveryRequested]);

  function switchCommunityMode(demo: boolean) {
    window.history.pushState({}, '', demo ? '/?demo=1' : '/');
    setView('feed'); setCategory('All'); setMediaFilter('all'); setSortOrder('recommended'); setSearch(''); setCreatorId(null); setBoardId(null);
    setConversationId(null); setSelectedPostId(null); setSharePost(null); setPopup(null); setNotifications(false); setActivity([]);
    social.setDemoMode(demo);
  }
  function notify(message: string) { setToast(message); setActivity(prev => [message, ...prev].slice(0, 8)); }
  function dismissAuthLinkError() {
    setAuthLinkError('');
    const url = new URL(window.location.href);
    for (const key of ['error', 'error_code', 'error_description']) url.searchParams.delete(key);
    const hash = new URLSearchParams(url.hash.slice(1));
    for (const key of ['error', 'error_code', 'error_description']) hash.delete(key);
    url.hash = hash.size ? hash.toString() : '';
    window.history.replaceState({}, '', url);
  }
  function updateSearch(value: string, targetView?: View) {
    const nextView = targetView || (['feed', 'explore'].includes(view) ? view : 'explore');
    setSearch(value); setView(nextView); setCategory('All'); setCreatorId(null); setBoardId(null);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set('q', value); else url.searchParams.delete('q');
    if (nextView === 'feed') url.searchParams.delete('view'); else url.searchParams.set('view', nextView);
    url.searchParams.delete('creator');
    url.searchParams.delete('category');
    window.history.replaceState({}, '', url);
  }
  function updateDiscovery(key: 'category' | 'media' | 'sort', value: string) {
    const url = new URL(window.location.href);
    if (value === 'All' || value === 'all' || value === 'recommended') url.searchParams.delete(key); else url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
    if (key === 'category') setCategory(value);
    if (key === 'media') setMediaFilter(value as 'all' | 'image' | 'video');
    if (key === 'sort') setSortOrder(value as 'recommended' | 'newest' | 'liked');
  }
  async function action(run: () => Promise<unknown>, success?: string) {
    if (!user) { setPopup('auth'); return; }
    try { await run(); if (success) notify(success); } catch (e) { if (e instanceof Error && e.name === 'AbortError') return; setToast(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
  }
  function navigate(next: View) {
    setView(next); setCategory('All'); setMediaFilter('all'); setSortOrder('recommended'); setSearch(''); setBoardId(null); setCreatorId(null); setMobileMenu(false); setNotifications(false); setSelectedPostId(null);
    window.history.pushState({}, '', sitePath(next === 'feed' ? {} : { view: next }, window.location.search));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mainRef.current?.focus({ preventScroll: true });
  }
  function openProfile(id: string) {
    setView('profile'); setCreatorId(id); setProfileTab('Posts'); setSearch(''); setSelectedPostId(null);
    window.history.pushState({}, '', sitePath({ view: 'profile', creator: id }, window.location.search));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openPost(post: Post) { setSelectedPostId(post.id); const url = new URL(window.location.href); url.searchParams.set('post', post.id); window.history.pushState({}, '', url); }
  function closePost() { setSelectedPostId(null); const url = new URL(window.location.href); url.searchParams.delete('post'); window.history.replaceState({}, '', url); }
  function openMessage(id: string) {
    if (!user) { setPopup('auth'); return; }
    navigate('messages'); setConversationId(id);
    void social.markConversationRead(id).catch(() => {});
  }
  const findCreator = (id: string) => creators.find(c => c.id === id) || (user?.id === id ? user : undefined);
  const selectedPost = posts.find(p => p.id === selectedPostId);
  const unread = conversations.reduce((count, c) => count + c.unread, 0);
  const unreadActivity = communityActivity.filter(item => !item.read).length;
  const categories = ['All', ...Array.from(new Set(posts.map(p => p.category)))];
  const query = search.trim();
  const filtered = posts.filter(p => (category === 'All' || p.category === category) && (mediaFilter === 'all' || p.mediaType === mediaFilter) && matchesPost(p, findCreator(p.creatorId), query));
  if (sortOrder === 'newest') filtered.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  if (sortOrder === 'liked') filtered.sort((a, b) => b.likes - a.likes || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const matchingCreators = query ? creators.filter(person => matchesCreator(person, query)) : creators.filter(person => person.id !== user?.id);
  const shorts = useMemo(() => posts.filter(p => p.mediaType === 'video'), [posts]);
  const short = shorts.find(post => post.id === selectedShortId) || shorts[0];
  const shortIndex = Math.max(0, shorts.findIndex(post => post.id === short?.id));
  useEffect(() => {
    if (!shorts.some(post => post.id === selectedShortId)) setSelectedShortId(shorts[0]?.id || null);
  }, [shorts, selectedShortId]);
  function stepShort(direction: number) {
    setSelectedShortId(current => {
      const index = Math.max(0, shorts.findIndex(post => post.id === current));
      return shorts[(index + direction + shorts.length) % shorts.length]?.id || null;
    });
  }
  useEffect(() => {
    if (view !== 'shorts' || !shorts.length || popup || selectedPostId || sharePost || social.recoveryRequested) return;
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, video'))) return;
      if (['ArrowDown', 'ArrowRight'].includes(event.key)) {
        event.preventDefault(); stepShort(1);
      } else if (['ArrowUp', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault(); stepShort(-1);
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [view, shorts, popup, selectedPostId, sharePost, social.recoveryRequested]);

  const featured = posts.find(p => p.id === 'coast-escape') || shorts[0] || posts[0];
  const activeBoard = boards.find(b => b.id === boardId);
  const profile = creatorId ? findCreator(creatorId) : user;
  const isOwnProfile = !!profile && user?.id === profile.id;
  const profilePosts = profile ? profileTab === 'Saved' && isOwnProfile ? posts.filter(p => savedIds.includes(p.id)) : profileTab === 'Reposts' ? posts.filter(p => (isOwnProfile ? repostedIds : social.publicReposts[profile.id] || []).includes(p.id)) : posts.filter(p => p.creatorId === profile.id) : [];
  const showProductPreview = mode === 'live' && social.authReady && !social.hasSession && view === 'feed' && !query && category === 'All' && mediaFilter === 'all' && sortOrder === 'recommended';

  const feedActions = { onOpen: openPost, onProfile: openProfile, onShare: setSharePost, action, onExplore: () => navigate('feed') };

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {mobileMenu && <button className="sidebar-scrim" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
      <button className="brand" onClick={() => navigate('feed')} aria-label="TurboWatch home"><BrandMark /></button>
      <span className="nav-label">YOUR CURIOSITY, COLLECTED</span>
      <nav aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => navigate(id)} aria-current={view === id ? 'page' : undefined}><Icon size={20} fill={view === id && id === 'feed' ? 'currentColor' : 'none'} strokeWidth={1.8} /><span>{label}</span>{id === 'messages' && unread > 0 && <span className="unread-badge">{unread}</span>}{id === 'feed' && <span className="active-dot" />}</button>)}</nav>
      <div className="sidebar-divider" />
      <div className="nav-label nav-label-row">YOUR SPACE<button aria-label="New collection" onClick={() => user ? setPopup('board') : setPopup('auth')}><Plus size={15} /></button></div>
      <button className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => { navigate('profile'); setProfileTab('Posts'); }}><UserRound size={20} strokeWidth={1.8} /><span>My profile</span></button>
      {boards.slice(0, 3).map((board, i) => <button className="sidebar-board" key={board.id} onClick={() => { navigate('boards'); setBoardId(board.id); }}><span className={`board-dot dot-${i}`} /><span>{board.name}</span><span>{board.postIds.length}</span></button>)}
      <div className="sidebar-inspiration"><Sparkles size={21} /><p>Good things happen<br />when you get curious.</p><button onClick={() => navigate('explore')}>Find your inspiration <ArrowUpRight size={15} /></button><span className="inspiration-ring" /></div>
      <div className="sidebar-bottom"><button className="account-button" onClick={() => user ? navigate('profile') : setPopup('auth')}><Avatar person={user} /><span><strong>{user?.name || 'Join the community'}</strong><small>{mode === 'demo' ? 'Local demo · Explore freely' : user ? `@${user.username}` : 'Sign in or create an account'}</small></span><MoreHorizontal size={18} /></button></div>
    </aside>

    <div className="workspace">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-toggle" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={23} /></button><span className="breadcrumb">Discover <ChevronRight size={13} /><strong>{view === 'feed' ? 'For you' : view === 'boards' ? 'Collections' : navItems.find(n => n.id === view)?.label || 'My profile'}</strong></span></div><div className="search-field"><Search size={18} /><input ref={searchRef} aria-label="Search TurboWatch" placeholder="Search posts, people, @names, #tags" value={search} onChange={e => updateSearch(e.target.value)} />{search ? <button aria-label="Clear search" onClick={() => updateSearch('')}><X size={15} /></button> : <kbd>/</kbd>}</div><div className="topbar-actions">{mode === 'demo' && <button className="demo-switch active" aria-label="Exit demo" onClick={() => switchCommunityMode(false)}><ArrowRight size={13} /><span>Exit demo</span></button>}{mode === 'live' && social.authReady && !social.hasSession && <button className="secondary-button sign-in-button" onClick={() => setPopup('auth')}>Sign in</button>}<div className="activity-wrapper"><button className={`icon-button notification-button ${notifications ? 'selected' : ''}`} aria-label="Activity" onClick={() => { const opening = !notifications; setNotifications(opening); if (opening) social.markNotificationsRead(); }} aria-expanded={notifications}><Bell size={20} />{unreadActivity > 0 && <span />}</button>{notifications && <div className="activity-panel"><div className="activity-heading"><strong>Your activity</strong><button className="icon-button" aria-label="Close activity" onClick={() => setNotifications(false)}><X size={16} /></button></div>{communityActivity.length ? communityActivity.slice(0, 20).map(item => <button className="activity-item activity-notification" key={item.id} onClick={() => { setNotifications(false); const post = posts.find(post => post.id === item.postId); if (post) openPost(post); else openProfile(item.creatorId); }}><Avatar person={findCreator(item.creatorId)} size="small" /><p><strong>{findCreator(item.creatorId)?.name || 'A creator'}</strong> {item.text}<time>{new Date(item.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</time></p></button>) : <p className="activity-empty">You’re all caught up. Likes, comments, reposts, and new followers will appear here.</p>}{activity.length > 0 && <><small>Your recent activity</small>{activity.slice(0, 4).map((text, index) => <div className="activity-item" key={`${text}-${index}`}><span><Check size={14} /></span><p>{text}</p></div>)}</>}<small>{mode === 'demo' ? 'Fictional demo community · saved in this browser' : 'Updates from your community'}</small></div>}</div><button className="primary-button create-button" aria-label="Create" onClick={() => user ? setPopup('create') : setPopup('auth')}><Plus size={18} /><span>Create</span></button>{mode === 'live' && social.hasSession ? <AccountMenu onProfile={() => navigate('profile')} onSignedOut={() => { navigate('feed'); setToast('You’re signed out.'); }} /> : mode === 'demo' ? <Avatar person={user} size="topbar-avatar" onClick={() => navigate('profile')} /> : !social.authReady ? <span className="account-session-status" role="status">Checking account…</span> : null}</div></header>

      <main id="main-content" className={`main-content view-${view}`} tabIndex={-1} ref={mainRef}>
        {authLinkError && <div className="error-banner" role="alert"><div className="error-content"><p>{authLinkError}</p></div><div className="error-actions"><button className="retry-button" onClick={() => { if (mode === 'demo') switchCommunityMode(false); setPopup('auth'); }}>Sign in</button><button aria-label="Dismiss confirmation error" onClick={dismissAuthLinkError}><X size={17} /></button></div></div>}
        {error && <div className="error-banner" role="alert"><div className="error-content"><p>{error}</p>{mode === 'live' && <a href="https://github.com/TurboTwitch0/TurboWatch/blob/main/supabase/SETUP.md" target="_blank" rel="noopener noreferrer">Database setup instructions <ArrowUpRight size={13} /></a>}</div><div className="error-actions"><button className="retry-button" onClick={() => void social.refreshCommunity().catch(() => {})}>Try again</button><button aria-label="Dismiss error" onClick={social.clearError}><X size={17} /></button></div></div>}
        {mode === 'demo' && <div className="welcome-banner demo-welcome"><span><Sparkles size={15} />Sample preview · Alex Carter is fictional. To publish to everyone, sign in to your own account.</span><button onClick={() => { switchCommunityMode(false); setPopup('auth'); }}>Sign in to real account <ArrowRight size={15} /></button></div>}
        {mode === 'live' && social.backendConfigured && !user && !showProductPreview && <div className="welcome-banner"><span>Find your people. Share your perspective.</span><button onClick={() => setPopup('auth')}>Join TurboWatch <ArrowRight size={15} /></button></div>}

        {(view === 'feed' || view === 'explore') && <>
          {showProductPreview && <ProductPreview posts={posts} onJoin={() => setPopup('auth')} onPreview={() => switchCommunityMode(true)} onOpenPost={openPost} primaryLabel="Sign in to share" />}
          {!showProductPreview && <section className="page-intro"><div><p className="eyebrow"><span />{view === 'feed' ? 'ALGORITHMS MEET HAPPY ACCIDENTS' : 'FOLLOW YOUR CURIOSITY'}</p><h1>{search ? <>Results for <em>“{search}”</em></> : view === 'feed' ? <>Stay curious<span className="coral-text">.</span></> : <>There’s a whole world<br className="desktop-break" /> out there<span className="coral-text">.</span></>}</h1><p className="intro-description">{search ? `${filtered.length} ${filtered.length === 1 ? 'post' : 'posts'} · ${matchingCreators.length} ${matchingCreators.length === 1 ? 'person' : 'people'}` : view === 'feed' ? 'Things you love. People you haven’t met. Ideas worth keeping.' : 'Fresh perspectives, unexpected finds, and your next favorite creator.'}</p></div><div className="intro-side"><span className="little-orbit"><Sparkles size={17} /></span><span>A little scrolling.<br /><strong>A lot of possibility.</strong></span></div></section>}

          {!showProductPreview && !search && category === 'All' && mediaFilter === 'all' && sortOrder === 'recommended' && view === 'feed' && featured && <section className="hero-grid" aria-label="Featured discoveries"><button className="hero-feature" onClick={() => openPost(featured)}><PostCover post={featured} eager /><div className="hero-shade" /><span className="hero-kicker"><span className="live-dot" />{featured.id === 'coast-escape' ? 'THE GREAT OUT THERE' : featured.category.toUpperCase()}</span><span className="hero-feature-content"><span className="feature-label">A DIFFERENT POINT OF VIEW</span><strong>{featured.id === 'coast-escape' ? <>Take the<br />scenic route.</> : featured.title}</strong><span className="hero-description">A little further from ordinary.</span><span className="watch-link"><span><Play size={13} fill="currentColor" /></span>{featured.mediaType === 'video' ? 'Watch the story' : 'Explore the story'} <ArrowUpRight size={16} /></span></span><span className="hero-duration">{featured.duration || 'Explore'}</span><span className="hero-index">FEATURED</span></button><div className="hero-collect"><span className="collect-kicker"><Bookmark size={14} /> GOOD FINDS, ALL IN ONE PLACE</span><div className="collection-stack">{posts.slice(2, 5).map((p, i) => <button key={p.id} className={`stack-image stack-${i}`} onClick={() => openPost(p)} aria-label={`Explore ${p.title}`}><PostCover post={p} /></button>)}<span className="stack-sticker"><Sparkles size={14} />keep it.</span></div><div className="hero-collect-bottom"><h2>Find it. Love it.<br />Make it a collection.</h2><button className="round-arrow" aria-label="Explore collections" onClick={() => navigate('boards')}><ArrowUpRight size={23} /></button></div><p>Your taste, a little more organized.</p></div></section>}

          {((view === 'explore' && !query) || (query && matchingCreators.length > 0)) && <section className="creator-discovery" aria-label={query ? 'People search results' : 'Discover people'}><div className="section-heading"><h2>{query ? 'People' : 'People with a point of view'}</h2><span>Go on, find your people <Users size={16} /></span></div><div className="creator-strip">{matchingCreators.map(person => <div className="creator-chip" key={person.id}><Avatar person={person} size="medium" onClick={() => openProfile(person.id)} /><button className="creator-name" onClick={() => openProfile(person.id)}><strong>{person.name}</strong><small>@{person.username}</small></button>{person.id !== user?.id && <button className={`follow-mini ${followingIds.includes(person.id) ? 'following' : ''}`} aria-label={`${followingIds.includes(person.id) ? 'Unfollow' : 'Follow'} ${person.name}`} onClick={() => void action(() => social.toggleFollow(person.id), followingIds.includes(person.id) ? `Unfollowed ${person.name}` : `Following ${person.name}`)}>{followingIds.includes(person.id) ? <Check size={16} /> : <Plus size={16} />}</button>}</div>)}</div></section>}
          <section className="feed-section" aria-label="Discovery feed"><div className="section-heading"><h2>{search ? 'Worth a closer look' : view === 'feed' ? 'A feed that gets you' : 'The inspiration is endless'}<span className="heading-dot">✦</span></h2><div className="feed-view-control"><span>{search ? `${filtered.length} results` : 'A little bit of everything'}</span><span className="icon-button selected" aria-label="Grid view"><Grid2X2 size={15} /></span><button className="icon-button" aria-label="Watch shorts" onClick={() => navigate('shorts')}><Clapperboard size={16} /></button></div></div><div className="discovery-controls"><div className="media-filter" role="group" aria-label="Post format">{([{ value: 'all', label: 'All posts', icon: Grid2X2 }, { value: 'image', label: 'Photos', icon: ImageIcon }, { value: 'video', label: 'Videos', icon: Clapperboard }] as const).map(({ value, label, icon: Icon }) => <button key={value} aria-pressed={mediaFilter === value} onClick={() => updateDiscovery('media', value)}><Icon size={16} />{label}</button>)}</div><label className="discovery-sort"><span>Sort by</span><select aria-label="Sort posts" value={sortOrder} onChange={event => updateDiscovery('sort', event.target.value)}><option value="recommended">Recommended</option><option value="newest">Newest</option><option value="liked">Most liked</option></select></label></div><div className="category-row" aria-label="Filter by category">{categories.map((cat, i) => <button key={cat} className={`category-pill ${category === cat ? 'active' : ''}`} aria-pressed={category === cat} onClick={() => updateDiscovery('category', cat)}>{i === 0 && <Sparkles size={13} />}{cat === 'All' ? 'For you' : cat}</button>)}<span className="category-tail">Just good stuff <ArrowDown size={12} /></span></div>{loading ? <div className="loading-state" role="status" aria-live="polite"><span className="loading-orbit" aria-hidden="true" /><span>Finding your next favorite…</span></div> : !posts.length && !query && mode === 'live' ? <Empty icon={<Users />} title={social.backendConfigured ? 'Your community starts here.' : 'Connect your community.'} description={social.backendConfigured ? 'Create your own account and publish the first post. Everyone who visits this site can discover it.' : 'Real accounts need the Supabase setup. No sample account has been signed in.'} action={<button className="primary-button" onClick={() => setPopup(user ? 'create' : 'auth')}>{social.backendConfigured ? user ? 'Publish your first post' : 'Create an account' : 'Account setup'}<ArrowRight size={16} /></button>} /> : <FeedGrid {...feedActions} items={filtered} emptyTitle={query && matchingCreators.length ? 'No matching posts yet.' : undefined} />}</section>
          <div className="feed-end"><span>✦</span><p>You’re right where the good stuff happens.</p><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top <ArrowUp size={14} /></button></div>
        </>}

        {view === 'shorts' && <><section className="page-intro compact"><div><p className="eyebrow"><span />SMALL STORIES. BIG ENERGY.</p><h1>A moment of <em>escape.</em></h1><p className="intro-description">One more? We get it. Make a little room for discovery.</p></div><span className="outline-tag"><Clapperboard size={15} /> SHORTS</span></section>{short ? <section className="shorts-stage"><div className="shorts-context"><span className="eyebrow">ON YOUR WATCHLIST</span><h2>{short.title}</h2><p>{short.description}</p><button className="creator-inline" onClick={() => openProfile(short.creatorId)}><Avatar person={findCreator(short.creatorId)} /><span><strong>{findCreator(short.creatorId)?.name}</strong><small>@{findCreator(short.creatorId)?.username}</small></span><ArrowUpRight size={16} /></button><div className="short-tags">{short.tags.map(t => <span key={t}>#{t}</span>)}</div><span className="shorts-counter">{String(shortIndex % shorts.length + 1).padStart(2, '0')} <span>/ {String(shorts.length).padStart(2, '0')}</span></span></div><div className="short-player" onTouchStart={event => { swipeStartY.current = event.touches[0]?.clientY ?? null; }} onTouchEnd={event => { const start = swipeStartY.current; swipeStartY.current = null; const end = event.changedTouches[0]?.clientY; if (start !== null && end !== undefined && Math.abs(start - end) > 55) stepShort(start > end ? 1 : -1); }}><video key={short.id} src={short.mediaUrl} poster={short.thumbnail} controls playsInline autoPlay loop muted={muted} aria-label={short.title} /><div className="short-player-top"><span><Zap size={15} fill="currentColor" /> turboshorts</span><button aria-label={muted ? 'Unmute video' : 'Mute video'} className="glass-button" onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button></div></div><div className="short-actions"><ActionRound label={likedIds.includes(short.id) ? 'Unlike video' : 'Like video'} active={likedIds.includes(short.id)} icon={<Heart fill={likedIds.includes(short.id) ? 'currentColor' : 'none'} />} text={number(short.likes)} onClick={() => void action(() => social.toggleLike(short.id))} /><ActionRound label="Comment on video" icon={<MessageCircle />} text="Discuss" onClick={() => openPost(short)} /><ActionRound label="Repost video" active={repostedIds.includes(short.id)} icon={<Repeat2 />} text="Repost" onClick={() => void action(() => social.toggleRepost(short.id), repostedIds.includes(short.id) ? 'Repost removed' : 'Reposted to your profile')} /><ActionRound label="Share video" icon={<ArrowUpRight />} text="Share" onClick={() => setSharePost(short)} /><div className="short-navigation" title="Swipe up or down, or use the arrow keys"><button className="icon-button" aria-label="Previous short" onClick={() => stepShort(-1)}><ArrowUp size={19} /></button><button className="icon-button" aria-label="Next short" onClick={() => stepShort(1)}><ArrowDown size={19} /></button><span className="shorts-hint">Swipe or use ↑ ↓</span></div></div></section> : <Empty icon={<Clapperboard />} title="Your next story starts here." description="Share the first video and give this space some energy." action={<button className="primary-button" onClick={() => setPopup(user ? 'create' : 'auth')}>Create a video <Plus size={16} /></button>} />}</>}

        {view === 'boards' && <><section className="page-intro"><div><p className="eyebrow"><span />SAVE A LITTLE INSPIRATION</p><h1>{activeBoard ? activeBoard.name : <>Your kind of <em>collection.</em></>}</h1><p className="intro-description">{activeBoard ? `${activeBoard.postIds.length} finds worth coming back to.` : 'All the things that made you stop scrolling. A little world of your own.'}</p></div><button className="primary-button" onClick={() => setPopup(user ? 'board' : 'auth')}><Plus size={17} />New collection</button></section>{activeBoard ? <><button className="text-button back-button" onClick={() => setBoardId(null)}><ArrowLeft size={16} />All collections</button><FeedGrid {...feedActions} items={posts.filter(p => activeBoard.postIds.includes(p.id))} emptyTitle="Room for a little inspiration." emptyDescription="Open a post and choose this collection to start filling it." /></> : boards.length ? <div className="boards-grid">{boards.map((b, i) => <button className={`board-card board-color-${i % 3}`} key={b.id} onClick={() => setBoardId(b.id)}><div className="board-collage">{b.postIds.slice(0, 3).map(id => { const p = posts.find(post => post.id === id); return p && <img key={id} src={p.thumbnail || p.mediaUrl} alt="" />; })}{!b.postIds.length && <span className="board-empty-art"><Bookmark size={42} strokeWidth={1} /><span>Your next good find<br />belongs here.</span></span>}<span className="board-arrow"><ArrowUpRight size={21} /></span></div><div className="board-info"><h2>{b.name}</h2><span>{b.postIds.length} {b.postIds.length === 1 ? 'save' : 'saves'}</span></div><p>{b.description || 'A collection of things you love.'}</p></button>)}<button className="new-board-card" onClick={() => setPopup(user ? 'board' : 'auth')}><span><Plus size={25} /></span><strong>A fresh collection</strong><small>Give your next obsession a home.</small></button></div> : <Empty icon={<Bookmark />} title="Good finds deserve a home." description="Create your first collection and start saving what inspires you." action={<button className="primary-button" onClick={() => setPopup(user ? 'board' : 'auth')}><Plus size={16} />Create a collection</button>} />}</>}

        {view === 'profile' && <>{profile ? <><section className="profile-cover"><div className="cover-shapes"><span /><span /><span /></div><span>ONE OF A KIND. ALL YOURS.</span><Sparkles size={38} strokeWidth={1} /></section><section className="profile-info"><Avatar person={profile} size="profile-avatar" /><div className="profile-main"><div className="profile-title"><h1>{profile.name}</h1>{profile.verified && <span className="verified large"><Check size={12} strokeWidth={3} /></span>}</div><p className="profile-handle">@{profile.username}</p><p className="profile-bio">{profile.bio || 'Collecting moments. Finding the good stuff.'}</p><div className="profile-stats"><span><strong>{posts.filter(p => p.creatorId === profile.id).length}</strong> posts</span><span><strong>{number(profile.followers || 0)}</strong> followers</span>{isOwnProfile && <span><strong>{followingIds.length}</strong> following</span>}</div></div><div className="profile-buttons">{isOwnProfile ? <><button className="secondary-button" onClick={() => setPopup('edit')}><Settings2 size={15} />Edit profile</button>{mode === 'live' && <button className="icon-button" aria-label="Sign out" onClick={() => void action(async () => { await social.signOut(); navigate('feed'); })}><LogOut size={19} /></button>}</> : <><button className={followingIds.includes(profile.id) ? 'secondary-button' : 'primary-button'} onClick={() => void action(() => social.toggleFollow(profile.id))}>{followingIds.includes(profile.id) ? <><Check size={16} />Following</> : <><Plus size={16} />Follow</>}</button><button className="secondary-button" onClick={() => openMessage(profile.id)}><MessageCircle size={16} />Message</button></>}</div></section><div className="profile-tabs" role="tablist" aria-label="Profile content">{(isOwnProfile ? ['Posts', 'Saved', 'Reposts'] : ['Posts', 'Reposts']).map(tab => <button role="tab" aria-selected={profileTab === tab} key={tab} className={profileTab === tab ? 'active' : ''} onClick={() => setProfileTab(tab)}>{tab === 'Posts' ? <Grid2X2 size={16} /> : tab === 'Saved' ? <Bookmark size={16} /> : <Repeat2 size={16} />}{tab}</button>)}</div><FeedGrid {...feedActions} items={profilePosts} emptyTitle={isOwnProfile ? 'Your perspective belongs here.' : 'The story is just getting started.'} emptyDescription={isOwnProfile ? 'Create a post or save a little inspiration to make this space yours.' : 'Follow this creator and check back for their first post.'} /></> : <Empty icon={<UserRound />} title="Make a little space for you." description="Create your account to share your perspective and find your people." action={<button className="primary-button" onClick={() => setPopup('auth')}>Get started <ArrowRight size={16} /></button>} />}</>}

        {view === 'messages' && <><section className="page-intro compact"><div><p className="eyebrow"><span />GOOD CONVERSATIONS START HERE</p><h1>Keep in <em>touch.</em></h1><p className="intro-description">Send a hello. Share an idea. Find your people.</p></div><span className="outline-tag"><MessageCircle size={15} />YOUR INBOX</span></section>{user ? <MessagesPanel activeId={conversationId} setActiveId={id => { setConversationId(id); void social.markConversationRead(id).catch(() => {}); }} openProfile={openProfile} toast={setToast} /> : <Empty icon={<MessageCircle />} title="There’s a conversation waiting." description="Sign in to send private messages to other creators." action={<button className="primary-button" onClick={() => setPopup('auth')}>Sign in <ArrowRight size={16} /></button>} />}</>}

        <footer className="page-footer"><BrandMark className="footer-lockup" /><p>Keep the good stuff.</p><a className="media-credits-link" href="/media/SOURCES.md" target="_blank" rel="noopener noreferrer">Media credits</a><span className="demo-indicator"><span />{mode === 'demo' ? 'Demo · saved in this browser' : !social.backendConfigured ? 'Community · setup required' : social.syncStatus === 'offline' ? 'Community · reconnecting' : social.syncStatus === 'connecting' ? 'Community · connecting' : 'Community · connected'}</span></footer>
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{navItems.slice(0, 5).map(({ id, icon: Icon, label }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)} aria-label={label}><Icon size={21} /><span>{label === 'Collections' ? 'Saved' : label}</span></button>)}</nav>
    {popup === 'create' && <CreateDialog onClose={() => setPopup(null)} onCreated={post => { setPopup(null); notify('Your post is published'); openPost(post); }} />}
    {popup === 'edit' && <EditProfileDialog onClose={() => setPopup(null)} />}
    {popup === 'auth' && !social.recoveryRequested && <AuthDialog initialTab={authTab} onClose={() => { setPopup(null); setAuthTab('signin'); }} />}
    {popup === 'board' && <NewBoardDialog onClose={() => setPopup(null)} />}
    {selectedPost && <PostDetail key={selectedPost.id} post={selectedPost} onClose={closePost} onShare={() => setSharePost(selectedPost)} openProfile={openProfile} requireAuth={() => setPopup('auth')} onTag={tag => { closePost(); navigate('explore'); updateSearch(`#${tag}`, 'explore'); }} action={action} />}
    {selectedPostId && !selectedPost && !loading && !popup && !sharePost && <Dialog title="This find is unavailable" onClose={closePost}><div className="empty-state"><Compass /><h2>This story isn’t here yet.</h2><p>{mode === 'demo' ? 'Demo posts and uploads are saved in the browser where they were created. Shared demo links only open seeded content elsewhere.' : 'This post may have been removed or is no longer available.'}</p><button className="primary-button" onClick={closePost}>Back to exploring</button></div></Dialog>}
    {sharePost && <ShareDialog post={sharePost} onClose={() => setSharePost(null)} />}
    {social.recoveryRequested && <PasswordRecoveryDialog onClose={social.cancelRecovery} onRequestReset={() => { social.cancelRecovery(); setAuthTab('reset'); setPopup('auth'); }} />}
    {toast && <div className="toast" role="status"><span><Check size={16} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
  </div>;
}

function Empty({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) { return <div className="empty-state"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{description}</p>{action}</div>; }
function ActionRound({ icon, label, text, active, onClick }: { icon: ReactNode; label: string; text: string; active?: boolean; onClick: () => void }) { return <div className="round-action"><button aria-label={label} aria-pressed={active} className={active ? 'active' : ''} onClick={onClick}>{icon}</button><span>{text}</span></div>; }

function PostDetail({ post, onClose, onShare, openProfile, requireAuth, onTag, action }: { post: Post; onClose: () => void; onShare: () => void; openProfile: (id: string) => void; requireAuth: () => void; onTag: (tag: string) => void; action: (run: () => Promise<unknown>, success?: string) => Promise<void> }) {
  const social = useSocial();
  const { user, creators, likedIds, savedIds, repostedIds, boards } = social;
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [boardMenu, setBoardMenu] = useState(false);
  useEffect(() => { setComment(''); setCommentError(''); setBoardMenu(false); }, [user?.id]);
  const person = creators.find(c => c.id === post.creatorId) || (user?.id === post.creatorId ? user : undefined);
  const comments = social.comments.filter(c => c.postId === post.id);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!user) { requireAuth(); return; } if (!comment.trim() || sending) return;
    setSending(true); setCommentError('');
    try { await social.addComment(post.id, comment.trim()); setComment(''); } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) setCommentError(e instanceof Error ? e.message : 'Could not post comment.'); } finally { setSending(false); }
  }
  return <Dialog title={post.title} onClose={onClose} className="post-dialog"><div className="post-detail-layout"><div className="detail-media">{post.mediaType === 'video' ? <video src={post.mediaUrl} poster={post.thumbnail} controls playsInline autoPlay aria-label={post.title} /> : <img src={post.mediaUrl} alt={post.title} />}</div><div className="detail-panel"><div className="detail-creator"><Avatar person={person} onClick={() => { onClose(); openProfile(post.creatorId); }} /><button onClick={() => { onClose(); openProfile(post.creatorId); }}><strong>{person?.name || 'A creator'}</strong><small>@{person?.username || 'creator'}</small></button>{person?.id !== user?.id && <button className="text-button coral-text" onClick={() => void action(() => social.toggleFollow(post.creatorId))}>{social.followingIds.includes(post.creatorId) ? 'Following' : 'Follow'}</button>}</div><h2>{post.title}</h2><p className="detail-description">{post.description}</p><div className="detail-tags">{post.tags.map(t => <button key={t} onClick={() => onTag(t)}>#{t}</button>)}</div><div className="detail-stats">{number(post.views)} views<span>·</span>{new Date(post.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</div><div className="detail-comments"><h3>The conversation <span>{comments.length}</span></h3>{comments.length ? comments.map(c => { const creator = creators.find(u => u.id === c.creatorId) || (user?.id === c.creatorId ? user : undefined); return <div className="comment" key={c.id}><Avatar person={creator} size="small" /><div><strong>{creator?.name || 'Community member'}<time>{date(c.createdAt)}</time></strong><p>{c.text}</p></div></div>; }) : <p className="no-comments">A fresh perspective starts a good conversation. Leave the first comment.</p>}</div><div className="detail-actions"><button className={likedIds.includes(post.id) ? 'liked' : ''} aria-label={likedIds.includes(post.id) ? 'Unlike post' : 'Like post'} aria-pressed={likedIds.includes(post.id)} onClick={() => void action(() => social.toggleLike(post.id))}><Heart size={22} fill={likedIds.includes(post.id) ? 'currentColor' : 'none'} /><span>{number(post.likes)}</span></button><button className={repostedIds.includes(post.id) ? 'coral-text' : ''} aria-label="Repost post" aria-pressed={repostedIds.includes(post.id)} onClick={() => void action(() => social.toggleRepost(post.id), repostedIds.includes(post.id) ? 'Repost removed' : 'Reposted to your profile')}><Repeat2 size={22} /></button><button aria-label="Share post" onClick={onShare}><ArrowUpRight size={23} /></button><div className="detail-save"><button className={savedIds.includes(post.id) ? 'coral-text' : ''} aria-label={savedIds.includes(post.id) ? 'Unsave post' : 'Save post'} aria-pressed={savedIds.includes(post.id)} onClick={() => void action(() => social.toggleSave(post.id), savedIds.includes(post.id) ? 'Removed from saved' : 'Saved to your collection')}><Bookmark size={22} fill={savedIds.includes(post.id) ? 'currentColor' : 'none'} /></button><button aria-label="Choose collection" onClick={() => user ? setBoardMenu(!boardMenu) : requireAuth()}><ChevronDown size={16} /></button>{boardMenu && <div className="save-board-menu"><strong>Save to collection</strong>{boards.length ? boards.map(b => <button key={b.id} onClick={() => { void action(() => social.saveToBoard(post.id, b.id), `Saved to ${b.name}`); setBoardMenu(false); }}><Bookmark size={14} />{b.name}{b.postIds.includes(post.id) && <Check size={14} />}</button>) : <p>Create a collection from your sidebar first.</p>}</div>}</div></div><form className="comment-form" onSubmit={submit}><Avatar person={user} size="small" /><input aria-label="Write a comment" placeholder="Add your perspective…" value={comment} maxLength={2000} onChange={e => setComment(e.target.value)} /><button type="submit" disabled={!comment.trim() || sending} aria-label="Post comment"><Send size={18} /></button></form>{commentError && <p role="alert" className="form-error">{commentError}</p>}</div></div></Dialog>;
}

function MessagesPanel({ activeId, setActiveId, openProfile, toast }: { activeId: string | null; setActiveId: (id: string) => void; openProfile: (id: string) => void; toast: (s: string) => void }) {
  const { user, creators, conversations, sendMessage, markConversationRead, mode, loading } = useSocial();
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [defaultPeer, setDefaultPeer] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const previousPeer = useRef<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef('');
  const chosenId = activeId === '' ? undefined : activeId || defaultPeer || conversations[0]?.creatorId;
  const draft = chosenId ? drafts[chosenId] || '' : '';
  function setDraft(value: string) { if (chosenId) setDrafts(previous => ({ ...previous, [chosenId]: value })); }
  useEffect(() => { if (!loading && activeId === null && !defaultPeer && conversations[0]) setDefaultPeer(conversations[0].creatorId); }, [activeId, defaultPeer, conversations, loading]);
  const person = creators.find(c => c.id === chosenId);
  const conversation = conversations.find(c => c.creatorId === chosenId);
  const candidates = search ? creators.filter(c => c.id !== user?.id && `${c.name} ${c.username}`.toLowerCase().includes(search.toLowerCase())) : conversations.map(c => creators.find(p => p.id === c.creatorId)).filter((c): c is Creator => !!c);
  useEffect(() => {
    if (previousPeer.current !== chosenId) { followLatest.current = true; previousPeer.current = chosenId; }
    const history = historyRef.current;
    if (history && (followLatest.current || conversation?.messages.at(-1)?.senderId === user?.id)) history.scrollTop = history.scrollHeight;
  }, [conversation?.messages.length, chosenId, user?.id]);
  useEffect(() => {
    const visible = activeId || window.matchMedia('(min-width: 601px)').matches;
    const signature = `${chosenId}:${conversation?.messages.at(-1)?.id}`;
    if (!loading && visible && chosenId && conversation?.unread && markedRef.current !== signature) {
      markedRef.current = signature;
      void markConversationRead(chosenId).catch(() => {});
    }
  }, [chosenId, activeId, conversation?.unread, conversation?.messages.length, markConversationRead, loading]);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!draft.trim() || !chosenId || sending) return;
    setSending(true); try { await sendMessage(chosenId, draft.trim()); setDraft(''); } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) toast(e instanceof Error ? e.message : 'Could not send message.'); } finally { setSending(false); }
  }
  return <section className={`messages-layout ${person && activeId ? 'has-conversation' : ''}`}><aside className="conversation-list"><div className="inbox-heading"><h2>Messages <span>{conversations.length}</span></h2><button className="icon-button" aria-label="New message" onClick={() => document.getElementById('people-search')?.focus()}><Plus size={19} /></button></div><div className="people-search"><Search size={16} /><input id="people-search" aria-label="Find a person to message" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find your people" /></div><div className="conversation-items">{candidates.length ? candidates.map(c => { const conv = conversations.find(item => item.creatorId === c.id), last = conv?.messages.at(-1); return <button className={`conversation-item ${chosenId === c.id ? 'active' : ''}`} key={c.id} onClick={() => { setActiveId(c.id); setSearch(''); }}><Avatar person={c} /><span><strong>{c.name}<time>{last ? date(last.createdAt) : ''}</time></strong><small>{last ? `${last.senderId === user?.id ? 'You: ' : ''}${last.text}` : `Say hello to @${c.username}`}</small></span>{!!conv?.unread && <i>{conv.unread}</i>}</button>; }) : <p className="inbox-empty">{search ? 'No people found. Try another name.' : 'Search for a creator to start a conversation.'}</p>}</div><div className="inbox-note"><MessageCircle size={15} /><span>{mode === 'demo' ? 'Demo conversations stay in this browser.' : 'Only you and the recipient can read your messages.'}</span></div></aside><div className="message-thread">{person ? <><div className="thread-header"><button className="icon-button thread-back" aria-label="Back to conversations" onClick={() => setActiveId('')}><ChevronLeft size={20} /></button><Avatar person={person} onClick={() => openProfile(person.id)} /><button onClick={() => openProfile(person.id)}><strong>{person.name}</strong><small>@{person.username}</small></button><button className="icon-button" onClick={() => openProfile(person.id)} aria-label="View message recipient profile"><UserRound size={18} /></button></div><div className="message-history" ref={historyRef} onScroll={() => { const history = historyRef.current; if (history) followLatest.current = history.scrollHeight - history.scrollTop - history.clientHeight < 60; }}><div className="conversation-start"><Avatar person={person} size="medium" /><strong>{person.name}</strong><span>{mode === 'demo' ? 'A fictional conversation to try the experience.' : 'A good conversation can start with a hello.'}</span></div>{conversation?.messages.map(m => <div className={`message-bubble ${m.senderId === user?.id ? 'outgoing' : 'incoming'}`} key={m.id}><p>{m.text}</p><time>{date(m.createdAt)}</time></div>)}<div ref={bottomRef} /></div><form className="message-form" onSubmit={submit}><input aria-label="Your message" placeholder={`Message ${person.name.split(' ')[0]}…`} value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)} /><button className="primary-button" type="submit" disabled={!draft.trim() || sending} aria-label="Send message"><Send size={17} /></button></form></> : <Empty icon={<MessageCircle />} title="A good place to say hello." description="Choose a conversation or search for someone new." />}</div></section>;
}
