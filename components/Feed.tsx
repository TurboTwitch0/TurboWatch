'use client';

import { ArrowRight, ArrowUpRight, Bookmark, Check, Clapperboard, Compass, Heart, Image as ImageIcon, MessageCircle, Play } from 'lucide-react';
import type { Post } from '@/lib/model';
import { useSocial } from '@/lib/store';
import Avatar from './Avatar';
import PostCover from './PostCover';

export type SocialAction = (run: () => Promise<unknown>, success?: string) => Promise<void>;
interface FeedActions {
  onOpen: (post: Post) => void;
  onProfile: (id: string) => void;
  onShare: (post: Post) => void;
  action: SocialAction;
}
const number = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

function PostCard({ post, index = 0, onOpen, onProfile, onShare, action }: FeedActions & { post: Post; index?: number }) {
    const social = useSocial();
    const { creators, user, likedIds, savedIds } = social;
    const findCreator = (id: string) => creators.find(creator => creator.id === id) || (user?.id === id ? user : undefined);
    const person = findCreator(post.creatorId);
    const liked = likedIds.includes(post.id), saved = savedIds.includes(post.id);
    return <article className={`post-card card-${post.aspect}`} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <div className="post-media">
        <button className="media-open" onClick={() => onOpen(post)} aria-label={`Open ${post.title}`}>
          <PostCover post={post} eager={index < 4} />
          {post.mediaType === 'video' && <span className="play-hover"><Play size={22} fill="currentColor" /></span>}
        </button>
        <span className="media-kind">{post.mediaType === 'video' ? <Clapperboard size={13} /> : <ImageIcon size={13} />}{post.mediaType === 'video' ? 'Watch' : 'Inspiration'}</span>
        <button className={`save-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Unsave post' : 'Save post'} aria-pressed={saved} onClick={() => void action(() => social.toggleSave(post.id), saved ? 'Removed from saved' : 'Saved to your collection')}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button>
        {post.duration && <span className="duration">{post.duration}</span>}
      </div>
      <button className="post-title" onClick={() => onOpen(post)}>{post.title}</button>
      <div className="post-meta"><Avatar person={person} size="tiny" onClick={() => onProfile(post.creatorId)} /><button onClick={() => onProfile(post.creatorId)}>{person?.name || 'A creator'}{person?.verified && <span className="verified"><Check size={8} strokeWidth={4} /></span>}</button><span className="meta-dot">·</span><span>{number(post.views)} views</span></div>
      <div className="post-card-actions"><button aria-label={liked ? 'Unlike post' : 'Like post'} aria-pressed={liked} className={liked ? 'liked' : ''} onClick={() => void action(() => social.toggleLike(post.id))}><Heart size={15} fill={liked ? 'currentColor' : 'none'} />{number(post.likes)}</button><button aria-label={`Comment on ${post.title}`} onClick={() => onOpen(post)}><MessageCircle size={15} />{social.comments.filter(c => c.postId === post.id).length || 'Comment'}</button><button aria-label={`Share ${post.title}`} onClick={() => onShare(post)}><ArrowUpRight size={16} /></button></div>
    </article>;
  }

// Keep component identities stable so updates preserve media, focus, and scroll.
export default function FeedGrid({ items, emptyTitle = 'Nothing here just yet.', emptyDescription = 'Try another search or category. Your next favorite is out there.', onExplore, ...actions }: FeedActions & { items: Post[]; emptyTitle?: string; emptyDescription?: string; onExplore: () => void }) {
  return items.length ? <div className="masonry-grid">{items.map((post, index) => <PostCard key={post.id} post={post} index={index} {...actions} />)}</div> : <div className="empty-state"><span className="empty-icon"><Compass /></span><h2>{emptyTitle}</h2><p>{emptyDescription}</p><button className="secondary-button" onClick={onExplore}>Explore the feed <ArrowRight size={16} /></button></div>;
}
