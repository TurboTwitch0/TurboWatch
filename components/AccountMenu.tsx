'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useSocial } from '@/lib/store';
import Avatar from './Avatar';

export default function AccountMenu({ onProfile, onSignedOut }: { onProfile: () => void; onSignedOut: () => void }) {
  const { user, signOut } = useSocial();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  async function leave() {
    setBusy(true); setError('');
    try { await signOut(); setOpen(false); onSignedOut(); }
    catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : 'Could not sign out. Please try again.'); }
    finally { setBusy(false); }
  }

  return <div className="account-menu-wrap" ref={container}>
    <button className="account-menu-trigger" ref={trigger} aria-label="Account menu" aria-expanded={open} aria-controls="account-menu-panel" onClick={() => setOpen(value => !value)}><Avatar person={user} /><ChevronDown size={14} /></button>
    {open && <nav className="account-menu" id="account-menu-panel" aria-label="Your account" onBlur={event => { if (event.relatedTarget && !event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <div className="account-menu-summary"><strong>{user?.name || 'Your account'}</strong><small>{user ? `@${user.username}` : 'Your profile could not be loaded.'}</small></div>
      {user && <button onClick={() => { setOpen(false); onProfile(); }}><UserRound size={18} />My profile</button>}
      <button onClick={() => void leave()} disabled={busy}><LogOut size={18} />{busy ? 'Signing out…' : 'Sign out'}</button>
      {error && <p role="alert">{error}</p>}
    </nav>}
  </div>;
}
