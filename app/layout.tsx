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
    icon: '/icons/icon-512',
    apple: '/apple-icon',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#FF6B57',
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
      <body className="min-h-screen bg-[#FFF8F3] text-[#1b201a]">
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
