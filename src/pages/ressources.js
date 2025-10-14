import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../utils/supabase/client'
import Layout from '../components/Layout'
import { useItemSearch } from '../api/useItemSearch'

export default function Ressources() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)

  // État pour la recherche
  const [searchName, setSearchName] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const { suggestions, isLoading: isLoadingSuggestions, searchItems: searchItemsAutocomplete, clearSuggestions } = useItemSearch()
  const dropdownRef = useRef(null)

  // État pour les items sélectionnés
  const [items, setItems] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        loadItems()
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

  // Autocomplétion
  useEffect(() => {
    if (searchName.length >= 3) {
      searchItemsAutocomplete(searchName)
      setShowDropdown(true)
    } else {
      clearSuggestions()
      setShowDropdown(false)
    }
  }, [searchName, searchItemsAutocomplete, clearSuggestions])

  // Charger les items depuis la base
  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error

      // Enrichir chaque item avec les données de l'API
      if (data && data.length > 0) {
        const enrichedItems = await Promise.all(
          data.map(async (item) => {
            try {
              const response = await fetch(
                `https://api.dofusdu.de/dofus3/v1/fr/items/search?query=${item.id}&limit=1`
              )

              if (response.ok) {
                const searchResults = await response.json()
                if (searchResults && searchResults.length > 0) {
                  const apiItem = searchResults.find(r => r.ankama_id === item.id)
                  if (apiItem) {
                    return {
                      ...item,
                      name: apiItem.name,
                      image_urls: apiItem.image_urls,
                      type: apiItem.type
                    }
                  }
                }
              }
            } catch (err) {
              console.error(`Erreur lors du chargement de l'item ${item.id}:`, err)
            }
            return item
          })
        )
        setItems(enrichedItems)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des items:', error)
    }
  }

  // Ajouter un item depuis le dropdown
  const handleSelectFromDropdown = async (item) => {
    setShowDropdown(false)
    clearSuggestions()
    setSearchName('')

    // Vérifier si l'item existe déjà dans le tableau
    if (items.some(i => i.id === item.ankama_id)) {
      alert('Cet item est déjà dans la liste')
      return
    }

    try {
      // Vérifier si l'item existe dans la base
      const { data: existingItem, error: selectError } = await supabase
        .from('items')
        .select('*')
        .eq('id', item.ankama_id)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError
      }

      if (existingItem) {
        // L'item existe, l'ajouter à la liste locale avec les infos de l'API
        setItems(prev => [...prev, {
          ...existingItem,
          name: item.name,
          image_urls: item.image_urls,
          type: item.type
        }])
      } else {
        // L'item n'existe pas, le créer
        const newItem = {
          id: item.ankama_id,
          xp: 0.0,
          prix_1u: null,
          prix_10u: null,
          prix_100u: null,
          prix_1000u: null
        }

        const { data: insertedItem, error: insertError } = await supabase
          .from('items')
          .insert([newItem])
          .select()
          .single()

        if (insertError) throw insertError

        // Ajouter à la liste locale avec les infos de l'API
        setItems(prev => [...prev, {
          ...insertedItem,
          name: item.name,
          image_urls: item.image_urls,
          type: item.type
        }])
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'item:', error)
      alert('Erreur lors de l\'ajout de l\'item')
    }
  }

  // Retirer un item de la vue (sans supprimer de la base)
  const handleDeleteItem = (itemId) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  // Éditer une cellule
  const handleCellClick = (itemId, field, currentValue) => {
    setEditingCell(`${itemId}-${field}`)
    setEditValue(currentValue !== null ? currentValue.toString() : '')
  }

  const handleCellBlur = async (itemId, field) => {
    if (editingCell === `${itemId}-${field}`) {
      const numericValue = field === 'xp' ? parseFloat(editValue) : parseInt(editValue, 10)

      if (!isNaN(numericValue) || editValue === '') {
        try {
          const { error } = await supabase
            .from('items')
            .update({ [field]: editValue === '' ? null : numericValue })
            .eq('id', itemId)

          if (error) throw error

          setItems(prev => prev.map(i =>
            i.id === itemId ? { ...i, [field]: editValue === '' ? null : numericValue } : i
          ))
        } catch (error) {
          console.error('Erreur lors de la mise à jour:', error)
          alert('Erreur lors de la mise à jour')
        }
      }

      setEditingCell(null)
      setEditValue('')
    }
  }

  const handleKeyPress = (e, itemId, field) => {
    if (e.key === 'Enter') {
      handleCellBlur(itemId, field)
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setEditValue('')
    }
  }

  // Calculer le ratio (prix par unité / xp)
  const calculateRatio = (prix, xp, quantity = 1) => {
    if (!prix || !xp || xp === 0) return null
    const prixParUnite = prix / quantity
    return (prixParUnite / xp).toFixed(2)
  }

  if (!user) return null

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Xp item</h1>

        {/* Encart de recherche */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Rechercher un item</h2>

          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Nom de l'item (min. 3 caractères)..."
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
        </div>

        {/* Tableau des items */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun item ajouté. Recherchez et sélectionnez un item pour commencer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Xp</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Prix 1u</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Prix 10u</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Prix 100u</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Prix 1000u</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => {
                    const ratio1u = calculateRatio(item.prix_1u, item.xp, 1)
                    const ratio10u = calculateRatio(item.prix_10u, item.xp, 10)
                    const ratio100u = calculateRatio(item.prix_100u, item.xp, 100)
                    const ratio1000u = calculateRatio(item.prix_1000u, item.xp, 1000)

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {/* Bouton supprimer */}
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded-full hover:bg-red-50 transition-colors group"
                            title="Supprimer"
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
                        </td>

                        {/* Nom avec icône */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {item.image_urls?.icon && (
                              <img
                                src={item.image_urls.icon}
                                alt={item.name}
                                className="w-10 h-10 rounded"
                              />
                            )}
                            <span className="text-sm font-medium text-gray-900">{item.name || `Item ${item.id}`}</span>
                          </div>
                        </td>

                        {/* XP */}
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center group relative">
                            {editingCell === `${item.id}-xp` ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellBlur(item.id, 'xp')}
                                onKeyDown={(e) => handleKeyPress(e, item.id, 'xp')}
                                className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                autoFocus
                              />
                            ) : (
                              <>
                                <span className="text-sm text-gray-600">{item.xp || '0'}</span>
                                <button
                                  onClick={() => handleCellClick(item.id, 'xp', item.xp)}
                                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Modifier"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Prix 1u */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="inline-flex items-center group relative">
                              {editingCell === `${item.id}-prix_1u` ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCellBlur(item.id, 'prix_1u')}
                                  onKeyDown={(e) => handleKeyPress(e, item.id, 'prix_1u')}
                                  className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-gray-600">
                                      {item.prix_1u ? item.prix_1u.toLocaleString() : '-'}
                                    </span>
                                    {item.prix_1u && (
                                      <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleCellClick(item.id, 'prix_1u', item.prix_1u)}
                                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Modifier"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                            {ratio1u && (
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {ratio1u}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Prix 10u */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="inline-flex items-center group relative">
                              {editingCell === `${item.id}-prix_10u` ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCellBlur(item.id, 'prix_10u')}
                                  onKeyDown={(e) => handleKeyPress(e, item.id, 'prix_10u')}
                                  className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-gray-600">
                                      {item.prix_10u ? item.prix_10u.toLocaleString() : '-'}
                                    </span>
                                    {item.prix_10u && (
                                      <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleCellClick(item.id, 'prix_10u', item.prix_10u)}
                                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Modifier"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                            {ratio10u && (
                              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                {ratio10u}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Prix 100u */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="inline-flex items-center group relative">
                              {editingCell === `${item.id}-prix_100u` ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCellBlur(item.id, 'prix_100u')}
                                  onKeyDown={(e) => handleKeyPress(e, item.id, 'prix_100u')}
                                  className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-gray-600">
                                      {item.prix_100u ? item.prix_100u.toLocaleString() : '-'}
                                    </span>
                                    {item.prix_100u && (
                                      <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleCellClick(item.id, 'prix_100u', item.prix_100u)}
                                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Modifier"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                            {ratio100u && (
                              <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                {ratio100u}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Prix 1000u */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="inline-flex items-center group relative">
                              {editingCell === `${item.id}-prix_1000u` ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCellBlur(item.id, 'prix_1000u')}
                                  onKeyDown={(e) => handleKeyPress(e, item.id, 'prix_1000u')}
                                  className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-gray-600">
                                      {item.prix_1000u ? item.prix_1000u.toLocaleString() : '-'}
                                    </span>
                                    {item.prix_1000u && (
                                      <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleCellClick(item.id, 'prix_1000u', item.prix_1000u)}
                                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Modifier"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                            {ratio1000u && (
                              <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                                {ratio1000u}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
