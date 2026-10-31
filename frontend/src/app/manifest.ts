import type { MetadataRoute } from 'next';

/** Lets browsers offer "Install app": own window, own icon, and a home screen shortcut on phones. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Insights HRMS',
    short_name: 'Insights',
    description: 'Insights - a complete company management tool',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfbf5',
    theme_color: '#fbfbf5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
