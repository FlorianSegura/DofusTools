import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../utils/supabase/client'
import Layout from '../components/Layout'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        setLoading(false)
      } else {
        router.push('/login')
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
        setLoading(false)
      } else {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Bienvenue, {user.user_metadata?.full_name}! 🎉
        </h1>

        <div className="grid gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h2>
            <p className="text-gray-600 mb-4">
              Bienvenue sur Dofus Tools. Utilisez le menu latéral pour naviguer.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">✅ Fonctionnalités disponibles :</h3>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li>Authentification Google OAuth via Supabase</li>
                <li>Navigation avec sidebar</li>
                <li>Base de données PostgreSQL (Supabase)</li>
                <li>Tableau XP Familier</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
