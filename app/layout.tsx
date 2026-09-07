import { ClerkProvider } from '@clerk/nextjs';
import { SessionBoundary, AccountShortcut } from '@/components/account-session';
import { accountsConfigured } from '@/lib/auth-config';
import type { Metadata, Viewport } from 'next';
import brand from '@/lib/brand.json';
import './brand-tokens.css';
import './globals.css';
import './account.css';
import './cassius-identity.css';
import './gentleman.css';
import './voyage.css';
import './creative-studio.css';
import './command-dashboard.css';
import './living-materials.css';

import './spatial-system.css';
import './command-theatre.css';
import './architectural-form.css';
import './spatial-cockpit.css';
import './brand-materials.css';

import { LivingMaterials } from '@/components/living-materials';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: brand.obsidian,
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
            dynamic
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInForceRedirectUrl="/auth/continue"
            signUpForceRedirectUrl="/auth/continue"
            appearance={{
              variables: {
                colorPrimary: brand.gold,
                colorBackground: brand.surface,
                colorForeground: brand.text,
                colorMutedForeground: brand.textMuted,
                colorInput: brand.surfaceInset,
                colorInputForeground: brand.text,
                borderRadius: '10px',
              },
            }}
          >
            <SessionBoundary>
              {children}
              <AccountShortcut />
            </SessionBoundary>
          </ClerkProvider>
        ) : (
          children
        )}
        <LivingMaterials />
      </body>
    </html>
  );
}
