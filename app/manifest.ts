import brand from '@/lib/brand.json';
import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Groomed Gent Collective',
    short_name: 'Collective',
    description: 'Your private space with Cassius.',
    start_url: '/auth/continue',
    scope: '/',
    display: 'standalone',
    background_color: brand.obsidian,
    theme_color: brand.obsidian,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
