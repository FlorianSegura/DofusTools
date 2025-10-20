import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../utils/supabase/client'
import Layout from '../components/Layout'

export default function PrixFamilier() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)

  // État pour la recherche de familier
  const [mountSearch, setMountSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [selectedMount, setSelectedMount] = useState(null)
  const dropdownRef = useRef(null)
  const isSelectingFromDropdown = useRef(false)

  // État pour le formulaire
  const [startingXp, setStartingXp] = useState(0)
  const [remainingXp, setRemainingXp] = useState(null)
  const [maxXp, setMaxXp] = useState(null)
  const [purchasePrice, setPurchasePrice] = useState(0)

  // État pour le tableau des familiers sauvegardés
  const [savedMounts, setSavedMounts] = useState([])
  const [selectedMountId, setSelectedMountId] = useState(null)
  const hasRestoredSelection = useRef(false)
  const isInitialMount = useRef(true) // Pour détecter le premier montage

  // Sauvegarder le familier sélectionné dans localStorage pour l'onglet "Xp item"
  useEffect(() => {
    // Ne rien faire tant que savedMounts n'est pas chargé
    if (savedMounts.length === 0) {
      return
    }

    // Ne rien faire tant que la restauration initiale n'est pas terminée
    if (!hasRestoredSelection.current) {
      return
    }

    if (selectedMountId) {
      const selectedMount = savedMounts.find(m => m.id === selectedMountId)
      if (selectedMount) {
        localStorage.setItem('selectedFamilier', JSON.stringify(selectedMount))
      }
    } else {
      // Supprimer seulement si la restauration est terminée ET l'utilisateur a désélectionné
      localStorage.removeItem('selectedFamilier')
    }
  }, [selectedMountId, savedMounts])

  // Écouter les mises à jour du familier (quand une ressource est ajoutée depuis Xp item)
  useEffect(() => {
    const handleFamilierUpdate = (event) => {
      const updatedFamilier = event.detail
      // Mettre à jour le familier dans savedMounts
      setSavedMounts(prev => prev.map(m =>
        m.id === updatedFamilier.id ? updatedFamilier : m
      ))
    }

    window.addEventListener('familierUpdated', handleFamilierUpdate)
    return () => window.removeEventListener('familierUpdated', handleFamilierUpdate)
  }, [])

  // Charger les familiers sauvegardés depuis localStorage au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('savedMounts')
    if (saved) {
      setSavedMounts(JSON.parse(saved))
    }
  }, [])

  // Restaurer la sélection APRÈS que savedMounts soit chargé (une seule fois)
  useEffect(() => {
    if (savedMounts.length > 0 && !hasRestoredSelection.current) {
      const selectedFam = localStorage.getItem('selectedFamilier')
      if (selectedFam) {
        const familier = JSON.parse(selectedFam)
        // Vérifier que ce familier existe toujours dans savedMounts
        const exists = savedMounts.find(m => m.id === familier.id)
        if (exists) {
          setSelectedMountId(familier.id)
        }
      }
      hasRestoredSelection.current = true
    }
  }, [savedMounts])

  // Synchroniser la sélection avec localStorage en continu
  // Cet effet vérifie à chaque fois que savedMounts OU selectedMountId change
  // si la sélection correspond à ce qui est dans localStorage
  useEffect(() => {
    if (savedMounts.length === 0) {
      return
    }

    const selectedFam = localStorage.getItem('selectedFamilier')
    if (selectedFam) {
      try {
        const familier = JSON.parse(selectedFam)
        const exists = savedMounts.find(m => m.id === familier.id)

        // Mettre à jour seulement si différent pour éviter les boucles
        if (exists && selectedMountId !== familier.id) {
          setSelectedMountId(familier.id)
        }
      } catch (e) {
        console.error('Erreur parsing selectedFamilier:', e)
      }
    }
  }, [savedMounts, selectedMountId])

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    if (savedMounts.length > 0) {
      localStorage.setItem('savedMounts', JSON.stringify(savedMounts))
    }
  }, [savedMounts])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        fetchMaxXp()
      }
    }
    checkAuth()
  }, [router, supabase.auth])

  // Récupérer le XP maximum depuis la table xp_familier
  const fetchMaxXp = async () => {
    try {
      const { data, error } = await supabase
        .from('xp_familier')
        .select('xp_total')
        .order('level', { ascending: false })
        .limit(1)

      if (error) throw error
      if (data && data.length > 0) {
        setMaxXp(data[0].xp_total)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du XP max:', error)
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

  // Recherche de familiers dans l'API
  useEffect(() => {
    const searchMounts = async () => {
      // Si on vient de sélectionner depuis le dropdown, ne pas rechercher
      if (isSelectingFromDropdown.current) {
        isSelectingFromDropdown.current = false
        return
      }

      if (mountSearch.length < 3) {
        setSuggestions([])
        setShowDropdown(false)
        return
      }

      try {
        setIsLoadingSuggestions(true)
        // Utiliser l'endpoint equipment avec le filtre Pet
        const response = await fetch(
          `https://api.dofusdu.de/dofus3/v1/fr/items/equipment/search?query=${encodeURIComponent(mountSearch)}&limit=10&filter[type.name_id]=Pet`
        )

        if (response.ok) {
          const data = await response.json()
          setSuggestions(Array.isArray(data) ? data : [])
          setShowDropdown(true)
        }
      } catch (error) {
        console.error('Erreur lors de la recherche de familiers:', error)
        setSuggestions([])
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    const timeoutId = setTimeout(searchMounts, 300)
    return () => clearTimeout(timeoutId)
  }, [mountSearch])

  // Sélectionner un familier depuis le dropdown
  const handleSelectMount = (mount) => {
    isSelectingFromDropdown.current = true
    setSelectedMount(mount)
    setMountSearch(mount.name)
    setShowDropdown(false)
    setSuggestions([])
  }

  // Calculer le XP restant
  useEffect(() => {
    if (maxXp !== null && startingXp >= 0) {
      const remaining = maxXp - startingXp
      setRemainingXp(remaining > 0 ? remaining : 0)
    }
  }, [startingXp, maxXp])

  // Sauvegarder le familier
  const handleSaveMount = () => {
    if (!selectedMount) {
      alert('Veuillez sélectionner un familier')
      return
    }

    if (startingXp < 0) {
      alert('Le XP de départ doit être positif')
      return
    }

    if (remainingXp === null || maxXp === null) {
      alert('Le XP maximum n\'a pas encore été chargé. Veuillez patienter.')
      return
    }

    // Pour l'instant, on ajoute juste au tableau local
    // Plus tard, on pourra sauvegarder en base de données
    const newMount = {
      id: Date.now(),
      mount: selectedMount,
      startingXp: startingXp,
      remainingXp: remainingXp,
      purchasePrice: purchasePrice, // Prix d'achat du familier
      resources: [], // Tableau des ressources ajoutées
      totalCost: purchasePrice // Prix total = prix d'achat + ressources
    }

    setSavedMounts([...savedMounts, newMount])

    // Réinitialiser le formulaire
    setSelectedMount(null)
    setMountSearch('')
    setStartingXp(0)
    setPurchasePrice(0)
    // remainingXp sera recalculé automatiquement par le useEffect
  }

  if (!user) return null

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Prix Familier</h1>

        {/* Formulaire d'ajout */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Ajouter un familier</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Nom du familier */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du familier
              </label>
              <input
                type="text"
                value={mountSearch}
                onChange={(e) => setMountSearch(e.target.value)}
                placeholder="Rechercher un familier (min. 3 caractères)..."
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
                  {!isLoadingSuggestions && suggestions.map((mount, index) => (
                    <button
                      key={`${mount.ankama_id}-${index}`}
                      type="button"
                      onClick={() => handleSelectMount(mount)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        {mount.image_urls?.sd ? (
                          <img
                            src={mount.image_urls.sd}
                            alt={mount.name}
                            className="w-12 h-12 rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{mount.name}</p>
                          <p className="text-xs text-gray-500">
                            ID: {mount.ankama_id}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && mountSearch.length >= 3 && suggestions.length === 0 && !isLoadingSuggestions && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                  <p className="text-sm text-gray-500 text-center">Aucun familier trouvé</p>
                </div>
              )}
            </div>

            {/* XP de départ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                XP de départ
              </label>
              <input
                type="number"
                value={startingXp}
                onChange={(e) => setStartingXp(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Prix d'achat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix d'achat
              </label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseInt(e.target.value) || 0)}
                min="0"
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* XP restant (calculé) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                XP restant
              </label>
              <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-semibold">
                {remainingXp !== null ? remainingXp.toLocaleString() : '-'}
              </div>
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <button
            onClick={handleSaveMount}
            className="w-full md:w-auto px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
          >
            Sauvegarder
          </button>
        </div>

        {/* Tableau des familiers sauvegardés */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-800">
              Familiers sauvegardés
            </h2>
          </div>

          {savedMounts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun familier sauvegardé. Utilisez le formulaire ci-dessus pour en ajouter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Familier
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      XP de départ
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      XP restant
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {savedMounts.map((saved) => {
                    const isSelected = selectedMountId === saved.id
                    return (
                      <React.Fragment key={saved.id}>
                        <tr
                          onClick={() => setSelectedMountId(isSelected ? null : saved.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-100 hover:bg-blue-200'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {saved.mount.image_urls?.sd && (
                            <img
                              src={saved.mount.image_urls.sd}
                              alt={saved.mount.name}
                              className="w-10 h-10 rounded"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">{saved.mount.name}</span>
                          {saved.resources && saved.resources.length > 0 && (
                            <span className="text-blue-600 text-xs font-bold">
                              {isSelected ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {saved.startingXp.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">
                        {saved.remainingXp !== null ? saved.remainingXp.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">
                        <div className="flex items-center justify-center gap-1">
                          {saved.totalCost > 0 ? saved.totalCost.toLocaleString() : '-'}
                          {saved.totalCost > 0 && (
                            <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSavedMounts(savedMounts.filter(m => m.id !== saved.id))}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Supprimer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {isSelected && saved.resources && saved.resources.length > 0 && (
                      <tr key={`${saved.id}-resources`}>
                        <td colSpan="5" className="px-6 py-4 bg-blue-50">
                          <div className="mb-2">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Ressources ajoutées:</h3>
                            <table className="min-w-full divide-y divide-gray-300">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Ressource</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">Quantité</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">XP apporté</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">Prix</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase w-16">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {saved.resources.map((resource, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm">
                                      <div className="flex items-center gap-2">
                                        {resource.item.image_urls?.icon && (
                                          <img
                                            src={resource.item.image_urls.icon}
                                            alt={resource.item.name}
                                            className="w-6 h-6 rounded"
                                          />
                                        )}
                                        <span className="font-medium">{resource.item.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-center text-sm text-gray-600">
                                      {resource.quantity.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-center text-sm text-blue-600 font-semibold">
                                      {resource.xpProvided.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-center text-sm text-green-600 font-semibold">
                                      <div className="flex items-center justify-center gap-1">
                                        {resource.cost.toLocaleString()}
                                        <img src="/Kama.webp" alt="kamas" className="w-3 h-3 inline-block translate-y-0.5" />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          // Supprimer la ressource
                                          const updatedMounts = savedMounts.map(m => {
                                            if (m.id === saved.id) {
                                              const newResources = m.resources.filter((_, i) => i !== idx)
                                              const resourcesCost = newResources.reduce((sum, r) => sum + r.cost, 0)
                                              const newTotalCost = (m.purchasePrice || 0) + resourcesCost
                                              const newRemainingXp = m.startingXp + newResources.reduce((sum, r) => sum + r.xpProvided, 0)
                                              return { ...m, resources: newResources, totalCost: newTotalCost, remainingXp: maxXp - newRemainingXp }
                                            }
                                            return m
                                          })
                                          setSavedMounts(updatedMounts)
                                        }}
                                        className="text-red-600 hover:text-red-800 transition-colors"
                                        title="Supprimer"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
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
