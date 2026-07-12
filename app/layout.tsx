import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaRegister } from './pwa-register'

export const metadata: Metadata = {
  title: 'PorotoFit',
  description: 'Tu plataforma de fitness y entrenamiento',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PorotoFit',
  },
  icons: {
    icon: '/icons/icon-512',
    apple: '/apple-icon',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#141414',
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
      <body className="min-h-screen bg-[#FFFFFF] text-[#1b201a]">
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
