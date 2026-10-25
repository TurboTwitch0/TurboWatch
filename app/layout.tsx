import type { Metadata, Viewport } from 'next';
import { SocialProvider } from '@/lib/store';
import './globals.css';

export const metadata: Metadata = {
  title: 'TurboWatch — Stay curious.',
  description: 'A home for your next rabbit hole. Watch, discover, collect, and connect with a world of creative people.',
  applicationName: 'TurboWatch',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f6f2' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SocialProvider>{children}</SocialProvider></body></html>;
}
