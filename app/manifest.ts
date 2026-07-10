import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FitPro',
    short_name: 'FitPro',
    description: 'Tu plataforma de fitness y entrenamiento',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#10130F',
    theme_color: '#22C55E',
    icons: [
      {
        src: '/fitpro-icono-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/fitpro-icono-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/fitpro-icono-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['health', 'fitness', 'sports'],
  }
}
