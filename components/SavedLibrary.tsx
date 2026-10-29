'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Clapperboard, Grid2X2, Image as ImageIcon, LockKeyhole, Plus, Search, X } from 'lucide-react';
import type { Post } from '@/lib/model';
import { matchesPost } from '@/lib/search';
import { useSocial } from '@/lib/store';
import FeedGrid, { type SocialAction } from './Feed';

type LibrarySection = 'collections' | 'saved';
interface SavedLibraryProps {
  activeBoardId: string | null;
  section: LibrarySection;
  onSection: (section: LibrarySection) => void;
  onBoard: (id: string | null) => void;
  onCreate: () => void;
  onExplore: () => void;
  onOpen: (post: Post) => void;
  onProfile: (id: string) => void;
  onShare: (post: Post) => void;
  action: SocialAction;
}

function normalized(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function SavedLibrary({ activeBoardId, section, onSection, onBoard, onCreate, onExplore, onOpen, onProfile, onShare, action }: SavedLibraryProps) {
  const { user, posts, boards, creators, savedIds, loading, mode } = useSocial();
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState<'all' | 'image' | 'video'>('all');
  const [sort, setSort] = useState<'newest' | 'title'>('newest');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(''); setFormat('all'); setSort('newest'); }, [activeBoardId, section, user?.id, mode]);

  // Only records available to this account and loaded by the existing adapter
  // can appear here. A removed/older post does not become a broken media tile.
  const saved = useMemo(() => {
    const ids = new Set(savedIds);
    return posts.filter(post => ids.has(post.id));
  }, [posts, savedIds]);
  const board = boards.find(item => item.id === activeBoardId);
  const boardPosts = board ? posts.filter(post => board.postIds.includes(post.id)) : [];
  const showingPosts = !!activeBoardId || section === 'saved';
  const source = activeBoardId ? boardPosts : saved;
  const trimmedQuery = query.trim();
  const filteredPosts = source.filter(post => (format === 'all' || post.mediaType === format)
    && matchesPost(post, creators.find(creator => creator.id === post.creatorId) || (user?.id === post.creatorId ? user : undefined), trimmedQuery));
  filteredPosts.sort(sort === 'title'
    ? (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
    : (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
  const collectionTerms = normalized(trimmedQuery).split(/[\s,]+/).filter(Boolean);
  const filteredBoards = boards.filter(item => collectionTerms.every(term => normalized(`${item.name} ${item.description || ''}`).includes(term)));
  const hasFilters = !!trimmedQuery || format !== 'all' || sort !== 'newest';
  const unavailableCount = activeBoardId && board ? board.postIds.length - boardPosts.length : savedIds.length - saved.length;

  function clearFilters() {
    setQuery(''); setFormat('all'); setSort('newest');
    searchRef.current?.focus({ preventScroll: true });
  }

  if (!user) return <section className="saved-library">
    <header className="page-intro"><div><p className="eyebrow"><span />YOUR CURIOSITY, COLLECTED</p><h1>Keep the <em>good stuff.</em></h1><p className="intro-description">A private place for the posts you want to come back to.</p></div></header>
    {loading ? <div className="loading-state" role="status"><span className="loading-orbit" aria-hidden="true" /><span>Loading your saved library…</span></div> : <div className="empty-state"><span className="empty-icon"><Bookmark /></span><h2>Keep your good finds together.</h2><p>Sign in to save posts and organize private collections in your own account.</p><button className="primary-button" onClick={onCreate}>Sign in to save <ArrowRight size={16} /></button></div>}
  </section>;

  return <section className={`saved-library${showingPosts ? ' saved-library--posts' : ''}`} aria-label="Your saved library">
    <header className="page-intro saved-library-intro"><div><p className="eyebrow"><span />YOUR CURIOSITY, COLLECTED</p><h1>{board ? board.name : section === 'saved' ? <>Keep the <em>good stuff.</em></> : <>Your kind of <em>collection.</em></>}</h1><p className="intro-description">{board ? board.description || 'The finds you chose to keep together.' : 'Good finds, gathered your way. A little world worth coming back to.'}</p></div>{!showingPosts && <button className="primary-button" onClick={onCreate}><Plus size={17} />New collection</button>}</header>

    <div className="saved-library-bar"><div className="saved-library-tabs" role="group" aria-label="Saved library"><button aria-pressed={section === 'collections'} onClick={() => onSection('collections')}><Grid2X2 size={16} aria-hidden="true" />Collections <span>{boards.length}</span></button><button aria-pressed={section === 'saved'} onClick={() => onSection('saved')}><Bookmark size={16} aria-hidden="true" />All saved <span>{saved.length}</span></button></div><span className="saved-library-private"><LockKeyhole size={13} aria-hidden="true" />{mode === 'demo' ? 'Local sample library' : 'Only you can see this'}</span></div>

    {loading ? <div className="loading-state" role="status"><span className="loading-orbit" aria-hidden="true" /><span>Finding your saved posts…</span></div> : activeBoardId && !board ? <div className="empty-state"><span className="empty-icon"><Bookmark /></span><h2>This collection is unavailable.</h2><p>It may have been removed, or it may belong to another account. Private collections are only available to their owner.</p><button className="secondary-button" onClick={() => onBoard(null)}><ArrowLeft size={16} />Back to collections</button></div> : showingPosts ? <>
      {board && <button className="text-button saved-library-back" onClick={() => onBoard(null)}><ArrowLeft size={16} />All collections</button>}
      <div className="saved-library-tools"><label className="saved-library-search"><Search size={17} aria-hidden="true" /><input ref={searchRef} aria-label={board ? 'Search collection posts' : 'Search saved posts'} placeholder={board ? 'Find something in this collection' : 'Search your saved posts'} value={query} onChange={event => setQuery(event.target.value)} />{query && <button onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label="Clear saved search"><X size={16} /></button>}</label></div>
      <div className="saved-library-filter-row"><div className="saved-library-formats" role="group" aria-label="Saved post format">{([{ value: 'all', label: 'All', icon: Grid2X2 }, { value: 'image', label: 'Photos', icon: ImageIcon }, { value: 'video', label: 'Videos', icon: Clapperboard }] as const).map(({ value, label, icon: Icon }) => <button key={value} aria-pressed={format === value} onClick={() => setFormat(value)}><Icon size={15} aria-hidden="true" />{label}</button>)}</div><label className="saved-library-sort"><span>Sort by</span><select aria-label="Saved posts sort" value={sort} onChange={event => setSort(event.target.value as 'newest' | 'title')}><option value="newest">Newest post</option><option value="title">Title A–Z</option></select></label><span className="saved-library-results" role="status">{filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}</span>{hasFilters && <button className="saved-library-clear" onClick={clearFilters}>Clear library filters <X size={14} aria-hidden="true" /></button>}</div>
      {unavailableCount > 0 && <p className="saved-library-note">Some saved posts aren’t in the loaded feed. Removed or older posts may not appear here.</p>}
      <FeedGrid items={filteredPosts} onOpen={onOpen} onProfile={onProfile} onShare={onShare} action={action} onExplore={hasFilters ? clearFilters : onExplore} emptyTitle={hasFilters ? 'No saved posts match yet.' : board ? 'Room for a little inspiration.' : 'Your next good find belongs here.'} emptyDescription={hasFilters ? 'Try another search or clear the filters to see everything you saved.' : board ? 'Open a post and choose this collection to start filling it.' : 'Tap the bookmark on a post to keep it. You’ll find your saved photos and videos together here.'} emptyActionLabel={hasFilters ? 'Show all saved posts' : 'Find something to save'} />
    </> : <>
      <div className="saved-library-tools"><label className="saved-library-search"><Search size={17} aria-hidden="true" /><input ref={searchRef} aria-label="Search collections" placeholder="Find a collection" value={query} onChange={event => setQuery(event.target.value)} />{query && <button onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label="Clear collection search"><X size={16} /></button>}</label><span className="saved-library-results" role="status">{filteredBoards.length} {filteredBoards.length === 1 ? 'collection' : 'collections'}</span></div>
      {filteredBoards.length ? <div className="saved-collection-grid">{filteredBoards.map((item, index) => {
        const available = posts.filter(post => item.postIds.includes(post.id));
        return <button className={`board-card saved-collection-card board-color-${index % 3}`} key={item.id} aria-label={item.name} data-board-id={item.id} data-post-count={available.length} onClick={() => onBoard(item.id)}><div className="board-collage">{available.slice(0, 3).map(post => <img key={post.id} src={post.thumbnail || (post.mediaType === 'image' ? post.mediaUrl : '/media/media-unavailable.svg')} alt="" loading="lazy" onError={event => { if (event.currentTarget.getAttribute('src') !== '/media/media-unavailable.svg') event.currentTarget.src = '/media/media-unavailable.svg'; }} />)}{!available.length && <span className="board-empty-art"><Bookmark size={36} strokeWidth={1} /><span>A little space<br />for your next good find.</span></span>}<span className="board-arrow"><ArrowUpRight size={20} /></span></div><div className="board-info"><h2>{item.name}</h2><span>{available.length} {available.length === 1 ? 'post' : 'posts'}</span></div><p>{item.description || 'A collection of things you love.'}</p></button>;
      })}<button className="new-board-card saved-new-collection" onClick={onCreate}><span><Plus size={25} /></span><strong>A fresh collection</strong><small>Give your next obsession a home.</small></button></div> : <div className="empty-state"><span className="empty-icon"><Bookmark /></span><h2>{trimmedQuery ? 'No collections match yet.' : 'Good finds deserve a home.'}</h2><p>{trimmedQuery ? 'Try a different name or clear the search to see your collections.' : 'Make a collection for the ideas, places, or little things you want to keep.'}</p><button className="secondary-button" onClick={trimmedQuery ? clearFilters : onCreate}>{trimmedQuery ? 'Show all collections' : 'Create a collection'} <ArrowRight size={16} /></button></div>}
    </>}
  </section>;
}
