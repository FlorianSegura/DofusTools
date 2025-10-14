/**
 * Service pour interagir avec l'API DofusDude
 */

const API_BASE_URL = 'https://api.dofusdu.de/dofus3/v1/fr'

/**
 * Mapping des types d'items vers les endpoints de l'API
 */
const TYPE_ENDPOINT_MAP = {
  'items-resources': 'resources',
  'items-consumables': 'consumables',
  'items-equipment': 'equipment',
  'items-cosmetics': 'cosmetics',
  'items-quest': 'quest'
}

/**
 * Récupère le endpoint API pour un type d'item
 * @param {Object} type - Type de l'item
 * @returns {string} - Endpoint correspondant
 */
export function getItemTypeEndpoint(type) {
  return TYPE_ENDPOINT_MAP[type?.name_id] || 'resources'
}

/**
 * Recherche des items par nom
 * @param {string} query - Terme de recherche
 * @param {number} limit - Nombre maximum de résultats
 * @returns {Promise<Array>} - Liste des items trouvés
 */
export async function searchItems(query, limit = 10) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/search?query=${encodeURIComponent(query)}&limit=${limit}`
    )

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Erreur lors de la recherche d\'items:', error)
    throw error
  }
}

/**
 * Récupère les détails d'un item par son ID
 * @param {number} ankamaId - ID Ankama de l'item
 * @param {Object} type - Type de l'item
 * @returns {Promise<Object>} - Détails de l'item
 */
export async function getItemById(ankamaId, type) {
  try {
    const endpoint = getItemTypeEndpoint(type)
    const response = await fetch(
      `${API_BASE_URL}/items/${endpoint}/${ankamaId}`
    )

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'item:', error)
    throw error
  }
}

/**
 * Récupère l'icône d'un item
 * @param {number} ankamaId - ID Ankama de l'item
 * @param {Object} type - Type de l'item
 * @returns {Promise<string|null>} - URL de l'icône ou null
 */
export async function getItemIcon(ankamaId, type) {
  try {
    const itemData = await getItemById(ankamaId, type)
    return itemData?.image_urls?.icon || null
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'icône:', error)
    return null
  }
}
