import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'

export default function Sidebar({ user, onSignOut }) {
  const router = useRouter()
  const [avatarError, setAvatarError] = useState(false)
  const [openCategories, setOpenCategories] = useState({ familier: true }) // Familier ouvert par défaut

  const menuItems = [
    {
      name: 'Familier',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
      ),
      isCategory: true,
      categoryKey: 'familier',
      subItems: [
        {
          name: 'Xp familier',
          path: '/xp-familier',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
        },
        {
          name: 'Prix familier',
          path: '/prix-familier',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Xp item',
          path: '/ressources',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
        },
      ],
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
  ]

  const toggleCategory = (categoryKey) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }))
  }

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
      <nav className="mt-6 flex-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          if (item.isCategory) {
            // Catégorie avec sous-items
            const isOpen = openCategories[item.categoryKey]
            const hasActiveSubItem = item.subItems.some(sub => router.pathname === sub.path)

            return (
              <div key={item.categoryKey || index}>
                {/* En-tête de catégorie (cliquable pour ouvrir/fermer) */}
                <button
                  onClick={() => toggleCategory(item.categoryKey)}
                  className={`w-full flex items-center justify-between gap-3 px-6 py-3 transition-colors ${
                    hasActiveSubItem
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {/* Flèche d'expansion */}
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Sous-items (affichés uniquement si ouvert) */}
                {isOpen && (
                  <div className="bg-gray-50">
                    {item.subItems.map((subItem) => {
                      const isActive = router.pathname === subItem.path
                      return (
                        <Link
                          key={subItem.path}
                          href={subItem.path}
                          className={`flex items-center gap-3 pl-12 pr-6 py-2.5 transition-colors ${
                            isActive
                              ? 'bg-blue-100 text-blue-600 border-r-4 border-blue-600'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {subItem.icon}
                          <span className="text-sm font-medium">{subItem.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          } else {
            // Item simple (sans sous-catégories)
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
          }
        })}
      </nav>

      {/* User Profile & Sign Out at Bottom */}
      {user && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar ou initiales */}
            {user.user_metadata?.avatar_url && !avatarError ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.full_name || user.email}
                className="w-10 h-10 rounded-full"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                {(() => {
                  const name = user.user_metadata?.full_name || user.email
                  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  return initials || name[0].toUpperCase()
                })()}
              </div>
            )}

            {/* Email */}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm text-gray-700 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      )}
    </div>
  )
}
