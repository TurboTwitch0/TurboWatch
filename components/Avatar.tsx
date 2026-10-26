'use client';

import type { Creator } from '@/lib/model';

export default function Avatar({ person, size = '', onClick }: { person?: Creator | null; size?: string; onClick?: () => void }) {
  const initials = (person?.name || 'Your profile').split(' ').map(s => s[0]).slice(0, 2).join('');
  const content = person?.avatar ? <img src={person.avatar} alt="" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.setAttribute('data-initials', initials); }} /> : initials;
  return onClick ? <button className={`avatar ${size}`} onClick={onClick} aria-label={`View ${person?.name || 'your'} profile`}>{content}</button> : <span className={`avatar ${size}`} aria-hidden="true">{content}</span>;
}
