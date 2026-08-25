import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Great_Vibes, Outfit } from 'next/font/google';
import './globals.css';

const script = Great_Vibes({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-script',
});

const display = Cormorant_Garamond({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const sans = Outfit({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Find your seat | Deborah & Itaka',
  description: 'Search your name to find your table at the wedding of Deborah and Itaka.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom is deliberately left enabled — capping it is an accessibility failure.
  themeColor: '#fcfaff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${script.variable} ${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
