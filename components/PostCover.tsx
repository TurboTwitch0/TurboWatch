'use client';

import type { Post } from '@/lib/model';

export default function PostCover({ post, eager = false }: { post: Post; eager?: boolean }) {
  return post.mediaType === 'video' && !post.thumbnail
    ? <video src={post.mediaUrl} muted playsInline preload="metadata" aria-label={post.title} />
    : <img src={post.thumbnail || post.mediaUrl} alt={post.title} loading={eager ? 'eager' : 'lazy'} onError={e => { e.currentTarget.src = '/media/media-unavailable.svg'; }} />;
}
