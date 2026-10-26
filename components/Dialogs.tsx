'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, Copy, Film, FolderHeart, ImagePlus, Link, LoaderCircle, Mail, Send, Sparkles, UploadCloud, X } from 'lucide-react';
import type { Post } from '@/lib/model';
import { useSocial } from '@/lib/store';
import { sitePath } from '@/lib/navigation';

type CloseProps = { onClose: () => void };

type ActiveDialog = {
  panel: HTMLDivElement;
  backdrop: HTMLDivElement;
  close: () => void;
  restoreFocus: HTMLElement | null;
  restoreOwner?: ActiveDialog;
};

// Keep one keyboard/focus owner even when a dialog opens another dialog.
const activePanels: ActiveDialog[] = [];
let bodyOverflow: { value: string; priority: string } | null = null;

function focusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(
    'a[href], button, input:not([type="hidden"]), select, textarea, video[controls], audio[controls], [contenteditable="true"], [tabindex]'
  )).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
}

function focusDialog(entry: ActiveDialog, preferred?: HTMLElement | null) {
  const autofocus = entry.panel.querySelector<HTMLElement>('[data-autofocus]');
  const target = preferred?.isConnected && entry.panel.contains(preferred)
    ? preferred
    : autofocus && autofocus.getClientRects().length > 0 && !autofocus.matches(':disabled')
      ? autofocus
      : focusableElements(entry.panel)[0] ?? entry.panel;
  target.focus({ preventScroll: true });
}

function syncDialogStack() {
  const top = activePanels.at(-1);
  // Activate the new top before moving focus out of an underlying panel.
  if (top) {
    top.panel.inert = false;
    top.backdrop.inert = false;
    top.panel.removeAttribute('aria-hidden');
    top.panel.setAttribute('aria-modal', 'true');
  }
  for (const [index, entry] of activePanels.entries()) {
    const isTop = entry === top;
    entry.backdrop.style.zIndex = String(1000 + index);
    if (!isTop) {
      entry.panel.inert = true;
      entry.backdrop.inert = true;
      entry.panel.setAttribute('aria-hidden', 'true');
      entry.panel.setAttribute('aria-modal', 'false');
    }
  }
}

function handleDialogKeyDown(event: KeyboardEvent) {
  const top = activePanels.at(-1);
  if (!top) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) top.close();
    return;
  }
  if (event.key !== 'Tab') return;
  const elements = focusableElements(top.panel);
  if (!elements.length) { event.preventDefault(); top.panel.focus({ preventScroll: true }); return; }
  const first = elements[0];
  const last = elements[elements.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !elements.includes(active as HTMLElement))) {
    event.preventDefault(); last.focus({ preventScroll: true });
  } else if (!event.shiftKey && (active === last || !elements.includes(active as HTMLElement))) {
    event.preventDefault(); first.focus({ preventScroll: true });
  }
}

function handleDialogFocus(event: FocusEvent) {
  const top = activePanels.at(-1);
  if (top && event.target instanceof Node && !top.panel.contains(event.target)) focusDialog(top);
}

function registerDialog(entry: ActiveDialog) {
  entry.restoreOwner = activePanels.find(candidate => !!entry.restoreFocus && candidate.panel.contains(entry.restoreFocus));
  if (!activePanels.length) {
    bodyOverflow = { value: document.body.style.getPropertyValue('overflow'), priority: document.body.style.getPropertyPriority('overflow') };
    document.body.style.setProperty('overflow', 'hidden');
    document.addEventListener('keydown', handleDialogKeyDown, true);
    document.addEventListener('focusin', handleDialogFocus, true);
  }
  activePanels.push(entry);
  // Focus the new dialog before hiding the previously focused panel from AT.
  entry.panel.inert = false;
  entry.backdrop.inert = false;
  entry.panel.removeAttribute('aria-hidden');
  focusDialog(entry);
  syncDialogStack();
  return () => {
    const index = activePanels.indexOf(entry);
    if (index < 0) return;
    const wasTop = index === activePanels.length - 1;
    activePanels.splice(index, 1);
    // A parent can unmount first. Its child's final focus target must survive it.
    for (const remaining of activePanels) {
      if (remaining.restoreOwner === entry || (remaining.restoreFocus && entry.panel.contains(remaining.restoreFocus))) {
        remaining.restoreFocus = entry.restoreFocus;
        remaining.restoreOwner = entry.restoreOwner;
      }
    }
    entry.panel.inert = false;
    entry.backdrop.inert = false;
    entry.panel.removeAttribute('aria-hidden');
    entry.panel.removeAttribute('aria-modal');
    entry.backdrop.style.removeProperty('z-index');
    syncDialogStack();
    const top = activePanels.at(-1);
    if (!top) {
      document.removeEventListener('keydown', handleDialogKeyDown, true);
      document.removeEventListener('focusin', handleDialogFocus, true);
      if (bodyOverflow?.value) document.body.style.setProperty('overflow', bodyOverflow.value, bodyOverflow.priority);
      else document.body.style.removeProperty('overflow');
      bodyOverflow = null;
      if (wasTop && entry.restoreFocus?.isConnected) entry.restoreFocus.focus({ preventScroll: true });
    } else if (wasTop) focusDialog(top, entry.restoreFocus);
  };
}

export function Dialog({ title, onClose, children, className = '' }: CloseProps & { title: string; children: ReactNode; className?: string }) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || !panel.current || !backdrop.current) return;
    return registerDialog({
      panel: panel.current,
      backdrop: backdrop.current,
      close: () => close.current(),
      restoreFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    });
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div className="dialog-backdrop" ref={backdrop} onMouseDown={event => { if (event.target === event.currentTarget && activePanels.at(-1)?.panel === panel.current) close.current(); }}>
      <div className={`dialog-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel} tabIndex={-1}>
        <header className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={() => { if (activePanels.at(-1)?.panel === panel.current) close.current(); }}><X size={21} /></button>
        </header>
        {children}
      </div>
    </div>, document.body
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') return '';
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function validMediaUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const url = new URL(value, window.location.origin);
    return ['https:', 'http:'].includes(url.protocol);
  } catch { return false; }
}

export function CreateDialog({ onClose, onCreated }: CloseProps & { onCreated?: (post: Post) => void }) {
  const { createPost, uploadMedia, mode, user } = useSocial();
  const [type, setType] = useState<'image' | 'video'>('image');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Travel');
  const [aspect, setAspect] = useState<'portrait' | 'landscape' | 'square'>('portrait');
  const [url, setUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    return () => URL.revokeObjectURL(localUrl);
  }, [file]);

  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    setError('');
    if (!candidate.type.startsWith('image/') && !candidate.type.startsWith('video/')) {
      setError('Choose an image or video file.'); return;
    }
    const limit = (mode === 'demo' ? 2 : 50) * 1024 * 1024;
    if (candidate.size > limit) { setError(`Choose a file smaller than ${mode === 'demo' ? 2 : 50} MB.`); return; }
    setFile(candidate);
    setUrl('');
    setType(candidate.type.startsWith('video/') ? 'video' : 'image');
  };

  const switchType = (next: 'image' | 'video') => {
    if (next === type) return;
    setType(next); setFile(null);
    if (input.current) input.current.value = '';
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!user) { setError('Sign in before publishing a post.'); return; }
    if (!title.trim()) { setError('Give your post a title.'); return; }
    if (!file && !validMediaUrl(url)) { setError('Add an image or video file, or a valid media URL.'); return; }
    if (thumbnail && !validMediaUrl(thumbnail)) { setError('Use a valid URL for the video cover.'); return; }
    setBusy(true);
    try {
      const mediaUrl = file ? await uploadMedia(file) : url.trim();
      const post = await createPost({
        title: title.trim(), description: description.trim(), mediaType: type,
        mediaUrl, thumbnail: type === 'image' ? mediaUrl : thumbnail.trim(),
        category, tags: description.match(/#[\p{L}\p{N}_]+/gu)?.map(tag => tag.slice(1)) ?? [], aspect
      });
      onCreated?.(post);
      onClose();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  };

  return <Dialog title="Make something worth sharing." onClose={onClose} className="create-dialog">
    <p className="dialog-intro">A new perspective. A small discovery. Your next big idea.</p>
    <form className="form-stack" onSubmit={submit}>
      <div className="tabs media-type-tabs" aria-label="Post format">
        <button type="button" className={type === 'image' ? 'active' : ''} onClick={() => switchType('image')}><ImagePlus size={17} />Photo</button>
        <button type="button" className={type === 'video' ? 'active' : ''} onClick={() => switchType('video')}><Film size={17} />Video</button>
      </div>
      <div className={`upload-zone ${preview ? 'has-preview' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}>
        {preview ? <>
          {type === 'image' ? <img src={preview} alt="Your upload preview" /> : <video src={preview} controls preload="metadata" />}
          <button type="button" className="secondary-button" onClick={() => { setFile(null); if (input.current) input.current.value = ''; }}>Remove file</button>
        </> : <>
          <UploadCloud size={30} strokeWidth={1.5} />
          <strong>Drop your {type === 'image' ? 'photo' : 'video'} here</strong>
          <span>or choose a file to upload · up to {mode === 'demo' ? 2 : 50} MB</span>
          <button type="button" className="secondary-button" onClick={() => input.current?.click()}>Choose file</button>
        </>}
        <input ref={input} type="file" accept={type === 'image' ? 'image/*' : 'video/*'} aria-label="Upload media" onChange={event => chooseFile(event.target.files?.[0])} hidden />
      </div>
      {!file && <label className="field"><span className="input-label">Or use a {type} link</span><input type="url" placeholder={`https://example.com/your-${type}.${type === 'image' ? 'jpg' : 'mp4'}`} value={url} onChange={event => setUrl(event.target.value)} /></label>}
      {type === 'video' && <label className="field"><span className="input-label">Cover image URL <span className="optional-label">(optional)</span></span><input type="url" placeholder="https://example.com/cover.jpg" value={thumbnail} onChange={event => setThumbnail(event.target.value)} /></label>}
      <label className="field"><span className="input-label">Title</span><input required maxLength={120} placeholder="Give it a good title" value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label className="field"><span className="input-label">Caption</span><textarea rows={3} maxLength={2000} placeholder="Tell the story. Add a few #tags." value={description} onChange={event => setDescription(event.target.value)} /></label>
      <div className="form-row">
        <label className="field"><span className="input-label">Category</span><select value={category} onChange={event => setCategory(event.target.value)}>{['Travel', 'Design', 'Food', 'Style', 'Music', 'Outdoors', 'Art', 'Architecture', 'Film', 'Lifestyle'].map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span className="input-label">Frame</span><select value={aspect} onChange={event => setAspect(event.target.value as typeof aspect)}><option value="portrait">Portrait</option><option value="landscape">Landscape</option><option value="square">Square</option></select></label>
      </div>
      {mode === 'demo' && <p className="info-note"><Sparkles size={16} /> Demo posts are saved in this browser.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={busy || !user}>{busy ? <LoaderCircle size={18} className="spin" /> : <ArrowUpRight size={18} />}{busy ? 'Publishing…' : 'Publish post'}</button>
    </form>
  </Dialog>;
}

export function EditProfileDialog({ onClose }: CloseProps) {
  const { user, updateProfile } = useSocial();
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!name.trim()) { setError('Add your name.'); return; }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) { setError('Your username needs 3–24 letters, numbers, or underscores.'); return; }
    if (avatar && !validMediaUrl(avatar)) { setError('Use a valid image URL for your avatar.'); return; }
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), username: username.trim().toLowerCase(), bio: bio.trim(), avatar: avatar.trim() });
      onClose();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  };
  return <Dialog title="A little more you." onClose={onClose}>
    <p className="dialog-intro">Make your corner of TurboWatch feel like home.</p>
    <form className="form-stack" onSubmit={submit}>
      <label className="field"><span className="input-label">Name</span><input data-autofocus required maxLength={60} value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label>
      <label className="field"><span className="input-label">Username</span><input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" /></label>
      <label className="field"><span className="input-label">Bio</span><textarea rows={3} maxLength={240} placeholder="What are you into?" value={bio} onChange={event => setBio(event.target.value)} /><span className="field-hint">{bio.length}/240</span></label>
      <label className="field"><span className="input-label">Profile photo URL <span className="optional-label">(optional)</span></span><input value={avatar} onChange={event => setAvatar(event.target.value)} placeholder="https://example.com/your-photo.jpg" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="primary-button" disabled={busy || !user}>{busy ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />}{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
  </Dialog>;
}

export function AuthDialog({ onClose }: CloseProps) {
  const { mode, user, signIn, signUp } = useSocial();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try {
      if (tab === 'signup') {
        await signUp(email.trim(), password, name.trim());
        setSuccess('Your account request is complete. Check your email for a confirmation link if you are not signed in yet.');
      } else { await signIn(email.trim(), password); onClose(); }
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  };

  if (mode === 'demo') return <Dialog title="Welcome to your next rabbit hole." onClose={onClose}>
    <div className="auth-demo">
      <div className="dialog-illustration"><Sparkles size={36} strokeWidth={1.5} /></div>
      <h3>You’re exploring the demo.</h3>
      <p>Like, save, post, and make this space yours as {user?.name ?? 'a demo creator'}. Your changes stay in this browser.</p>
      <p>Live accounts and conversations with other people will be available when the site is connected.</p>
      <button className="primary-button" onClick={onClose}>Keep exploring <ArrowUpRight size={18} /></button>
    </div>
  </Dialog>;

  return <Dialog title={tab === 'signin' ? 'Good to have you back.' : 'Find your people.'} onClose={onClose}>
    <p className="dialog-intro">A place for the things you love. And the things you haven’t found yet.</p>
    <div className="tabs auth-tabs" aria-label="Account access">
      <button type="button" className={tab === 'signin' ? 'active' : ''} onClick={() => { setTab('signin'); setError(''); setSuccess(''); }}>Sign in</button>
      <button type="button" className={tab === 'signup' ? 'active' : ''} onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}>Create account</button>
    </div>
    <form className="form-stack" onSubmit={submit}>
      {tab === 'signup' && <label className="field"><span className="input-label">Your name</span><input required maxLength={60} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>}
      <label className="field"><span className="input-label">Email address</span><input data-autofocus required type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="field"><span className="input-label">Password</span><input required minLength={8} type="password" autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} placeholder={tab === 'signup' ? 'At least 8 characters' : 'Your password'} value={password} onChange={event => setPassword(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="info-note" role="status"><Mail size={18} />{success}</p>}
      <button type="submit" className="primary-button" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : <ArrowUpRight size={18} />}{busy ? 'One moment…' : tab === 'signin' ? 'Sign in' : 'Create account'}</button>
    </form>
  </Dialog>;
}

export function NewBoardDialog({ onClose }: CloseProps) {
  const { createBoard } = useSocial();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!name.trim()) { setError('Give your collection a name.'); return; }
    setBusy(true);
    try { await createBoard(name.trim()); onClose(); }
    catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  };
  return <Dialog title="A home for your next obsession." onClose={onClose}>
    <div className="dialog-illustration"><FolderHeart size={34} strokeWidth={1.5} /></div>
    <p className="dialog-intro">Put your favorite discoveries together in a collection.</p>
    <form className="form-stack" onSubmit={submit}>
      <label className="field"><span className="input-label">Collection name</span><input data-autofocus required maxLength={60} placeholder="Places I’ll go, spaces I love…" value={name} onChange={event => setName(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : <FolderHeart size={18} />}{busy ? 'Creating…' : 'Create collection'}</button>
    </form>
  </Dialog>;
}

export function ShareDialog({ post, onClose }: CloseProps & { post: Post }) {
  const { mode } = useSocial();
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [nativeShare, setNativeShare] = useState(false);
  const linkInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const link = new URL(sitePath({ post: post.id }, window.location.search), window.location.origin);
    setUrl(link.toString());
    setNativeShare(typeof navigator.share === 'function');
  }, [post.id]);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url); setCopied(true); setError('');
    } catch {
      linkInput.current?.focus(); linkInput.current?.select();
      setError('Select and copy the link above to share it.');
    }
  };
  const share = async () => {
    try { await navigator.share({ title: post.title, text: post.description, url }); }
    catch (caught) { if (!(caught instanceof DOMException && caught.name === 'AbortError')) setError('Sharing could not be opened. You can copy the link instead.'); }
  };
  return <Dialog title="Good things are better shared." onClose={onClose}>
    <div className="share-preview">
      {post.thumbnail ? <img src={post.thumbnail} alt="" /> : <div className="share-preview-placeholder"><Film size={25} /></div>}
      <div><span className="input-label">SHARE A DISCOVERY</span><h3>{post.title}</h3><p>{post.category}</p></div>
    </div>
    <div className="form-stack">
      <label className="field"><span className="input-label"><Link size={14} /> Post link</span><input ref={linkInput} readOnly value={url} onFocus={event => event.target.select()} /></label>
      <button className="primary-button" onClick={copy} disabled={!url}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'Link copied' : 'Copy link'}</button>
      {nativeShare && <button className="secondary-button" onClick={share}><Send size={17} />More ways to share</button>}
      {error && <p className="info-note" role="status">{error}</p>}
      {mode === 'demo' && <p className="share-hint">Posts you create in demo mode are only available in this browser.</p>}
    </div>
  </Dialog>;
}
