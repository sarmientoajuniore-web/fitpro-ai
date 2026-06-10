import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FitPro IA',
  description: 'Tu plataforma de fitness inteligente',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0a0a0a] text-white">
        {children}
      </body>
    </html>
  )
}