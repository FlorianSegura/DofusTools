import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Sidebar({ user, onSignOut }) {
  const router = useRouter()

  const menuItems = [
    {
      name: 'Xp familier',
      path: '/xp-familier',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      name: 'API Dofusdude',
      path: '/api-dofusdude',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      name: 'Xp item',
      path: '/ressources',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ]

  return (
    <div className="w-64 bg-white h-screen shadow-lg fixed left-0 top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <img src="/favicon.png" alt="Dofus Tools" className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Dofus Tools</h1>
          </div>
        </Link>
      </div>

      {/* Menu Items */}
      <nav className="mt-6 flex-1">
        {menuItems.map((item) => {
          const isActive = router.pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile & Sign Out at Bottom */}
      {user && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.full_name || 'User'}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-700 truncate">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  )
}
