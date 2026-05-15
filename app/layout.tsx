import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
});

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-retro',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'newNews — curated team feed',
  description:
    'Curated industry news for Azure / Azure Government data-platform teams.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pressStart.variable} ${vt323.variable}`}>
      <body>{children}</body>
    </html>
  );
}
