import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../utils/supabase/client'
import Layout from '../components/Layout'
import { useItemSearch } from '../api/useItemSearch'
import { getItemById } from '../api/dofusDudeApi'

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

  // État pour le tri
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [lastAddedItemId, setLastAddedItemId] = useState(null)
  const [selectedItemId, setSelectedItemId] = useState(null)

  // État pour le familier sélectionné (vient de Prix familier)
  const [selectedFamilier, setSelectedFamilier] = useState(null)

  // Charger le familier sélectionné depuis localStorage
  useEffect(() => {
    const loadSelectedFamilier = () => {
      const saved = localStorage.getItem('selectedFamilier')
      if (saved) {
        setSelectedFamilier(JSON.parse(saved))
      } else {
        setSelectedFamilier(null)
      }
    }

    loadSelectedFamilier()
    // Écouter les changements de localStorage (quand on change de familier dans Prix familier)
    window.addEventListener('storage', loadSelectedFamilier)
    return () => window.removeEventListener('storage', loadSelectedFamilier)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        // Charger les items depuis la base de données
        loadUserItems(session.user.id)
      }
    }
    checkAuth()
  }, [router, supabase.auth])

  // Charger les items de l'utilisateur depuis la base
  const loadUserItems = async (userId) => {
    try {
      // Récupérer les IDs des items de l'utilisateur
      const { data: userItemsData, error: userItemsError } = await supabase
        .from('user_items')
        .select('item_id')
        .eq('user_id', userId)

      if (userItemsError) throw userItemsError

      if (userItemsData && userItemsData.length > 0) {
        const itemIds = userItemsData.map(ui => ui.item_id)

        // Récupérer les détails des items depuis la table items
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .in('id', itemIds)

        if (itemsError) throw itemsError

        // Charger les métadonnées depuis localStorage pour nom/image
        const savedMetadata = JSON.parse(localStorage.getItem('itemsMetadata') || '{}')

        // Enrichir avec les métadonnées
        const enrichedItems = await Promise.all(
          itemsData.map(async (item) => {
            // Vérifier si métadonnées dans localStorage
            if (savedMetadata[item.id]) {
              return {
                ...item,
                ...savedMetadata[item.id]
              }
            }

            // Sinon charger depuis l'API en essayant tous les endpoints
            try {
              const apiItem = await getItemById(item.id)

              if (apiItem) {
                // Sauvegarder dans localStorage pour la prochaine fois
                savedMetadata[item.id] = {
                  name: apiItem.name,
                  image_urls: apiItem.image_urls,
                  type: apiItem.type
                }
                localStorage.setItem('itemsMetadata', JSON.stringify(savedMetadata))
                return {
                  ...item,
                  name: apiItem.name,
                  image_urls: apiItem.image_urls,
                  type: apiItem.type
                }
              }
            } catch (err) {
              console.error(`Erreur lors du chargement de l'item ${item.id}:`, err)
            }
            return item
          })
        )

        setItems(enrichedItems)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des items utilisateur:', error)
    }
  }

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

      // Sauvegarder les métadonnées dans localStorage
      const savedMetadata = JSON.parse(localStorage.getItem('itemsMetadata') || '{}')
      savedMetadata[item.ankama_id] = {
        name: item.name,
        image_urls: item.image_urls,
        type: item.type
      }
      localStorage.setItem('itemsMetadata', JSON.stringify(savedMetadata))

      if (existingItem) {
        // L'item existe, ajouter la relation user_items
        await supabase
          .from('user_items')
          .insert([{ user_id: user.id, item_id: existingItem.id }])

        // Ajouter à la liste locale avec les infos de l'API
        setItems(prev => [...prev, {
          ...existingItem,
          name: item.name,
          image_urls: item.image_urls,
          type: item.type
        }])

        // Marquer comme dernier item ajouté
        setLastAddedItemId(existingItem.id)
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

        // Ajouter la relation user_items
        await supabase
          .from('user_items')
          .insert([{ user_id: user.id, item_id: insertedItem.id }])

        // Ajouter à la liste locale avec les infos de l'API
        setItems(prev => [...prev, {
          ...insertedItem,
          name: item.name,
          image_urls: item.image_urls,
          type: item.type
        }])

        // Marquer comme dernier item ajouté
        setLastAddedItemId(insertedItem.id)
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'item:', error)
      alert('Erreur lors de l\'ajout de l\'item')
    }
  }

  // Retirer un item de la vue et de user_items
  const handleDeleteItem = async (itemId) => {
    try {
      // Supprimer la relation user_items
      await supabase
        .from('user_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId)

      // Retirer de la liste locale
      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  // Tout effacer
  const handleClearAll = async () => {
    if (items.length > 0) {
      if (confirm('Voulez-vous vraiment retirer tous les items de la vue ?')) {
        try {
          // Supprimer toutes les relations user_items de cet utilisateur
          await supabase
            .from('user_items')
            .delete()
            .eq('user_id', user.id)

          // Vider la liste locale
          setItems([])
        } catch (error) {
          console.error('Erreur lors de la suppression:', error)
        }
      }
    }
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

  // Calculer le prix estimé pour monter au niveau 100
  const calculateEstimatedPrice = (prix, xp, quantity) => {
    if (!selectedFamilier || !prix || !xp || xp === 0) return null

    const xpPerUnit = xp
    const xpPerPurchaseUnit = xpPerUnit * quantity
    const quantityNeeded = Math.ceil(selectedFamilier.remainingXp / xpPerPurchaseUnit)
    const totalCost = quantityNeeded * prix

    return {
      quantityNeeded,
      totalCost,
      formattedCost: totalCost.toLocaleString()
    }
  }

  // Fonction pour obtenir la couleur du badge en fonction du ratio (vert = meilleur, rouge = pire)
  const getRatioColor = (ratio, allRatios) => {
    if (!ratio || !allRatios || allRatios.length === 0) return 'bg-gray-100 text-gray-800'

    // Filtrer les ratios valides (non null)
    const validRatios = allRatios.filter(r => r !== null).map(r => parseFloat(r))
    if (validRatios.length === 0) return 'bg-gray-100 text-gray-800'

    const min = Math.min(...validRatios)
    const max = Math.max(...validRatios)
    const currentRatio = parseFloat(ratio)

    // Si tous les ratios sont identiques
    if (min === max) return 'bg-yellow-100 text-yellow-800'

    // Normaliser le ratio entre 0 (meilleur) et 1 (pire)
    const normalized = (currentRatio - min) / (max - min)

    // Attribuer une couleur selon la position
    if (normalized <= 0.2) return 'bg-green-100 text-green-800'      // Top 20% - Vert foncé
    if (normalized <= 0.4) return 'bg-green-50 text-green-700'       // Top 40% - Vert clair
    if (normalized <= 0.6) return 'bg-yellow-100 text-yellow-800'    // Moyen 60% - Jaune
    if (normalized <= 0.8) return 'bg-orange-100 text-orange-800'    // Top 80% - Orange
    return 'bg-red-100 text-red-800'                                  // Pire 20% - Rouge
  }

  // Ajouter une ressource au familier sélectionné
  const handleAddToFamilier = (item, prix, quantity) => {
    if (!selectedFamilier) {
      alert('Aucun familier sélectionné. Allez dans l\'onglet "Prix familier" et sélectionnez un familier.')
      return
    }

    if (!prix || !item.xp || item.xp === 0) {
      alert('Veuillez remplir le prix et le XP de cet item avant de l\'ajouter.')
      return
    }

    // Calculer la quantité optimale basée sur le XP restant
    const xpPerUnit = item.xp
    const quantityNeeded = Math.ceil(selectedFamilier.remainingXp / xpPerUnit)
    const actualQuantity = Math.min(quantityNeeded, quantity) // Max selon la quantité sélectionnée

    const xpProvided = actualQuantity * xpPerUnit
    const unitPrice = prix / quantity
    const cost = Math.round(actualQuantity * unitPrice)

    const resource = {
      item: {
        id: item.id,
        name: item.name,
        image_urls: item.image_urls
      },
      quantity: actualQuantity,
      xpProvided: xpProvided,
      cost: cost
    }

    // Mettre à jour le localStorage avec la nouvelle ressource
    const updatedFamilier = {
      ...selectedFamilier,
      resources: [...(selectedFamilier.resources || []), resource],
      totalCost: (selectedFamilier.totalCost || 0) + cost,
      remainingXp: Math.max(0, selectedFamilier.remainingXp - xpProvided)
    }

    localStorage.setItem('selectedFamilier', JSON.stringify(updatedFamilier))
    setSelectedFamilier(updatedFamilier)

    // Mettre à jour savedMounts dans localStorage aussi
    const allMounts = JSON.parse(localStorage.getItem('savedMounts') || '[]')
    const updatedMounts = allMounts.map(m =>
      m.id === updatedFamilier.id ? updatedFamilier : m
    )
    localStorage.setItem('savedMounts', JSON.stringify(updatedMounts))

    // Déclencher un événement personnalisé pour mettre à jour la page Prix familier
    window.dispatchEvent(new CustomEvent('familierUpdated', { detail: updatedFamilier }))

    alert(`${actualQuantity.toLocaleString()} ${item.name} ajouté(s) au familier ${selectedFamilier.mount.name}!`)
  }

  // Fonction de tri
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })

    // Sauvegarder dans localStorage pour persistence
    localStorage.setItem('itemsSortConfig', JSON.stringify({ key, direction }))
  }

  // Charger le tri depuis localStorage
  useEffect(() => {
    const savedSort = localStorage.getItem('itemsSortConfig')
    if (savedSort) {
      setSortConfig(JSON.parse(savedSort))
    }
  }, [])

  // Appliquer le tri aux items
  const sortedItems = React.useMemo(() => {
    if (!sortConfig.key) return items

    return [...items].sort((a, b) => {
      let aValue, bValue

      switch (sortConfig.key) {
        case 'name':
          aValue = (a.name || `Item ${a.id}`).toLowerCase()
          bValue = (b.name || `Item ${b.id}`).toLowerCase()
          break
        case 'xp':
          aValue = a.xp || 0
          bValue = b.xp || 0
          break
        case 'ratio_1u':
          aValue = parseFloat(calculateRatio(a.prix_1u, a.xp, 1)) || Infinity
          bValue = parseFloat(calculateRatio(b.prix_1u, b.xp, 1)) || Infinity
          break
        case 'ratio_10u':
          aValue = parseFloat(calculateRatio(a.prix_10u, a.xp, 10)) || Infinity
          bValue = parseFloat(calculateRatio(b.prix_10u, b.xp, 10)) || Infinity
          break
        case 'ratio_100u':
          aValue = parseFloat(calculateRatio(a.prix_100u, a.xp, 100)) || Infinity
          bValue = parseFloat(calculateRatio(b.prix_100u, b.xp, 100)) || Infinity
          break
        case 'ratio_1000u':
          aValue = parseFloat(calculateRatio(a.prix_1000u, a.xp, 1000)) || Infinity
          bValue = parseFloat(calculateRatio(b.prix_1000u, b.xp, 1000)) || Infinity
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [items, sortConfig])

  if (!user) return null

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Xp item</h1>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
              title="Retirer tous les items de la vue"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Tout effacer
            </button>
          )}
        </div>

        {/* Indicateur du familier sélectionné */}
        {selectedFamilier && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedFamilier.mount.image_urls?.sd && (
                  <img
                    src={selectedFamilier.mount.image_urls.sd}
                    alt={selectedFamilier.mount.name}
                    className="w-12 h-12 rounded"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Familier sélectionné: {selectedFamilier.mount.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    XP restant: <span className="font-semibold">{selectedFamilier.remainingXp.toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-blue-600 italic">Cliquez sur "+ Ajouter" à côté des ratios pour ajouter des ressources</p>
            </div>
          </div>
        )}

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-gray-700">
                        Nom
                        {sortConfig.key === 'name' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('xp')} className="flex items-center gap-1 hover:text-gray-700 mx-auto">
                        Xp
                        {sortConfig.key === 'xp' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('ratio_1u')} className="flex items-center gap-1 hover:text-gray-700 mx-auto">
                        Prix 1u (ratio)
                        {sortConfig.key === 'ratio_1u' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('ratio_10u')} className="flex items-center gap-1 hover:text-gray-700 mx-auto">
                        Prix 10u (ratio)
                        {sortConfig.key === 'ratio_10u' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('ratio_100u')} className="flex items-center gap-1 hover:text-gray-700 mx-auto">
                        Prix 100u (ratio)
                        {sortConfig.key === 'ratio_100u' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('ratio_1000u')} className="flex items-center gap-1 hover:text-gray-700 mx-auto">
                        Prix 1000u (ratio)
                        {sortConfig.key === 'ratio_1000u' && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Calculer tous les ratios pour déterminer les couleurs */}
                  {(() => {
                    const allRatios1u = sortedItems.map(item => calculateRatio(item.prix_1u, item.xp, 1))
                    const allRatios10u = sortedItems.map(item => calculateRatio(item.prix_10u, item.xp, 10))
                    const allRatios100u = sortedItems.map(item => calculateRatio(item.prix_100u, item.xp, 100))
                    const allRatios1000u = sortedItems.map(item => calculateRatio(item.prix_1000u, item.xp, 1000))

                    return sortedItems.map((item, index) => {
                      const ratio1u = calculateRatio(item.prix_1u, item.xp, 1)
                      const ratio10u = calculateRatio(item.prix_10u, item.xp, 10)
                      const ratio100u = calculateRatio(item.prix_100u, item.xp, 100)
                      const ratio1000u = calculateRatio(item.prix_1000u, item.xp, 1000)

                    // Calculer les coûts estimés pour monter au niveau 100
                    const estimated1u = calculateEstimatedPrice(item.prix_1u, item.xp, 1)
                    const estimated10u = calculateEstimatedPrice(item.prix_10u, item.xp, 10)
                    const estimated100u = calculateEstimatedPrice(item.prix_100u, item.xp, 100)
                    const estimated1000u = calculateEstimatedPrice(item.prix_1000u, item.xp, 1000)

                    // Première ligne : tooltip vers le bas, autres : vers le haut
                    const isFirstRow = index === 0

                    // Déterminer la couleur de fond
                    const isSelected = selectedItemId === item.id
                    const isLastAdded = lastAddedItemId === item.id
                    let rowClassName = "hover:bg-gray-50 cursor-pointer transition-colors"
                    if (isSelected) {
                      rowClassName = "bg-blue-100 hover:bg-blue-200 cursor-pointer transition-colors"
                    } else if (isLastAdded) {
                      rowClassName = "bg-yellow-100 hover:bg-yellow-200 cursor-pointer transition-colors"
                    }

                    return (
                      <tr
                        key={item.id}
                        className={rowClassName}
                        onClick={() => {
                          setSelectedItemId(item.id)
                          // Réinitialiser le surlignage jaune quand on sélectionne un autre item
                          if (item.id !== lastAddedItemId) {
                            setLastAddedItemId(null)
                          }
                        }}
                      >
                        {/* Bouton supprimer */}
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
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
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                autoFocus
                              />
                            ) : (
                              <>
                                <span className="text-sm text-gray-600">{item.xp || '0'}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCellClick(item.id, 'xp', item.xp)
                                  }}
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
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 relative group/tooltip">
                                    <span className="text-sm text-gray-600">
                                      {item.prix_1u ? item.prix_1u.toLocaleString() : '-'}
                                    </span>
                                    {item.prix_1u && (
                                      <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                                    )}
                                    {/* Tooltip pour coût estimé niveau 100 */}
                                    {estimated1u && (
                                      <div className={`invisible group-hover/tooltip:visible absolute left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 ${
                                        isFirstRow ? 'top-full mt-2' : 'bottom-full mb-2'
                                      }`}>
                                        <div className="text-center">
                                          <div className="font-semibold">Prix pour niveau 100</div>
                                          <div className="flex items-center gap-1 justify-center mt-1">
                                            <span>{estimated1u.formattedCost}</span>
                                            <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block" />
                                          </div>
                                          <div className="text-xs text-gray-300 mt-1">
                                            ({estimated1u.quantityNeeded.toLocaleString()} achats de 1u)
                                          </div>
                                        </div>
                                        {/* Flèche: vers le haut si première ligne, vers le bas sinon */}
                                        <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                                          isFirstRow ? 'bottom-full border-b-gray-900' : 'top-full border-t-gray-900'
                                        }`}></div>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCellClick(item.id, 'prix_1u', item.prix_1u)
                                    }}
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
                              <div className="flex items-center gap-2">
                                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getRatioColor(ratio1u, allRatios1u)}`}>
                                  {ratio1u}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (selectedFamilier) handleAddToFamilier(item, item.prix_1u, 1)
                                  }}
                                  disabled={!selectedFamilier}
                                  className={`w-5 h-5 flex items-center justify-center rounded-full text-white text-xs font-bold leading-none transition-colors ${
                                    selectedFamilier
                                      ? 'bg-green-500 hover:bg-green-600 cursor-pointer'
                                      : 'bg-gray-300 cursor-not-allowed'
                                  }`}
                                  title={selectedFamilier ? `Ajouter à ${selectedFamilier.mount.name}` : 'Sélectionnez un familier d\'abord'}
                                >
                                  +
                                </button>
                              </div>
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
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 relative group/tooltip10">
                                    <span className="text-sm text-gray-600">
                                      {item.prix_10u ? item.prix_10u.toLocaleString() : '-'}
                                    </span>
                                    {item.prix_10u && (
                                      <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                                    )}
                                    {/* Tooltip pour coût estimé niveau 100 */}
                                    {estimated10u && (
                                      <div className={`invisible group-hover/tooltip10:visible absolute left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 ${
                                        isFirstRow ? 'top-full mt-2' : 'bottom-full mb-2'
                                      }`}>
                                        <div className="text-center">
                                          <div className="font-semibold">Prix pour niveau 100</div>
                                          <div className="flex items-center gap-1 justify-center mt-1">
                                            <span>{estimated10u.formattedCost}</span>
                                            <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block" />
                                          </div>
                                          <div className="text-xs text-gray-300 mt-1">
                                            ({estimated10u.quantityNeeded.toLocaleString()} achats de 10u)
                                          </div>
                                        </div>
                                        <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                                          isFirstRow ? 'bottom-full border-b-gray-900' : 'top-full border-t-gray-900'
                                        }`}></div>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCellClick(item.id, 'prix_10u', item.prix_10u)
                                    }}
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
                              <div className="flex items-center gap-2">
                                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getRatioColor(ratio10u, allRatios10u)}`}>
                                  {ratio10u}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (selectedFamilier) handleAddToFamilier(item, item.prix_10u, 10)
                                  }}
                                  disabled={!selectedFamilier}
                                  className={`w-5 h-5 flex items-center justify-center rounded-full text-white text-xs font-bold leading-none transition-colors ${
                                    selectedFamilier
                                      ? 'bg-green-500 hover:bg-green-600 cursor-pointer'
                                      : 'bg-gray-300 cursor-not-allowed'
                                  }`}
                                  title={selectedFamilier ? `Ajouter à ${selectedFamilier.mount.name}` : 'Sélectionnez un familier d\'abord'}
                                >
                                  +
                                </button>
                              </div>
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
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 relative group/tooltip100">
                                    <span className="text-sm text-gray-600">
                                      {item.prix_100u ? item.prix_100u.toLocaleString() : '-'}
                                    </span>
                                    {item.prix_100u && (
                                      <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                                    )}
                                    {/* Tooltip pour coût estimé niveau 100 */}
                                    {estimated100u && (
                                      <div className={`invisible group-hover/tooltip100:visible absolute left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 ${
                                        isFirstRow ? 'top-full mt-2' : 'bottom-full mb-2'
                                      }`}>
                                        <div className="text-center">
                                          <div className="font-semibold">Prix pour niveau 100</div>
                                          <div className="flex items-center gap-1 justify-center mt-1">
                                            <span>{estimated100u.formattedCost}</span>
                                            <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block" />
                                          </div>
                                          <div className="text-xs text-gray-300 mt-1">
                                            ({estimated100u.quantityNeeded.toLocaleString()} achats de 100u)
                                          </div>
                                        </div>
                                        <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                                          isFirstRow ? 'bottom-full border-b-gray-900' : 'top-full border-t-gray-900'
                                        }`}></div>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCellClick(item.id, 'prix_100u', item.prix_100u)
                                    }}
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
                              <div className="flex items-center gap-2">
                                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getRatioColor(ratio100u, allRatios100u)}`}>
                                  {ratio100u}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (selectedFamilier) handleAddToFamilier(item, item.prix_100u, 100)
                                  }}
                                  disabled={!selectedFamilier}
                                  className={`w-5 h-5 flex items-center justify-center rounded-full text-white text-xs font-bold leading-none transition-colors ${
                                    selectedFamilier
                                      ? 'bg-green-500 hover:bg-green-600 cursor-pointer'
                                      : 'bg-gray-300 cursor-not-allowed'
                                  }`}
                                  title={selectedFamilier ? `Ajouter à ${selectedFamilier.mount.name}` : 'Sélectionnez un familier d\'abord'}
                                >
                                  +
                                </button>
                              </div>
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
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-24 px-2 py-1 border border-blue-500 rounded text-center"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 relative group/tooltip1000">
                                    <span className="text-sm text-gray-600">
                                      {item.prix_1000u ? item.prix_1000u.toLocaleString() : '-'}
                                    </span>
                                    {item.prix_1000u && (
                                      <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                                    )}
                                    {/* Tooltip pour coût estimé niveau 100 */}
                                    {estimated1000u && (
                                      <div className={`invisible group-hover/tooltip1000:visible absolute left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10 ${
                                        isFirstRow ? 'top-full mt-2' : 'bottom-full mb-2'
                                      }`}>
                                        <div className="text-center">
                                          <div className="font-semibold">Prix pour niveau 100</div>
                                          <div className="flex items-center gap-1 justify-center mt-1">
                                            <span>{estimated1000u.formattedCost}</span>
                                            <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block" />
                                          </div>
                                          <div className="text-xs text-gray-300 mt-1">
                                            ({estimated1000u.quantityNeeded.toLocaleString()} achats de 1000u)
                                          </div>
                                        </div>
                                        <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                                          isFirstRow ? 'bottom-full border-b-gray-900' : 'top-full border-t-gray-900'
                                        }`}></div>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCellClick(item.id, 'prix_1000u', item.prix_1000u)
                                    }}
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
                              <div className="flex items-center gap-2">
                                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getRatioColor(ratio1000u, allRatios1000u)}`}>
                                  {ratio1000u}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (selectedFamilier) handleAddToFamilier(item, item.prix_1000u, 1000)
                                  }}
                                  disabled={!selectedFamilier}
                                  className={`w-5 h-5 flex items-center justify-center rounded-full text-white text-xs font-bold leading-none transition-colors ${
                                    selectedFamilier
                                      ? 'bg-green-500 hover:bg-green-600 cursor-pointer'
                                      : 'bg-gray-300 cursor-not-allowed'
                                  }`}
                                  title={selectedFamilier ? `Ajouter à ${selectedFamilier.mount.name}` : 'Sélectionnez un familier d\'abord'}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
