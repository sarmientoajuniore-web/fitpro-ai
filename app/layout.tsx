import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaRegister } from './pwa-register'

export const metadata: Metadata = {
  title: 'FitPro',
  description: 'Tu plataforma de fitness y entrenamiento',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FitPro',
  },
  icons: {
    icon: '/fitpro-icono-512.png',
    apple: '/fitpro-icono-192.png',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#22C55E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#10130F] text-white">
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
