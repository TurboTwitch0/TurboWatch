import type { Metadata, Viewport } from 'next';
import { SocialProvider } from '@/lib/store';
import './globals.css';
import './showcase.css';
import './discovery-topics.css';
import './related-stories.css';
import './discovery.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://turbo-watch-turbo-twitch.vercel.app'),
  title: 'TurboWatch — Follow your curiosity.',
  description: 'Watch short stories, discover photography, save good finds, and share your point of view.',
  applicationName: 'TurboWatch',
  alternates: { canonical: '/' },
  icons: { icon: '/brand/turbowatch-icon.svg' },
  openGraph: {
    title: 'TurboWatch — Follow your curiosity.',
    description: 'Watch short stories. Save good finds. Share a point of view.',
    url: '/', siteName: 'TurboWatch', type: 'website',
    images: [{ url: '/brand/social-preview.png', width: 1200, height: 630, alt: 'TurboWatch discovery interface with labeled sample content.' }],
  },
  twitter: {
    card: 'summary_large_image', title: 'TurboWatch — Follow your curiosity.',
    description: 'Watch short stories. Save good finds. Share a point of view.',
    images: ['/brand/social-preview.png'],
  },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f5ef' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SocialProvider>{children}</SocialProvider></body></html>;
}
