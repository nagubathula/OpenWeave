import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OpenWeave',
    short_name: 'OpenWeave',
    description: 'Design editor',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e0e0e',
    theme_color: '#0e0e0e',
    icons: [
      {
        src: '/pwa-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/pwa-512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: '/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
}
