'use client';

import { ArrowUpRight, Image as ImageIcon, Play } from 'lucide-react';
import type { Post } from '@/lib/model';

interface RelatedStoriesProps {
  post: Post;
  items: Post[];
  onOpen: (post: Post) => void;
}

export default function RelatedStories({ post, items, onOpen }: RelatedStoriesProps) {
  const tags = new Set(post.tags.map(tag => tag.toLowerCase()));
  const suggestions = items
    .filter(item => item.id !== post.id)
    .map((item, index) => ({
      item,
      index,
      relevance: (item.category === post.category ? 8 : 0)
        + item.tags.filter(tag => tags.has(tag.toLowerCase())).length * 3
        + (post.mediaType === 'video' && item.mediaType === 'video' ? 2 : 0),
    }))
    .sort((a, b) => b.relevance - a.relevance || a.index - b.index)
    .slice(0, 3);

  if (!suggestions.length) return null;

  return <section className="related-stories" aria-label="More to explore">
    <div className="related-stories-heading">
      <span className="related-stories-kicker">THE NEXT GOOD FIND</span>
      <h3>Keep your curiosity going<span aria-hidden="true">.</span></h3>
      <p>Choose a story. Stay a little curious.</p>
    </div>
    <div className="related-stories-list">
      {suggestions.map(({ item }) => <button
        className="related-story"
        key={item.id}
        data-post-id={item.id}
        onClick={() => onOpen(item)}
        aria-label={`${item.mediaType === 'video' ? 'Watch' : 'Open'} ${item.title}`}
      >
        <span className="related-story-cover">
          <img
            src={item.thumbnail || (item.mediaType === 'image' ? item.mediaUrl : '/media/media-unavailable.svg')}
            alt=""
            loading="lazy"
            onError={event => {
              event.currentTarget.onerror = null;
              if (!event.currentTarget.src.endsWith('/media/media-unavailable.svg')) event.currentTarget.src = '/media/media-unavailable.svg';
            }}
          />
          {item.mediaType === 'video' && <span className="related-story-play" aria-hidden="true"><Play size={12} fill="currentColor" /></span>}
        </span>
        <span className="related-story-copy">
          <span className="related-story-category">{item.category}</span>
          <strong>{item.title}</strong>
          <span className="related-story-action">{item.mediaType === 'video' ? <Play size={11} aria-hidden="true" /> : <ImageIcon size={11} aria-hidden="true" />}{item.mediaType === 'video' ? 'Watch story' : 'Open photo'}{item.duration && item.mediaType === 'video' ? ` · ${item.duration}` : ''}</span>
        </span>
        <ArrowUpRight className="related-story-arrow" size={17} aria-hidden="true" />
      </button>)}
    </div>
  </section>;
}
