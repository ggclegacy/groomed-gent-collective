import { ClerkProvider } from '@clerk/nextjs';
import { SessionBoundary } from '@/components/account-session';
import { accountsConfigured } from '@/lib/auth-config';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './cassius-identity.css';
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
import './rich-gold.css';
import './luminous-depth.css';
import { LivingMaterials } from '@/components/living-materials';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1512',
};
export const metadata: Metadata = {
  title: 'The Collective | Groomed Gent Co.',
  description:
    'Your private gentleman’s operating system. Powered by Cassius, connected through the Collective.',
  icons: { icon: '/favicon.svg', apple: '/icons/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Collective',
  },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>
        {accountsConfigured() ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInForceRedirectUrl="/auth/continue"
            signUpForceRedirectUrl="/auth/continue"
            appearance={{
              variables: {
                colorPrimary: '#c8a65c',
                colorBackground: '#0b1512',
                colorForeground: '#eee9df',
                colorMutedForeground: '#b6beb7',
                colorInput: '#090f0d',
                colorInputForeground: '#eee9df',
                borderRadius: '14px',
              },
            }}
          >
            <SessionBoundary>{children}</SessionBoundary>
          </ClerkProvider>
        ) : (
          children
        )}
        <LivingMaterials />
      </body>
    </html>
  );
}
