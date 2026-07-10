'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, UserCircle } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-[#F4F6F1] border-b border-black/[0.08] px-5 py-3 flex items-center justify-between max-w-lg mx-auto w-full">
      <h1 className="text-lg font-bold text-[#1b201a] tracking-tight">
        Fit<span className="text-[#F5C518]">Pro</span> IA
      </h1>
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-black/[0.08] flex items-center justify-center text-[#5d6358] hover:text-[#1b201a] transition-colors">
          <Bell size={18} />
        </button>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-black/[0.08] flex items-center justify-center text-[#5d6358] hover:text-[#1b201a] transition-colors"
        >
          <UserCircle size={18} />
        </button>
      </div>
    </header>
  )
}