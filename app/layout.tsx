import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { NoCopyWrapper } from '@/components/NoCopyWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chart Streak',
  description: 'Watermarked, access-controlled Google Sheets viewer',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Chart Streak',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <NoCopyWrapper>{children}</NoCopyWrapper>
        </Providers>
      </body>
    </html>
  );
}
