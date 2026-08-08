import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Insights | Company Management Tool',
  description: 'Insights - a complete company management tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
