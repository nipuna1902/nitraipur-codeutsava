import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GridGuard — Intelligent Distribution Anomaly Detection',
  description: 'Real-time electricity distribution anomaly detection and theft-risk command center for smart grid operators.',
  keywords: ['smart grid', 'anomaly detection', 'energy theft', 'electricity distribution', 'digital twin'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
