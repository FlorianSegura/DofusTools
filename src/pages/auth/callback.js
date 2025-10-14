import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../../utils/supabase/client'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      // Get the session from the URL
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth error:', error)
        router.replace('/login')
        return
      }

      if (session) {
        // Use replace instead of push to avoid history entry
        router.replace('/')
      } else {
        router.replace('/login')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center">
        <div className="bg-white p-8 rounded-lg shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Authenticating...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Please wait</p>
        </div>
      </div>
    </div>
  )
}
