'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, RotateCcw, VideoOff } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  suspended?: boolean;
  variant?: 'detail' | 'short';
}

type PlaybackPhase = 'loading' | 'ready' | 'buffering' | 'error';

function explainMediaError(error: MediaError | null): string {
  if (error?.code === 2) return 'The connection was interrupted. Check your connection and try again.';
  if (error?.code === 3) return 'This video could not be decoded. Its format may not be supported by this browser.';
  if (error?.code === 4) return 'The video is unavailable or its format is not supported by this browser.';
  return 'The video could not load. Check your connection and try again.';
}

/** Keep the native media element in place through surrounding social updates. */
export default function VideoPlayer({ src, poster, title, autoPlay = false, loop = false, muted = false, suspended = false, variant = 'detail' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resumeAfterSuspend = useRef(false);
  // Mounting behind another dialog must not schedule native autoplay. Keep
  // this decision stable so closing a dialog cannot restart a paused video.
  const initiallyAllowedPlayback = useRef(!suspended);
  const [phase, setPhase] = useState<PlaybackPhase>('loading');
  const [failure, setFailure] = useState('');

  useEffect(() => {
    // A changed source loads through the native src attribute. Calling load()
    // on ordinary renders would discard the viewer's position and playback.
    const video = videoRef.current;
    resumeAfterSuspend.current = false;
    setFailure('');
    setPhase(video && video.readyState >= 2 ? 'ready' : 'loading');
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (suspended) {
      resumeAfterSuspend.current = !video.paused && !video.ended;
      video.pause();
    } else if (resumeAfterSuspend.current) {
      resumeAfterSuspend.current = false;
      if (document.visibilityState === 'visible') void video.play().catch(() => {
        // Browser playback policy can require a fresh gesture. The native
        // play control remains available; do not retry behind the user's back.
      });
    }
  }, [suspended]);

  function retry() {
    const video = videoRef.current;
    if (!video) return;
    setFailure('');
    setPhase('loading');
    // Only an explicit retry restarts the existing native player.
    video.load();
  }

  return <div className={`video-player video-player--${variant}`} data-state={phase}>
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      controls
      playsInline
      autoPlay={autoPlay && initiallyAllowedPlayback.current}
      loop={loop}
      muted={muted}
      preload="metadata"
      aria-label={title}
      onLoadStart={() => { setFailure(''); setPhase('loading'); }}
      onLoadedData={() => setPhase('ready')}
      onCanPlay={() => setPhase('ready')}
      onPlaying={() => setPhase('ready')}
      onPlay={event => { if (suspended) event.currentTarget.pause(); }}
      onWaiting={() => setPhase('buffering')}
      onError={event => { setFailure(explainMediaError(event.currentTarget.error)); setPhase('error'); }}
    />
    {(phase === 'loading' || phase === 'buffering') && <div className="video-player-status" role="status" aria-live="polite"><LoaderCircle size={17} aria-hidden="true" /><span>{phase === 'buffering' ? 'Buffering video…' : 'Loading video…'}</span></div>}
    {phase === 'error' && <div className="video-player-error"><div className="video-player-error-card" role="alert"><VideoOff size={26} aria-hidden="true" /><strong>This video couldn’t load.</strong><p>{failure}</p><button type="button" onClick={retry}><RotateCcw size={16} aria-hidden="true" />Retry video</button><small>You can keep browsing or choose another story.</small></div></div>}
  </div>;
}
