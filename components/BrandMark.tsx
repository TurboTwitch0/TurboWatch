import type { CSSProperties } from 'react';

/** The original TurboWatch spark, shared by the app and exportable brand kit. */
export default function BrandMark({ compact = false, theme = 'light', className = '', style }: {
  compact?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
  style?: CSSProperties;
}) {
  return <span className={`brand-lockup theme-${theme}${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`} style={style} role="img" aria-label="TurboWatch">
    <svg className="brand-symbol" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="18" fill="#e64c36" /><path d="M17 18h31L34 31h13L20 50l8-17H17z" fill="#fffaf2" /></svg>
    {!compact && <span className="brand-wordmark" aria-hidden="true">turbo<span className="brand-wordmark-light">watch</span><span className="brand-period">.</span></span>}
  </span>;
}
