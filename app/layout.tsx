import type { Metadata } from 'next';
import './globals.css';
import './creative-studio.css';
import './command-dashboard.css';
import './living-materials.css';
import { LivingMaterials } from '@/components/living-materials';
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
      <body>
        {children}
        <LivingMaterials />
      </body>
    </html>
  );
}
