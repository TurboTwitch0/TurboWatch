'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bell, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Compass, Grid2X2, Heart, Home, Image as ImageIcon, Link as LinkIcon, LogOut, Menu, MessageCircle, MoreHorizontal, Play, Plus, Repeat2, Search, Send, Settings2, Sparkles, Users, UserRound, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { useSocial } from '@/lib/store';
import type { Board, Creator, Post } from '@/lib/model';
import { AuthDialog, CreateDialog, Dialog, EditProfileDialog, NewBoardDialog, ShareDialog } from '@/components/Dialogs';

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

function Avatar({ person, size = '', onClick }: { person?: Creator | null; size?: string; onClick?: () => void }) {
  const initials = (person?.name || 'Your profile').split(' ').map(s => s[0]).slice(0, 2).join('');
  const content = person?.avatar ? <img src={person.avatar} alt="" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.setAttribute('data-initials', initials); }} /> : initials;
  return onClick ? <button className={`avatar ${size}`} onClick={onClick} aria-label={`View ${person?.name || 'your'} profile`}>{content}</button> : <span className={`avatar ${size}`} aria-hidden="true">{content}</span>;
}

function PostCover({ post, eager = false }: { post: Post; eager?: boolean }) {
  return post.mediaType === 'video' && !post.thumbnail
    ? <video src={post.mediaUrl} muted playsInline preload="metadata" aria-label={post.title} />
    : <img src={post.thumbnail || post.mediaUrl} alt={post.title} loading={eager ? 'eager' : 'lazy'} onError={e => { e.currentTarget.src = '/media/media-unavailable.svg'; }} />;
}

export default function TurboWatch() {
  const social = useSocial();
  const { posts, creators, user, boards, conversations, likedIds, savedIds, followingIds, repostedIds, mode, loading, error } = social;
  const [view, setView] = useState<View>('feed');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [popup, setPopup] = useState<Popup>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [profileTab, setProfileTab] = useState('Posts');
  const [shortIndex, setShortIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [activity, setActivity] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const readURL = () => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('view');
      setView(navItems.some(n => n.id === next) || next === 'profile' ? next as View : 'feed');
      setSelectedPostId(params.get('post'));
      setCreatorId(params.get('creator'));
    };
    readURL();
    window.addEventListener('popstate', readURL);
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('popstate', readURL); window.removeEventListener('keydown', keyboard); };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function notify(message: string) { setToast(message); setActivity(prev => [message, ...prev].slice(0, 8)); }
  async function action(run: () => Promise<unknown>, success?: string) {
    if (!user) { setPopup('auth'); return; }
    try { await run(); if (success) notify(success); } catch (e) { setToast(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
  }
  function navigate(next: View) {
    setView(next); setCategory('All'); setSearch(''); setBoardId(null); setCreatorId(null); setMobileMenu(false); setNotifications(false);
    window.history.pushState({}, '', next === 'feed' ? '/' : `/?view=${next}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mainRef.current?.focus({ preventScroll: true });
  }
  function openProfile(id: string) {
    setView('profile'); setCreatorId(id); setProfileTab('Posts'); setSearch(''); setSelectedPostId(null);
    window.history.pushState({}, '', `/?view=profile&creator=${encodeURIComponent(id)}`);
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
  const categories = ['All', ...Array.from(new Set(posts.map(p => p.category))).slice(0, 7)];
  const filtered = posts.filter(p => (category === 'All' || p.category === category) && (!search || `${p.title} ${p.description} ${p.tags.join(' ')} ${findCreator(p.creatorId)?.name || ''}`.toLowerCase().includes(search.toLowerCase())));
  const shorts = posts.filter(p => p.mediaType === 'video');
  const short = shorts[shortIndex % (shorts.length || 1)];
  const featured = posts.find(p => p.id === 'coast-escape') || shorts[0] || posts[0];
  const activeBoard = boards.find(b => b.id === boardId);
  const profile = creatorId ? findCreator(creatorId) : user;
  const isOwnProfile = !!profile && user?.id === profile.id;
  const profilePosts = profile ? profileTab === 'Saved' ? posts.filter(p => savedIds.includes(p.id)) : profileTab === 'Reposts' ? posts.filter(p => repostedIds.includes(p.id)) : posts.filter(p => p.creatorId === profile.id) : [];

  function PostCard({ post, index = 0 }: { post: Post; index?: number }) {
    const person = findCreator(post.creatorId);
    const liked = likedIds.includes(post.id), saved = savedIds.includes(post.id);
    return <article className={`post-card card-${post.aspect}`} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <div className="post-media">
        <button className="media-open" onClick={() => openPost(post)} aria-label={`Open ${post.title}`}>
          <PostCover post={post} eager={index < 4} />
          {post.mediaType === 'video' && <span className="play-hover"><Play size={22} fill="currentColor" /></span>}
        </button>
        <span className="media-kind">{post.mediaType === 'video' ? <Clapperboard size={13} /> : <ImageIcon size={13} />}{post.mediaType === 'video' ? 'Watch' : 'Inspiration'}</span>
        <button className={`save-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Unsave post' : 'Save post'} aria-pressed={saved} onClick={() => void action(() => social.toggleSave(post.id), saved ? 'Removed from saved' : 'Saved to your collection')}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button>
        {post.duration && <span className="duration">{post.duration}</span>}
      </div>
      <button className="post-title" onClick={() => openPost(post)}>{post.title}</button>
      <div className="post-meta"><Avatar person={person} size="tiny" onClick={() => openProfile(post.creatorId)} /><button onClick={() => openProfile(post.creatorId)}>{person?.name || 'A creator'}{person?.verified && <span className="verified"><Check size={8} strokeWidth={4} /></span>}</button><span className="meta-dot">·</span><span>{number(post.views)} views</span></div>
      <div className="post-card-actions"><button aria-label={liked ? 'Unlike post' : 'Like post'} aria-pressed={liked} className={liked ? 'liked' : ''} onClick={() => void action(() => social.toggleLike(post.id))}><Heart size={15} fill={liked ? 'currentColor' : 'none'} />{number(post.likes)}</button><button aria-label={`Comment on ${post.title}`} onClick={() => openPost(post)}><MessageCircle size={15} />{social.comments.filter(c => c.postId === post.id).length || 'Comment'}</button><button aria-label={`Share ${post.title}`} onClick={() => setSharePost(post)}><ArrowUpRight size={16} /></button></div>
    </article>;
  }
  function FeedGrid({ items = filtered, emptyTitle = 'Nothing here just yet.', emptyDescription = 'Try another search or category. Your next favorite is out there.' }: { items?: Post[]; emptyTitle?: string; emptyDescription?: string }) {
    return items.length ? <div className="masonry-grid">{items.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}</div> : <Empty icon={<Compass />} title={emptyTitle} description={emptyDescription} action={<button className="secondary-button" onClick={() => { setSearch(''); setCategory('All'); }}>Explore the feed <ArrowRight size={16} /></button>} />;
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {mobileMenu && <button className="sidebar-scrim" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
      <button className="brand" onClick={() => navigate('feed')} aria-label="TurboWatch home"><span className="brand-mark"><Zap fill="currentColor" size={23} strokeWidth={1.5} /></span><span>turbo<span className="brand-light">watch</span><span className="brand-period">.</span></span></button>
      <span className="nav-label">YOUR DAILY RABBIT HOLE</span>
      <nav aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => navigate(id)} aria-current={view === id ? 'page' : undefined}><Icon size={20} fill={view === id && id === 'feed' ? 'currentColor' : 'none'} strokeWidth={1.8} /><span>{label}</span>{id === 'messages' && unread > 0 && <span className="unread-badge">{unread}</span>}{id === 'feed' && <span className="active-dot" />}</button>)}</nav>
      <div className="sidebar-divider" />
      <div className="nav-label nav-label-row">YOUR SPACE<button aria-label="New collection" onClick={() => user ? setPopup('board') : setPopup('auth')}><Plus size={15} /></button></div>
      <button className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => { navigate('profile'); setProfileTab('Posts'); }}><UserRound size={20} strokeWidth={1.8} /><span>My profile</span></button>
      {boards.slice(0, 3).map((board, i) => <button className="sidebar-board" key={board.id} onClick={() => { navigate('boards'); setBoardId(board.id); }}><span className={`board-dot dot-${i}`} /><span>{board.name}</span><span>{board.postIds.length}</span></button>)}
      <div className="sidebar-inspiration"><Sparkles size={21} /><p>Good things happen<br />when you get curious.</p><button onClick={() => navigate('explore')}>Find your inspiration <ArrowUpRight size={15} /></button><span className="inspiration-ring" /></div>
      <div className="sidebar-bottom"><button className="account-button" onClick={() => user ? navigate('profile') : setPopup('auth')}><Avatar person={user} /><span><strong>{user?.name || 'Join the community'}</strong><small>{mode === 'demo' ? 'Local demo · Explore freely' : user ? `@${user.username}` : 'Sign in or create an account'}</small></span><MoreHorizontal size={18} /></button></div>
    </aside>

    <div className="workspace">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-toggle" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={23} /></button><span className="breadcrumb">Discover <ChevronRight size={13} /><strong>{view === 'feed' ? 'For you' : view === 'boards' ? 'Collections' : navItems.find(n => n.id === view)?.label || 'My profile'}</strong></span></div><div className="search-field"><Search size={18} /><input ref={searchRef} aria-label="Search TurboWatch" placeholder="Search your next obsession" value={search} onChange={e => { setSearch(e.target.value); if (!['feed', 'explore'].includes(view)) setView('explore'); }} />{search ? <button aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button> : <kbd>/</kbd>}</div><div className="topbar-actions"><div className="activity-wrapper"><button className={`icon-button notification-button ${notifications ? 'selected' : ''}`} aria-label="Activity" onClick={() => setNotifications(!notifications)} aria-expanded={notifications}><Bell size={20} />{activity.length > 0 && <span />}</button>{notifications && <div className="activity-panel"><div className="activity-heading"><strong>Your activity</strong><button className="icon-button" aria-label="Close activity" onClick={() => setNotifications(false)}><X size={16} /></button></div>{activity.length ? activity.map((a, i) => <div className="activity-item" key={`${a}-${i}`}><span><Check size={14} /></span><p>{a}</p></div>) : <p className="activity-empty">A fresh start. Your saves, reposts, and new connections will appear here.</p>}<small>{mode === 'demo' ? 'Activity in this browser session' : 'Activity in this session'}</small></div>}</div><button className="primary-button create-button" onClick={() => user ? setPopup('create') : setPopup('auth')}><Plus size={18} /><span>Create</span></button><Avatar person={user} size="topbar-avatar" onClick={() => user ? navigate('profile') : setPopup('auth')} /></div></header>

      <main id="main-content" className={`main-content view-${view}`} tabIndex={-1} ref={mainRef}>
        {error && <div className="error-banner" role="alert"><div className="error-content"><p>{error}</p>{mode === 'live' && error.includes('schema') && <a href="https://github.com/TurboTwitch0/TurboWatch/blob/main/README.md#fix-pgrst205-publicprofiles-missing-from-the-schema-cache" target="_blank" rel="noopener noreferrer">Database setup instructions <ArrowUpRight size={13} /></a>}</div><div className="error-actions"><button className="retry-button" onClick={() => window.location.reload()}>Try again</button><button aria-label="Dismiss error" onClick={social.clearError}><X size={17} /></button></div></div>}
        {mode === 'live' && !user && <div className="welcome-banner"><span>Find your people. Share your perspective.</span><button onClick={() => setPopup('auth')}>Join TurboWatch <ArrowRight size={15} /></button></div>}

        {(view === 'feed' || view === 'explore') && <>
          <section className="page-intro"><div><p className="eyebrow"><span />{view === 'feed' ? 'ALGORITHMS MEET HAPPY ACCIDENTS' : 'FOLLOW YOUR CURIOSITY'}</p><h1>{search ? <>Results for <em>“{search}”</em></> : view === 'feed' ? <>Stay curious<span className="coral-text">.</span></> : <>There’s a whole world<br className="desktop-break" /> out there<span className="coral-text">.</span></>}</h1><p className="intro-description">{search ? `${filtered.length} ${filtered.length === 1 ? 'find' : 'finds'} to get into. Keep exploring.` : view === 'feed' ? 'Things you love. People you haven’t met. Ideas worth keeping.' : 'Fresh perspectives, unexpected finds, and your next favorite creator.'}</p></div><div className="intro-side"><span className="little-orbit"><Sparkles size={17} /></span><span>A little scrolling.<br /><strong>A lot of possibility.</strong></span></div></section>

          {!search && category === 'All' && view === 'feed' && featured && <section className="hero-grid" aria-label="Featured discoveries"><button className="hero-feature" onClick={() => openPost(featured)}><PostCover post={featured} eager /><div className="hero-shade" /><span className="hero-kicker"><span className="live-dot" />{featured.id === 'coast-escape' ? 'THE GREAT OUT THERE' : featured.category.toUpperCase()}</span><span className="hero-feature-content"><span className="feature-label">A DIFFERENT POINT OF VIEW</span><strong>{featured.id === 'coast-escape' ? <>Take the<br />scenic route.</> : featured.title}</strong><span className="hero-description">A little further from ordinary.</span><span className="watch-link"><span><Play size={13} fill="currentColor" /></span>{featured.mediaType === 'video' ? 'Watch the story' : 'Explore the story'} <ArrowUpRight size={16} /></span></span><span className="hero-duration">{featured.duration || 'Explore'}</span><span className="hero-index">FEATURED</span></button><div className="hero-collect"><span className="collect-kicker"><Bookmark size={14} /> GOOD FINDS, ALL IN ONE PLACE</span><div className="collection-stack">{posts.slice(2, 5).map((p, i) => <button key={p.id} className={`stack-image stack-${i}`} onClick={() => openPost(p)} aria-label={`Explore ${p.title}`}><PostCover post={p} /></button>)}<span className="stack-sticker"><Sparkles size={14} />keep it.</span></div><div className="hero-collect-bottom"><h2>Find it. Love it.<br />Make it a collection.</h2><button className="round-arrow" aria-label="Explore collections" onClick={() => navigate('boards')}><ArrowUpRight size={23} /></button></div><p>Your taste, a little more organized.</p></div></section>}

          {view === 'explore' && !search && <section className="creator-discovery"><div className="section-heading"><h2>People with a point of view</h2><span>Go on, find your people <Users size={16} /></span></div><div className="creator-strip">{creators.filter(c => c.id !== user?.id).slice(0, 5).map(person => <div className="creator-chip" key={person.id}><Avatar person={person} size="medium" onClick={() => openProfile(person.id)} /><button className="creator-name" onClick={() => openProfile(person.id)}><strong>{person.name}</strong><small>@{person.username}</small></button><button className={`follow-mini ${followingIds.includes(person.id) ? 'following' : ''}`} aria-label={`${followingIds.includes(person.id) ? 'Unfollow' : 'Follow'} ${person.name}`} onClick={() => void action(() => social.toggleFollow(person.id), followingIds.includes(person.id) ? `Unfollowed ${person.name}` : `Following ${person.name}`)}>{followingIds.includes(person.id) ? <Check size={16} /> : <Plus size={16} />}</button></div>)}</div></section>}
          <section className="feed-section" aria-label="Discovery feed"><div className="section-heading"><h2>{search ? 'Worth a closer look' : view === 'feed' ? 'A feed that gets you' : 'The inspiration is endless'}<span className="heading-dot">✦</span></h2><div className="feed-view-control"><span>{search ? `${filtered.length} results` : 'A little bit of everything'}</span><span className="icon-button selected" aria-label="Grid view"><Grid2X2 size={15} /></span><button className="icon-button" aria-label="Watch shorts" onClick={() => navigate('shorts')}><Clapperboard size={16} /></button></div></div><div className="category-row" aria-label="Filter by category">{categories.map((cat, i) => <button key={cat} className={`category-pill ${category === cat ? 'active' : ''}`} aria-pressed={category === cat} onClick={() => setCategory(cat)}>{i === 0 && <Sparkles size={13} />}{cat === 'All' ? 'For you' : cat}</button>)}<span className="category-tail">Just good stuff <ArrowDown size={12} /></span></div>{loading ? <div className="loading-state"><span className="loading-orbit" />Finding your next favorite…</div> : <FeedGrid />}</section>
          <div className="feed-end"><span>✦</span><p>You’re right where the good stuff happens.</p><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top <ArrowUp size={14} /></button></div>
        </>}

        {view === 'shorts' && <><section className="page-intro compact"><div><p className="eyebrow"><span />SMALL STORIES. BIG ENERGY.</p><h1>A moment of <em>escape.</em></h1><p className="intro-description">One more? We get it. Make a little room for discovery.</p></div><span className="outline-tag"><Clapperboard size={15} /> SHORTS</span></section>{short ? <section className="shorts-stage"><div className="shorts-context"><span className="eyebrow">ON YOUR WATCHLIST</span><h2>{short.title}</h2><p>{short.description}</p><button className="creator-inline" onClick={() => openProfile(short.creatorId)}><Avatar person={findCreator(short.creatorId)} /><span><strong>{findCreator(short.creatorId)?.name}</strong><small>@{findCreator(short.creatorId)?.username}</small></span><ArrowUpRight size={16} /></button><div className="short-tags">{short.tags.map(t => <span key={t}>#{t}</span>)}</div><span className="shorts-counter">{String(shortIndex % shorts.length + 1).padStart(2, '0')} <span>/ {String(shorts.length).padStart(2, '0')}</span></span></div><div className="short-player"><video key={short.id} src={short.mediaUrl} poster={short.thumbnail} controls playsInline autoPlay loop muted={muted} aria-label={short.title} /><div className="short-player-top"><span><Zap size={15} fill="currentColor" /> turboshorts</span><button aria-label={muted ? 'Unmute video' : 'Mute video'} className="glass-button" onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button></div></div><div className="short-actions"><ActionRound label={likedIds.includes(short.id) ? 'Unlike video' : 'Like video'} active={likedIds.includes(short.id)} icon={<Heart fill={likedIds.includes(short.id) ? 'currentColor' : 'none'} />} text={number(short.likes)} onClick={() => void action(() => social.toggleLike(short.id))} /><ActionRound label="Comment on video" icon={<MessageCircle />} text="Discuss" onClick={() => openPost(short)} /><ActionRound label="Repost video" active={repostedIds.includes(short.id)} icon={<Repeat2 />} text="Repost" onClick={() => void action(() => social.toggleRepost(short.id), repostedIds.includes(short.id) ? 'Repost removed' : 'Reposted to your profile')} /><ActionRound label="Share video" icon={<ArrowUpRight />} text="Share" onClick={() => setSharePost(short)} /><div className="short-navigation"><button className="icon-button" aria-label="Previous short" onClick={() => setShortIndex(i => (i - 1 + shorts.length) % shorts.length)}><ChevronLeft /></button><button className="icon-button" aria-label="Next short" onClick={() => setShortIndex(i => (i + 1) % shorts.length)}><ChevronRight /></button></div></div></section> : <Empty icon={<Clapperboard />} title="Your next story starts here." description="Share the first video and give this space some energy." action={<button className="primary-button" onClick={() => setPopup(user ? 'create' : 'auth')}>Create a video <Plus size={16} /></button>} />}</>}

        {view === 'boards' && <><section className="page-intro"><div><p className="eyebrow"><span />SAVE A LITTLE INSPIRATION</p><h1>{activeBoard ? activeBoard.name : <>Your kind of <em>collection.</em></>}</h1><p className="intro-description">{activeBoard ? `${activeBoard.postIds.length} finds worth coming back to.` : 'All the things that made you stop scrolling. A little world of your own.'}</p></div><button className="primary-button" onClick={() => setPopup(user ? 'board' : 'auth')}><Plus size={17} />New collection</button></section>{activeBoard ? <><button className="text-button back-button" onClick={() => setBoardId(null)}><ArrowLeft size={16} />All collections</button><FeedGrid items={posts.filter(p => activeBoard.postIds.includes(p.id))} emptyTitle="Room for a little inspiration." emptyDescription="Open a post and choose this collection to start filling it." /></> : boards.length ? <div className="boards-grid">{boards.map((b, i) => <button className={`board-card board-color-${i % 3}`} key={b.id} onClick={() => setBoardId(b.id)}><div className="board-collage">{b.postIds.slice(0, 3).map(id => { const p = posts.find(post => post.id === id); return p && <img key={id} src={p.thumbnail || p.mediaUrl} alt="" />; })}{!b.postIds.length && <span className="board-empty-art"><Bookmark size={42} strokeWidth={1} /><span>Your next good find<br />belongs here.</span></span>}<span className="board-arrow"><ArrowUpRight size={21} /></span></div><div className="board-info"><h2>{b.name}</h2><span>{b.postIds.length} {b.postIds.length === 1 ? 'save' : 'saves'}</span></div><p>{b.description || 'A collection of things you love.'}</p></button>)}<button className="new-board-card" onClick={() => setPopup(user ? 'board' : 'auth')}><span><Plus size={25} /></span><strong>A fresh collection</strong><small>Give your next obsession a home.</small></button></div> : <Empty icon={<Bookmark />} title="Good finds deserve a home." description="Create your first collection and start saving what inspires you." action={<button className="primary-button" onClick={() => setPopup(user ? 'board' : 'auth')}><Plus size={16} />Create a collection</button>} />}</>}

        {view === 'profile' && <>{profile ? <><section className="profile-cover"><div className="cover-shapes"><span /><span /><span /></div><span>ONE OF A KIND. ALL YOURS.</span><Sparkles size={38} strokeWidth={1} /></section><section className="profile-info"><Avatar person={profile} size="profile-avatar" /><div className="profile-main"><div className="profile-title"><h1>{profile.name}</h1>{profile.verified && <span className="verified large"><Check size={12} strokeWidth={3} /></span>}</div><p className="profile-handle">@{profile.username}</p><p className="profile-bio">{profile.bio || 'Collecting moments. Finding the good stuff.'}</p><div className="profile-stats"><span><strong>{posts.filter(p => p.creatorId === profile.id).length}</strong> posts</span><span><strong>{number(profile.followers || 0)}</strong> followers</span>{isOwnProfile && <span><strong>{followingIds.length}</strong> following</span>}</div></div><div className="profile-buttons">{isOwnProfile ? <><button className="secondary-button" onClick={() => setPopup('edit')}><Settings2 size={15} />Edit profile</button>{mode === 'live' && <button className="icon-button" aria-label="Sign out" onClick={() => void action(async () => { await social.signOut(); navigate('feed'); })}><LogOut size={19} /></button>}</> : <><button className={followingIds.includes(profile.id) ? 'secondary-button' : 'primary-button'} onClick={() => void action(() => social.toggleFollow(profile.id))}>{followingIds.includes(profile.id) ? <><Check size={16} />Following</> : <><Plus size={16} />Follow</>}</button><button className="secondary-button" onClick={() => openMessage(profile.id)}><MessageCircle size={16} />Message</button></>}</div></section><div className="profile-tabs" role="tablist" aria-label="Profile content">{(isOwnProfile ? ['Posts', 'Saved', 'Reposts'] : ['Posts']).map(tab => <button role="tab" aria-selected={profileTab === tab} key={tab} className={profileTab === tab ? 'active' : ''} onClick={() => setProfileTab(tab)}>{tab === 'Posts' ? <Grid2X2 size={16} /> : tab === 'Saved' ? <Bookmark size={16} /> : <Repeat2 size={16} />}{tab}</button>)}</div><FeedGrid items={profilePosts} emptyTitle={isOwnProfile ? 'Your perspective belongs here.' : 'The story is just getting started.'} emptyDescription={isOwnProfile ? 'Create a post or save a little inspiration to make this space yours.' : 'Follow this creator and check back for their first post.'} /></> : <Empty icon={<UserRound />} title="Make a little space for you." description="Create your account to share your perspective and find your people." action={<button className="primary-button" onClick={() => setPopup('auth')}>Get started <ArrowRight size={16} /></button>} />}</>}

        {view === 'messages' && <><section className="page-intro compact"><div><p className="eyebrow"><span />GOOD CONVERSATIONS START HERE</p><h1>Keep in <em>touch.</em></h1><p className="intro-description">Send a hello. Share an idea. Find your people.</p></div><span className="outline-tag"><MessageCircle size={15} />YOUR INBOX</span></section>{user ? <MessagesPanel activeId={conversationId} setActiveId={id => { setConversationId(id); void social.markConversationRead(id).catch(() => {}); }} openProfile={openProfile} toast={setToast} /> : <Empty icon={<MessageCircle />} title="There’s a conversation waiting." description="Sign in to send private messages to other creators." action={<button className="primary-button" onClick={() => setPopup('auth')}>Sign in <ArrowRight size={16} /></button>} />}</>}

        <footer className="page-footer"><span><Zap size={12} fill="currentColor" />turbo<span>watch.</span></span><p>Go find your thing.</p><span className="demo-indicator"><span />{mode === 'demo' ? 'Demo · saved in this browser' : 'Community mode'}</span></footer>
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{navItems.slice(0, 5).map(({ id, icon: Icon, label }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)} aria-label={label}><Icon size={21} /><span>{label === 'Collections' ? 'Saved' : label}</span></button>)}</nav>
    {popup === 'create' && <CreateDialog onClose={() => setPopup(null)} onCreated={post => { setPopup(null); notify('Your post is published'); openPost(post); }} />}
    {popup === 'edit' && <EditProfileDialog onClose={() => setPopup(null)} />}
    {popup === 'auth' && <AuthDialog onClose={() => setPopup(null)} />}
    {popup === 'board' && <NewBoardDialog onClose={() => setPopup(null)} />}
    {selectedPost && !popup && !sharePost && <PostDetail post={selectedPost} onClose={closePost} onShare={() => setSharePost(selectedPost)} openProfile={openProfile} requireAuth={() => setPopup('auth')} onTag={tag => { closePost(); navigate('explore'); setSearch(tag); }} action={action} />}
    {selectedPostId && !selectedPost && !loading && !popup && !sharePost && <Dialog title="This find is unavailable" onClose={closePost}><div className="empty-state"><Compass /><h2>This story isn’t here yet.</h2><p>{mode === 'demo' ? 'Demo posts and uploads are saved in the browser where they were created. Shared demo links only open seeded content elsewhere.' : 'This post may have been removed or is no longer available.'}</p><button className="primary-button" onClick={closePost}>Back to exploring</button></div></Dialog>}
    {sharePost && <ShareDialog post={sharePost} onClose={() => setSharePost(null)} />}
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
  const person = creators.find(c => c.id === post.creatorId) || (user?.id === post.creatorId ? user : undefined);
  const comments = social.comments.filter(c => c.postId === post.id);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!user) { requireAuth(); return; } if (!comment.trim() || sending) return;
    setSending(true); setCommentError('');
    try { await social.addComment(post.id, comment.trim()); setComment(''); } catch (e) { setCommentError(e instanceof Error ? e.message : 'Could not post comment.'); } finally { setSending(false); }
  }
  return <Dialog title={post.title} onClose={onClose} className="post-dialog"><div className="post-detail-layout"><div className="detail-media">{post.mediaType === 'video' ? <video src={post.mediaUrl} poster={post.thumbnail} controls playsInline autoPlay aria-label={post.title} /> : <img src={post.mediaUrl} alt={post.title} />}</div><div className="detail-panel"><div className="detail-creator"><Avatar person={person} onClick={() => { onClose(); openProfile(post.creatorId); }} /><button onClick={() => { onClose(); openProfile(post.creatorId); }}><strong>{person?.name || 'A creator'}</strong><small>@{person?.username || 'creator'}</small></button>{person?.id !== user?.id && <button className="text-button coral-text" onClick={() => void action(() => social.toggleFollow(post.creatorId))}>{social.followingIds.includes(post.creatorId) ? 'Following' : 'Follow'}</button>}</div><h2>{post.title}</h2><p className="detail-description">{post.description}</p><div className="detail-tags">{post.tags.map(t => <button key={t} onClick={() => onTag(t)}>#{t}</button>)}</div><div className="detail-stats">{number(post.views)} views<span>·</span>{new Date(post.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</div><div className="detail-comments"><h3>The conversation <span>{comments.length}</span></h3>{comments.length ? comments.map(c => { const creator = creators.find(u => u.id === c.creatorId) || (user?.id === c.creatorId ? user : undefined); return <div className="comment" key={c.id}><Avatar person={creator} size="small" /><div><strong>{creator?.name || 'Community member'}<time>{date(c.createdAt)}</time></strong><p>{c.text}</p></div></div>; }) : <p className="no-comments">A fresh perspective starts a good conversation. Leave the first comment.</p>}</div><div className="detail-actions"><button className={likedIds.includes(post.id) ? 'liked' : ''} aria-label={likedIds.includes(post.id) ? 'Unlike post' : 'Like post'} aria-pressed={likedIds.includes(post.id)} onClick={() => void action(() => social.toggleLike(post.id))}><Heart size={22} fill={likedIds.includes(post.id) ? 'currentColor' : 'none'} /><span>{number(post.likes)}</span></button><button className={repostedIds.includes(post.id) ? 'coral-text' : ''} aria-label="Repost post" aria-pressed={repostedIds.includes(post.id)} onClick={() => void action(() => social.toggleRepost(post.id), repostedIds.includes(post.id) ? 'Repost removed' : 'Reposted to your profile')}><Repeat2 size={22} /></button><button aria-label="Share post" onClick={onShare}><ArrowUpRight size={23} /></button><div className="detail-save"><button className={savedIds.includes(post.id) ? 'coral-text' : ''} aria-label={savedIds.includes(post.id) ? 'Unsave post' : 'Save post'} aria-pressed={savedIds.includes(post.id)} onClick={() => void action(() => social.toggleSave(post.id), savedIds.includes(post.id) ? 'Removed from saved' : 'Saved to your collection')}><Bookmark size={22} fill={savedIds.includes(post.id) ? 'currentColor' : 'none'} /></button><button aria-label="Choose collection" onClick={() => user ? setBoardMenu(!boardMenu) : requireAuth()}><ChevronDown size={16} /></button>{boardMenu && <div className="save-board-menu"><strong>Save to collection</strong>{boards.length ? boards.map(b => <button key={b.id} onClick={() => { void action(() => social.saveToBoard(post.id, b.id), `Saved to ${b.name}`); setBoardMenu(false); }}><Bookmark size={14} />{b.name}{b.postIds.includes(post.id) && <Check size={14} />}</button>) : <p>Create a collection from your sidebar first.</p>}</div>}</div></div><form className="comment-form" onSubmit={submit}><Avatar person={user} size="small" /><input aria-label="Write a comment" placeholder="Add your perspective…" value={comment} maxLength={2000} onChange={e => setComment(e.target.value)} /><button type="submit" disabled={!comment.trim() || sending} aria-label="Post comment"><Send size={18} /></button></form>{commentError && <p role="alert" className="form-error">{commentError}</p>}</div></div></Dialog>;
}

function MessagesPanel({ activeId, setActiveId, openProfile, toast }: { activeId: string | null; setActiveId: (id: string) => void; openProfile: (id: string) => void; toast: (s: string) => void }) {
  const { user, creators, conversations, sendMessage, markConversationRead, mode } = useSocial();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef('');
  const chosenId = activeId === '' ? undefined : activeId || conversations[0]?.creatorId;
  const person = creators.find(c => c.id === chosenId);
  const conversation = conversations.find(c => c.creatorId === chosenId);
  const candidates = search ? creators.filter(c => c.id !== user?.id && `${c.name} ${c.username}`.toLowerCase().includes(search.toLowerCase())) : conversations.map(c => creators.find(p => p.id === c.creatorId)).filter((c): c is Creator => !!c);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [conversation?.messages.length, chosenId]);
  useEffect(() => {
    const visible = activeId || window.matchMedia('(min-width: 601px)').matches;
    const signature = `${chosenId}:${conversation?.messages.at(-1)?.id}`;
    if (visible && chosenId && conversation?.unread && markedRef.current !== signature) {
      markedRef.current = signature;
      void markConversationRead(chosenId).catch(() => {});
    }
  }, [chosenId, activeId, conversation?.unread, conversation?.messages.length, markConversationRead]);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!draft.trim() || !chosenId || sending) return;
    setSending(true); try { await sendMessage(chosenId, draft.trim()); setDraft(''); } catch (e) { toast(e instanceof Error ? e.message : 'Could not send message.'); } finally { setSending(false); }
  }
  return <section className={`messages-layout ${person && activeId ? 'has-conversation' : ''}`}><aside className="conversation-list"><div className="inbox-heading"><h2>Messages <span>{conversations.length}</span></h2><button className="icon-button" aria-label="New message" onClick={() => document.getElementById('people-search')?.focus()}><Plus size={19} /></button></div><div className="people-search"><Search size={16} /><input id="people-search" aria-label="Find a person to message" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find your people" /></div><div className="conversation-items">{candidates.length ? candidates.map(c => { const conv = conversations.find(item => item.creatorId === c.id), last = conv?.messages.at(-1); return <button className={`conversation-item ${chosenId === c.id ? 'active' : ''}`} key={c.id} onClick={() => { setActiveId(c.id); setSearch(''); setDraft(''); }}><Avatar person={c} /><span><strong>{c.name}<time>{last ? date(last.createdAt) : ''}</time></strong><small>{last ? `${last.senderId === user?.id ? 'You: ' : ''}${last.text}` : `Say hello to @${c.username}`}</small></span>{!!conv?.unread && <i>{conv.unread}</i>}</button>; }) : <p className="inbox-empty">{search ? 'No people found. Try another name.' : 'Search for a creator to start a conversation.'}</p>}</div><div className="inbox-note"><MessageCircle size={15} /><span>{mode === 'demo' ? 'Demo conversations stay in this browser.' : 'Only you and the recipient can read your messages.'}</span></div></aside><div className="message-thread">{person ? <><div className="thread-header"><button className="icon-button thread-back" aria-label="Back to conversations" onClick={() => setActiveId('')}><ChevronLeft size={20} /></button><Avatar person={person} onClick={() => openProfile(person.id)} /><button onClick={() => openProfile(person.id)}><strong>{person.name}</strong><small>@{person.username}</small></button><button className="icon-button" onClick={() => openProfile(person.id)} aria-label="View message recipient profile"><UserRound size={18} /></button></div><div className="message-history"><div className="conversation-start"><Avatar person={person} size="medium" /><strong>{person.name}</strong><span>{mode === 'demo' ? 'A fictional conversation to try the experience.' : 'A good conversation can start with a hello.'}</span></div>{conversation?.messages.map(m => <div className={`message-bubble ${m.senderId === user?.id ? 'outgoing' : 'incoming'}`} key={m.id}><p>{m.text}</p><time>{date(m.createdAt)}</time></div>)}<div ref={bottomRef} /></div><form className="message-form" onSubmit={submit}><input aria-label="Your message" placeholder={`Message ${person.name.split(' ')[0]}…`} value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)} /><button className="primary-button" type="submit" disabled={!draft.trim() || sending} aria-label="Send message"><Send size={17} /></button></form></> : <Empty icon={<MessageCircle />} title="A good place to say hello." description="Choose a conversation or search for someone new." />}</div></section>;
}
