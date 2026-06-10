'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Dumbbell,
  Salad,
  ListChecks,
  TrendingUp,
  Brain
} from 'lucide-react'

const links = [
  { href: '/inicio',     label: 'Inicio',     icon: LayoutDashboard },
  { href: '/ejercicios', label: 'Ejercicios', icon: Dumbbell },
  { href: '/nutricion',  label: 'Nutrición',  icon: Salad },
  { href: '/rutinas',    label: 'Rutinas',    icon: ListChecks },
  { href: '/progreso',   label: 'Progreso',   icon: TrendingUp },
  { href: '/ia',         label: 'IA',         icon: Brain },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#111111] border-t border-white/8 flex max-w-lg mx-auto">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors
              ${active ? 'text-[#F5C518]' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}