import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'newNews — curated team feed',
  description:
    'Curated industry news for Azure / Azure Government data-platform teams.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
