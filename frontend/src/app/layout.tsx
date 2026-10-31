import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { AlertsHost } from '@/components/alerts-host';
import { InstallCapture } from '@/components/install-capture';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Insights | Company Management Tool',
  description: 'Insights - a complete company management tool',
  applicationName: 'Insights',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  // iPhone: how the site looks once it is on the Home Screen.
  appleWebApp: { capable: true, title: 'Insights', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbf5' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

// Applies a previously chosen theme before first paint, so switching pages or reloading
// never flashes the wrong color scheme. Runs before hydration; falls back to the OS
// preference (handled purely in CSS) when no explicit choice has been stored.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
        <AlertsHost />
        <InstallCapture />
      </body>
    </html>
  );
}
