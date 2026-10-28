'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Clapperboard, Image as ImageIcon, Play } from 'lucide-react';
import type { Post } from '@/lib/model';

export type ShowcaseItem = Pick<Post, 'id' | 'title' | 'mediaType' | 'mediaUrl' | 'thumbnail' | 'category'>;

/** Browsing only: covers never autoplay or replace an already opened player. */
export default function ContentShowcase<T extends ShowcaseItem>({ items, onOpen, compact = false, sample = false, title = 'Take a closer look.' }: {
  items: T[];
  onOpen: (item: T) => void;
  compact?: boolean;
  sample?: boolean;
  title?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => items[0]?.id || null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const instructionsId = useId();
  const selectedIndex = Math.max(0, items.findIndex(item => item.id === selectedId));
  const selected = items[selectedIndex];

  useEffect(() => {
    if (!items.some(item => item.id === selectedId)) setSelectedId(items[0]?.id || null);
  }, [items, selectedId]);

  function step(direction: number) {
    if (items.length < 2) return;
    setSelectedId(current => {
      const index = Math.max(0, items.findIndex(item => item.id === current));
      return items[(index + direction + items.length) % items.length].id;
    });
  }

  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || items.length < 2) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); step(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); step(1); }
    if (event.key === 'Home') { event.preventDefault(); event.stopPropagation(); setSelectedId(items[0].id); }
    if (event.key === 'End') { event.preventDefault(); event.stopPropagation(); setSelectedId(items[items.length - 1].id); }
  }

  if (!selected) return null;

  const visible: { item: T; position: 'before' | 'active' | 'after' }[] = [
    ...(items.length > 2 ? [{ item: items[(selectedIndex - 1 + items.length) % items.length], position: 'before' as const }] : []),
    { item: selected, position: 'active' },
    ...(items.length > 1 ? [{ item: items[(selectedIndex + 1) % items.length], position: 'after' as const }] : []),
  ];

  return <section className={`content-showcase${compact ? ' is-compact' : ''}`} aria-label="Content showcase" data-active-id={selected.id} onKeyDown={keyboard}>
    <div className="showcase-heading"><span className="showcase-kicker"><span aria-hidden="true" />{sample ? 'SAMPLE LIBRARY / IN FOCUS' : 'DISCOVER / IN FOCUS'}</span>{!compact && <h2>{title}</h2>}<span className="showcase-edition" aria-hidden="true">A DIFFERENT POINT OF VIEW</span></div>
    <div className="showcase-stage" data-testid="showcase-stage" tabIndex={0} aria-label="Browse discoveries" aria-describedby={instructionsId}
      onTouchStart={event => { const touch = event.touches[0]; touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null; }}
      onTouchEnd={event => {
        const start = touchStart.current; touchStart.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch || items.length < 2) return;
        const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          suppressClickUntil.current = Date.now() + 350;
          step(dx < 0 ? 1 : -1);
        }
      }}
      onTouchCancel={() => { touchStart.current = null; }}>
      <span className="showcase-light" aria-hidden="true" /><span className="showcase-ring showcase-ring--one" aria-hidden="true" /><span className="showcase-ring showcase-ring--two" aria-hidden="true" /><span className="showcase-floor" aria-hidden="true" />
      {visible.map(({ item, position }) => {
        const cover = item.thumbnail || (item.mediaType === 'image' ? item.mediaUrl : '/media/media-unavailable.svg');
        return <button key={item.id} className={`showcase-card is-${position}`} aria-current={position === 'active' ? 'true' : undefined} tabIndex={position === 'active' ? 0 : -1} aria-hidden={position === 'active' ? undefined : true}
          aria-label={position === 'active' ? `Open focused story: ${item.title}` : `Focus discovery: ${item.title}`}
          onClick={() => { if (Date.now() < suppressClickUntil.current) return; if (position === 'active') onOpen(item); else setSelectedId(item.id); }}>
          <img className="showcase-cover" src={cover} alt="" loading="eager" draggable={false} onError={event => { if (!event.currentTarget.src.endsWith('/media/media-unavailable.svg')) event.currentTarget.src = '/media/media-unavailable.svg'; }} />
          <span className="showcase-card-shade" aria-hidden="true" /><span className="showcase-format">{item.mediaType === 'video' ? <Clapperboard size={14} /> : <ImageIcon size={14} />}{item.mediaType === 'video' ? 'SHORT STORY' : 'A GOOD FIND'}</span>
          {position === 'active' && <span className="showcase-card-action" aria-hidden="true">{item.mediaType === 'video' ? <Play size={23} fill="currentColor" /> : <ArrowUpRight size={25} />}</span>}
          <span className="showcase-card-caption"><small>{item.category}</small><strong>{item.title}</strong></span>
        </button>;
      })}
    </div>
    <div className="showcase-footer">
      <div className="showcase-selection"><span>{selected.category}</span><p className="showcase-title" aria-live="polite" aria-atomic="true">{selected.title}</p></div>
      <div className="showcase-controls">
        <button className="showcase-action" onClick={() => onOpen(selected)}>{selected.mediaType === 'video' ? 'Watch this story' : 'Open this photo'}<ArrowUpRight size={18} /></button>
        {items.length > 1 && <div className="showcase-arrows"><button aria-label="Previous discovery" onClick={() => step(-1)}><ArrowLeft size={19} /></button><span className="showcase-counter" aria-label={`Discovery ${selectedIndex + 1} of ${items.length}`}>{String(selectedIndex + 1).padStart(2, '0')}<span>/</span>{String(items.length).padStart(2, '0')}</span><button aria-label="Next discovery" onClick={() => step(1)}><ArrowRight size={19} /></button></div>}
      </div>
    </div>
    {items.length > 1 && items.length <= 6 && <div className="showcase-dots" aria-label="Choose a discovery">{items.map((item, index) => <button key={item.id} aria-label={`Focus discovery ${index + 1}: ${item.title}`} aria-pressed={selected.id === item.id} onClick={() => setSelectedId(item.id)}><span /></button>)}</div>}
    <p className="showcase-note" id={instructionsId}>{sample ? 'Sample content · not published community posts' : 'Posts from this community'}<span aria-hidden="true"> · </span>{items.length > 1 ? 'Use the arrows, left/right keys, or swipe to explore.' : 'Open the story to take a closer look.'}</p>
  </section>;
}
