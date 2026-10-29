'use client';

import { useId, useMemo } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Post } from '@/lib/model';

interface DiscoveryTopicsProps {
  items: Post[];
  onSelect: (category: string) => void;
}

/** Public post covers make each topic a genuine route into the current library. */
export default function DiscoveryTopics({ items, onSelect }: DiscoveryTopicsProps) {
  const headingId = useId();
  const topics = useMemo(() => {
    const grouped = new Map<string, { category: string; count: number; cover: string }>();
    for (const post of items) {
      const category = post.category.trim();
      if (!category) continue;
      const cover = post.thumbnail || (post.mediaType === 'image' ? post.mediaUrl : '');
      const existing = grouped.get(category);
      if (existing) {
        existing.count += 1;
        // Prefer a usable image without instantiating a video just for a tile.
        if (!existing.cover && cover) existing.cover = cover;
      } else {
        grouped.set(category, { category, count: 1, cover });
      }
    }
    // Post order already follows the library; likes do not reorder these tiles.
    return Array.from(grouped.values()).slice(0, 5);
  }, [items]);

  if (!topics.length) return null;

  return <section className="discovery-topics" aria-labelledby={headingId}>
    <div className="discovery-topics-heading">
      <div><p className="discovery-topics-kicker">A DIFFERENT WAY IN</p><h2 id={headingId}>Pick a <em>direction.</em></h2></div>
      <p>Follow a subject.<br />See where it takes you.</p>
    </div>
    <div className="discovery-topics-grid" data-count={topics.length}>
      {topics.map((topic, index) => <button
        key={topic.category}
        className={`discovery-topic-card${index === 0 ? ' is-lead' : ''}`}
        data-category={topic.category}
        onClick={() => onSelect(topic.category)}
        aria-label={`Explore ${topic.category}, ${topic.count} ${topic.count === 1 ? 'post' : 'posts'}`}
      >
        <img
          src={topic.cover || '/media/media-unavailable.svg'}
          alt=""
          loading="lazy"
          decoding="async"
          onError={event => { if (event.currentTarget.getAttribute('src') !== '/media/media-unavailable.svg') event.currentTarget.src = '/media/media-unavailable.svg'; }}
        />
        <span className="discovery-topic-shade" aria-hidden="true" />
        <span className="discovery-topic-index" aria-hidden="true">0{index + 1}</span>
        <span className="discovery-topic-arrow" aria-hidden="true"><ArrowUpRight size={19} /></span>
        <span className="discovery-topic-copy">
          <span className="discovery-topic-count">{topic.count} {topic.count === 1 ? 'post' : 'posts'} to explore</span>
          <strong>{topic.category}</strong>
          {index === 0 && <span className="discovery-topic-action">Explore this direction <ArrowRight size={17} /></span>}
        </span>
      </button>)}
    </div>
  </section>;
}
