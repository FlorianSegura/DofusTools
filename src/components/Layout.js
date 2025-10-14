import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../utils/supabase/client'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar user={user} onSignOut={handleSignOut} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
