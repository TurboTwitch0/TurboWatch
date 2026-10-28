'use client';

import { ArrowRight, ArrowUpRight, Bookmark, Clapperboard, Compass, Play, Share2, Sparkles } from 'lucide-react';
import type { Post } from '@/lib/model';
import PostCover from './PostCover';

type PreviewPost = Pick<Post, 'id' | 'title' | 'mediaType' | 'mediaUrl' | 'thumbnail' | 'category'>;
const examples: PreviewPost[] = [
  { id: 'sample-coast', title: 'Take the scenic route.', mediaType: 'video', mediaUrl: '/media/coast.mp4', thumbnail: '/media/coast.jpg', category: 'Travel' },
  { id: 'sample-room', title: 'Room to breathe.', mediaType: 'image', mediaUrl: '/media/room.jpg', thumbnail: '/media/room.jpg', category: 'Design' },
  { id: 'sample-make', title: 'A little room for ideas.', mediaType: 'image', mediaUrl: '/media/creative-table.jpg', thumbnail: '/media/creative-table.jpg', category: 'Creative life' },
];

export default function ProductPreview({ posts = [], onJoin, onPreview, onOpenPost, primaryLabel = 'Join TurboWatch', headingLevel = 1 }: {
  posts?: Post[];
  onJoin: () => void;
  onPreview: () => void;
  onOpenPost?: (post: Post) => void;
  primaryLabel?: string;
  headingLevel?: 1 | 2;
}) {
  const isSample = posts.length === 0;
  const cards: PreviewPost[] = isSample ? examples : posts.slice(0, 3);
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  const open = (post: PreviewPost) => {
    const actualPost = posts.find(item => item.id === post.id);
    if (actualPost && onOpenPost) onOpenPost(actualPost);
    else onPreview();
  };

  return <section className="product-preview" aria-label="Discover TurboWatch">
    <div className="preview-copy">
      <p className="preview-kicker"><span aria-hidden="true"><Sparkles size={15} /></span>GOOD FINDS. YOUR POINT OF VIEW.</p>
      <Heading className="preview-title">Follow your<br /><em>curiosity.</em><span aria-hidden="true">✦</span></Heading>
      <p className="preview-description">Watch short stories. Save good finds.<br />Share a point of view.</p>
      <div className="preview-actions"><button className="primary-button" onClick={onJoin}>{primaryLabel}<ArrowUpRight size={18} /></button><button className="preview-library-button" onClick={onPreview}>See the sample library<ArrowRight size={17} /></button></div>
      <ul className="preview-feature-list" aria-label="What you can do"><li><Clapperboard size={18} /><span>Stories worth watching</span></li><li><Bookmark size={18} /><span>Collections worth keeping</span></li><li><Share2 size={18} /><span>Finds worth sharing</span></li></ul>
    </div>
    <div className="preview-stage">
      <span className="preview-orbit" aria-hidden="true" />
      <span className="preview-spark" aria-hidden="true">✦</span>
      {cards.map((post, index) => {
        const actualPost = posts.find(item => item.id === post.id);
        return <button key={post.id} className={index === 0 ? 'preview-featured' : `preview-card preview-card--${index === 1 ? 'one' : 'two'}`} onClick={() => open(post)} aria-label={`${isSample ? 'Preview sample: ' : 'Open '}${post.title}`}>
        <div className="preview-card-image">{actualPost ? <PostCover post={actualPost} eager /> : <img src={post.thumbnail || post.mediaUrl} alt="" loading="eager" />}{post.mediaType === 'video' && <span className="preview-play" aria-hidden="true"><Play size={index === 0 ? 22 : 15} fill="currentColor" /></span>}</div>
        <span className="preview-card-label"><span>{post.category}</span><strong>{post.title}</strong><ArrowUpRight size={18} aria-hidden="true" /></span>
      </button>; })}
      <span className="preview-chip" aria-hidden="true"><Bookmark size={16} />keep the good stuff.</span>
      <p className="preview-footnote"><Compass size={14} aria-hidden="true" />{isSample ? 'Sample content · not published community posts' : 'A preview of posts in this community'}</p>
    </div>
  </section>;
}
