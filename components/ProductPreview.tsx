'use client';

import { ArrowRight, ArrowUpRight, Bookmark, Clapperboard, Share2, Sparkles } from 'lucide-react';
import type { Post } from '@/lib/model';
import ContentShowcase from './ContentShowcase';

type PreviewPost = Pick<Post, 'id' | 'title' | 'mediaType' | 'mediaUrl' | 'thumbnail' | 'category'>;
const examples: PreviewPost[] = [
  { id: 'coast-escape', title: 'Take the scenic route.', mediaType: 'video', mediaUrl: '/media/coast.mp4', thumbnail: '/media/coast.jpg', category: 'Travel' },
  { id: 'room-to-breathe', title: 'Make room for a little more life.', mediaType: 'image', mediaUrl: '/media/room.jpg', thumbnail: '/media/room.jpg', category: 'Design' },
  { id: 'first-good-idea', title: 'Before the first good idea.', mediaType: 'image', mediaUrl: '/media/creative-table.jpg', thumbnail: '/media/creative-table.jpg', category: 'Art' },
];

export default function ProductPreview({ posts = [], onJoin, onPreview, onOpenPost, primaryLabel = 'Join TurboWatch', headingLevel = 1 }: {
  posts?: Post[];
  onJoin: () => void;
  onPreview: (sampleId?: string) => void;
  onOpenPost?: (post: Post) => void;
  primaryLabel?: string;
  headingLevel?: 1 | 2;
}) {
  const isSample = posts.length === 0;
  const cards: PreviewPost[] = isSample ? examples : posts;
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  const open = (post: PreviewPost) => {
    const actualPost = posts.find(item => item.id === post.id);
    if (actualPost && onOpenPost) onOpenPost(actualPost);
    else onPreview(post.id);
  };

  return <section className="product-preview" aria-label="Discover TurboWatch">
    <div className="preview-copy">
      <p className="preview-kicker"><span aria-hidden="true"><Sparkles size={15} /></span>GOOD FINDS. YOUR POINT OF VIEW.</p>
      <Heading className="preview-title">Follow your<br /><em>curiosity.</em><span aria-hidden="true">✦</span></Heading>
      <p className="preview-description">Watch short stories. Save good finds.<br />Share a point of view.</p>
      <div className="preview-actions"><button className="primary-button" onClick={onJoin}>{primaryLabel}<ArrowUpRight size={18} /></button><button className="preview-library-button" onClick={() => onPreview()}>See the sample library<ArrowRight size={17} /></button></div>
      <ul className="preview-feature-list" aria-label="What you can do"><li><Clapperboard size={18} /><span>Stories worth watching</span></li><li><Bookmark size={18} /><span>Collections worth keeping</span></li><li><Share2 size={18} /><span>Finds worth sharing</span></li></ul>
    </div>
    <ContentShowcase items={cards} onOpen={open} compact sample={isSample} />
  </section>;
}
