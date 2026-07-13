import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PorotoFit',
    short_name: 'PorotoFit',
    description: 'Tu plataforma de fitness y entrenamiento',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#141414',
    theme_color: '#141414',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['health', 'fitness', 'sports'],
  }
}
