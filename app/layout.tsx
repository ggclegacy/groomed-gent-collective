import type { Metadata } from 'next';
import './globals.css';
import './gentleman.css';
import './voyage.css';
import './creative-studio.css';
import './command-dashboard.css';
import './living-materials.css';
import './brand-materials.css';
import './spatial-system.css';
import './command-theatre.css';
import './architectural-form.css';
import './spatial-cockpit.css';
import { LivingMaterials } from '@/components/living-materials';
export const metadata: Metadata = {
  title: 'The Collective | Groomed Gent Co.',
  description:
    'Your private gentleman’s operating system. Powered by Cassius, connected through the Collective.',
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
