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
    <header className="sticky top-0 z-50 bg-[#10130F] border-b border-white/8 px-5 py-3 flex items-center justify-between max-w-lg mx-auto w-full">
      <h1 className="text-lg font-bold text-white tracking-tight">
        Fit<span className="text-[#F5C518]">Pro</span> IA
      </h1>
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-full bg-[#191D17] border border-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <Bell size={18} />
        </button>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full bg-[#191D17] border border-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <UserCircle size={18} />
        </button>
      </div>
    </header>
  )
}