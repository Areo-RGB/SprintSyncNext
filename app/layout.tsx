import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import PWAInstall from '@/components/pwa-install';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SprintSync',
  description: 'Real-time sprint synchronization application',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SprintSync',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'SprintSync',
    title: 'SprintSync',
    description: 'Real-time sprint synchronization application',
  },
  twitter: {
    card: 'summary',
    title: 'SprintSync',
    description: 'Real-time sprint synchronization application',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SprintSync" />
        <link rel="apple-touch-icon" href="/android-launchericon-192-192.png" />
      </head>
      <body className={inter.className}>
        {children}
        <PWAInstall />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    }, err => {
                      console.log('ServiceWorker registration failed: ', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}