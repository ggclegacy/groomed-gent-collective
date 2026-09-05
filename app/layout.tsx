import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'The Collective | Groomed Gent Co.',
  description:
    'The Groomed Gent Collective. A considered space for those who represent the brand.',
  icons: { icon: '/favicon.svg' },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
