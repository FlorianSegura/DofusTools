import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../utils/supabase/client'
import Layout from '../components/Layout'
import { getItemById, searchItems } from '../api/dofusDudeApi'
import { useItemSearch } from '../api/useItemSearch'

export default function ApiDofusdude() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)

  // État pour recherche par ID
  const [searchId, setSearchId] = useState('')
  const [itemById, setItemById] = useState(null)
  const [loadingById, setLoadingById] = useState(false)
  const [errorById, setErrorById] = useState(null)

  // État pour recherche par nom avec autocomplétion
  const [searchName, setSearchName] = useState('')
  const [itemsByName, setItemsByName] = useState([])
  const [loadingByName, setLoadingByName] = useState(false)
  const [errorByName, setErrorByName] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // Hook pour autocomplétion
  const { suggestions, isLoading: isLoadingSuggestions, searchItems: searchItemsAutocomplete, clearSuggestions } = useItemSearch()
  const dropdownRef = useRef(null)
  const isSelectingFromDropdown = useRef(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
      }
    }
    checkAuth()
  }, [router, supabase.auth])

  // Gérer le clic en dehors du dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Autocomplétion : rechercher dès que l'utilisateur tape 3 caractères
  useEffect(() => {
    // Ne pas déclencher l'autocomplétion si on est en train de sélectionner depuis le dropdown
    if (isSelectingFromDropdown.current) {
      isSelectingFromDropdown.current = false
      return
    }

    if (searchName.length >= 3) {
      searchItemsAutocomplete(searchName)
      setShowDropdown(true)
    } else {
      clearSuggestions()
      setShowDropdown(false)
    }
  }, [searchName, searchItemsAutocomplete, clearSuggestions])

  // Recherche par ID
  const handleSearchById = async (e) => {
    e.preventDefault()
    if (!searchId.trim()) return

    setLoadingById(true)
    setErrorById(null)
    setItemById(null)

    try {
      // On essaye avec différents types d'items
      const types = [
        { name_id: 'items-equipment' },
        { name_id: 'items-resources' },
        { name_id: 'items-consumables' },
        { name_id: 'items-cosmetics' },
        { name_id: 'items-quest' }
      ]

      let foundItem = null
      for (const type of types) {
        try {
          const item = await getItemById(parseInt(searchId), type)
          if (item) {
            foundItem = item
            break
          }
        } catch (err) {
          // Continue avec le type suivant
          continue
        }
      }

      if (foundItem) {
        setItemById(foundItem)
      } else {
        setErrorById('Aucun item trouvé avec cet ID')
      }
    } catch (error) {
      setErrorById('Erreur lors de la recherche')
      console.error(error)
    } finally {
      setLoadingById(false)
    }
  }

  // Recherche par nom
  const handleSearchByName = async (e) => {
    e.preventDefault()
    if (!searchName.trim()) return

    setLoadingByName(true)
    setErrorByName(null)
    setItemsByName([])
    setSelectedItem(null)

    try {
      const results = await searchItems(searchName, 10)
      if (results.length > 0) {
        setItemsByName(results)
      } else {
        setErrorByName('Aucun item trouvé avec ce nom')
      }
    } catch (error) {
      setErrorByName('Erreur lors de la recherche')
      console.error(error)
    } finally {
      setLoadingByName(false)
    }
  }

  // Sélectionner un item de la liste
  const handleSelectItem = async (item) => {
    setLoadingByName(true)
    try {
      const detailedItem = await getItemById(item.ankama_id, item.type)
      setSelectedItem(detailedItem)
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error)
    } finally {
      setLoadingByName(false)
    }
  }

  // Sélectionner un item depuis le dropdown d'autocomplétion
  const handleSelectFromDropdown = async (item) => {
    // Marquer qu'on sélectionne depuis le dropdown pour éviter de redéclencher l'autocomplétion
    isSelectingFromDropdown.current = true

    setShowDropdown(false)
    clearSuggestions()
    setSearchName(item.name)
    setLoadingByName(true)
    try {
      const detailedItem = await getItemById(item.ankama_id, item.type)
      setSelectedItem(detailedItem)
      setItemsByName([])
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error)
    } finally {
      setLoadingByName(false)
    }
  }

  // Composant pour afficher les détails d'un item
  const ItemDetails = ({ item, onClose }) => {
    if (!item) return null

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mt-4 relative">
        {/* Bouton de fermeture intégré en haut à droite */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-red-50 transition-colors group"
            title="Supprimer le résultat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400 group-hover:text-red-600 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="flex items-start gap-4">
          {item.image_urls?.icon && (
            <img
              src={item.image_urls.icon}
              alt={item.name}
              className="w-16 h-16 rounded"
            />
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2 pr-8">{item.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-700">ID Ankama:</span>
                <span className="ml-2 text-gray-600">{item.ankama_id}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Type:</span>
                <span className="ml-2 text-gray-600">{item.type?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Niveau:</span>
                <span className="ml-2 text-gray-600">{item.level || 'N/A'}</span>
              </div>
              {item.recipe && (
                <div>
                  <span className="font-semibold text-gray-700">Métier:</span>
                  <span className="ml-2 text-gray-600">{item.recipe[0]?.result.item_subtype || 'N/A'}</span>
                </div>
              )}
            </div>
            {item.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">API Dofusdude</h1>
        <p className="text-gray-600 mb-8">Recherchez des items Dofus par ID ou par nom</p>

        <div className="grid grid-cols-1 gap-6">
          {/* Encart 1: Recherche par ID */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Recherche par ID</h2>

            <form onSubmit={handleSearchById} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Entrez l'ID de l'item..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={loadingById}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:bg-gray-400"
                >
                  {loadingById ? 'Recherche...' : 'Rechercher'}
                </button>
              </div>
            </form>

            {loadingById && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {errorById && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {errorById}
              </div>
            )}

            {itemById && (
              <ItemDetails
                item={itemById}
                onClose={() => {
                  setItemById(null)
                  setSearchId('')
                }}
              />
            )}
          </div>

          {/* Encart 2: Recherche par Nom */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Recherche par Nom</h2>

            <form onSubmit={handleSearchByName} className="mb-4">
              <div className="flex gap-2 relative" ref={dropdownRef}>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Entrez le nom de l'item (min. 3 caractères)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Dropdown d'autocomplétion */}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                      {isLoadingSuggestions && (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                      {!isLoadingSuggestions && suggestions.map((item, index) => (
                        <button
                          key={`${item.ankama_id}-${index}`}
                          type="button"
                          onClick={() => handleSelectFromDropdown(item)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            {item.image_urls?.icon ? (
                              <img
                                src={item.image_urls.icon}
                                alt={item.name}
                                className="w-10 h-10 rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                ID: {item.ankama_id} • Type: {item.type?.name || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showDropdown && searchName.length >= 3 && suggestions.length === 0 && !isLoadingSuggestions && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                      <p className="text-sm text-gray-500 text-center">Aucune suggestion trouvée</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loadingByName}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:bg-gray-400"
                >
                  {loadingByName ? 'Recherche...' : 'Rechercher'}
                </button>
              </div>
            </form>

            {loadingByName && !selectedItem && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {errorByName && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {errorByName}
              </div>
            )}

            {itemsByName.length > 0 && !selectedItem && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">{itemsByName.length} résultat(s) trouvé(s)</p>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {itemsByName.map((item) => (
                    <button
                      key={item.ankama_id}
                      onClick={() => handleSelectItem(item)}
                      className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {item.image_urls?.icon && (
                          <img
                            src={item.image_urls.icon}
                            alt={item.name}
                            className="w-10 h-10 rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">ID: {item.ankama_id} • Type: {item.type?.name || 'N/A'}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedItem && (
              <ItemDetails
                item={selectedItem}
                onClose={() => {
                  setSelectedItem(null)
                  setSearchName('')
                  setItemsByName([])
                }}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
