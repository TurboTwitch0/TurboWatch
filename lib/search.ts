import type { Creator, Post } from './model';

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function terms(query: string): string[] {
  return normalize(query).trim().split(/\s+/).map(term => term.replace(/^[@#]+/, '')).filter(Boolean);
}

export function matchesCreator(creator: Creator, query: string): boolean {
  const text = normalize(`${creator.name} ${creator.username} ${creator.bio}`);
  return terms(query).every(term => text.includes(term));
}

export function matchesPost(post: Post, creator: Creator | undefined, query: string): boolean {
  const text = normalize(`${post.title} ${post.description} ${post.category} ${post.tags.join(' ')} ${creator?.name || ''} ${creator?.username || ''}`);
  return terms(query).every(term => text.includes(term));
}
