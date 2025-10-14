import { useState, useCallback } from 'react'

/**
 * Fonction pour calculer la pertinence d'un résultat de recherche
 */
function calculateRelevance(item, searchQuery) {
  const itemName = item.name.toLowerCase()
  const queryLower = searchQuery.toLowerCase()

  let score = 0

  if (itemName === queryLower) score += 1000
  if (itemName.startsWith(queryLower)) score += 500

  const queryWords = queryLower.split(' ').filter(word => word.length > 0)
  const containsAllWords = queryWords.every(word => itemName.includes(word))
  if (containsAllWords) score += 100

  let currentIndex = 0
  for (const word of queryWords) {
    const wordIndex = itemName.indexOf(word, currentIndex)
    if (wordIndex !== -1) {
      score += 50
      currentIndex = wordIndex + word.length
    }
  }

  score -= itemName.length * 0.1

  return score
}

/**
 * Fonction pour normaliser une chaîne de recherche
 */
function normalizeSearchString(str) {
  return str
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/oe/g, 'œ')
    .replace(/æ/g, 'ae')
    .replace(/à|á|â|ã|ä|å/g, 'a')
    .replace(/è|é|ê|ë/g, 'e')
    .replace(/ì|í|î|ï/g, 'i')
    .replace(/ò|ó|ô|õ|ö/g, 'o')
    .replace(/ù|ú|û|ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ñ/g, 'n')
}

/**
 * Mapping des item_subtype.name_id vers les noms lisibles en français
 */
const SUBTYPE_NAMES = {
  'resources': 'Ressource',
  'consumables': 'Consommable',
  'equipment': 'Équipement',
  'cosmetics': 'Cosmétique',
  'quest': 'Item de Quête',
  'quest_items': 'Item de Quête'
}

/**
 * Enrichit un item avec un type lisible en français
 */
function enrichItemWithReadableType(item) {
  const subtypeName = item.item_subtype?.name_id
  const readableName = SUBTYPE_NAMES[subtypeName] || subtypeName || 'Inconnu'

  return {
    ...item,
    type: {
      ...item.type,
      name: readableName,
      subtype: subtypeName
    }
  }
}

/**
 * Hook pour rechercher des items dans l'API DofusDude
 * @returns {{
 *   suggestions: Array,
 *   isLoading: boolean,
 *   searchItems: Function,
 *   clearSuggestions: Function
 * }}
 */
export function useItemSearch() {
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const searchItems = useCallback(async (query) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    try {
      setIsLoading(true)

      const searchVariants = [
        query,
        query.replace(/oe/g, 'œ'),
        query.replace(/œ/g, 'oe'),
        normalizeSearchString(query)
      ]

      const uniqueVariants = [...new Set(searchVariants)]
      let allResults = []

      for (const variant of uniqueVariants) {
        const response = await fetch(
          `https://api.dofusdu.de/dofus3/v1/fr/items/search?query=${encodeURIComponent(variant)}&limit=10`
        )

        if (response.ok) {
          const data = await response.json()
          if (data && Array.isArray(data)) {
            allResults.push(...data)
          }
        }
      }

      const uniqueResults = allResults.filter((item, index, self) =>
        index === self.findIndex((t) => t.ankama_id === item.ankama_id)
      )

      const sortedResults = uniqueResults.sort((a, b) => {
        const scoreA = calculateRelevance(a, query)
        const scoreB = calculateRelevance(b, query)
        return scoreB - scoreA
      })

      const limitedResults = sortedResults.slice(0, 10)

      // Enrichir les résultats avec les types lisibles
      // Note: image_urls est déjà présent dans la réponse de /items/search
      const enrichedResults = limitedResults.map(item => enrichItemWithReadableType(item))

      setSuggestions(enrichedResults)

    } catch (error) {
      console.error('Erreur lors de la recherche d\'items:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return {
    suggestions,
    isLoading,
    searchItems,
    clearSuggestions
  }
}
