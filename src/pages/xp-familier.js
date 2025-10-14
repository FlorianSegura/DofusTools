import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../utils/supabase/client'
import Layout from '../components/Layout'

export default function XpFamilier() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [xpData, setXpData] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [searchLevel, setSearchLevel] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        fetchXpData()
      }
    }
    checkAuth()
  }, [router, supabase.auth])

  const fetchXpData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('xp_familier')
      .select('*')
      .order('level', { ascending: true })

    if (error) {
      console.error('Error fetching XP data:', error)
    } else {
      setXpData(data || [])
    }
    setLoading(false)
  }

  const handleCellClick = (rowId, field, currentValue) => {
    setEditingCell(`${rowId}-${field}`)
    setEditValue(currentValue.toString())
  }

  const handleCellBlur = async (rowId, field) => {
    if (editingCell === `${rowId}-${field}`) {
      const numericValue = parseInt(editValue.replace(/\s/g, ''), 10)

      if (!isNaN(numericValue)) {
        const { error } = await supabase
          .from('xp_familier')
          .update({ [field]: numericValue })
          .eq('id', rowId)

        if (error) {
          console.error('Error updating data:', error)
          alert('Erreur lors de la mise à jour')
        } else {
          fetchXpData()
        }
      }

      setEditingCell(null)
      setEditValue('')
    }
  }

  const handleKeyPress = (e, rowId, field) => {
    if (e.key === 'Enter') {
      handleCellBlur(rowId, field)
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setEditValue('')
    }
  }

  // Filtrer les données selon le niveau recherché
  const filteredXpData = searchLevel
    ? xpData.filter(row => row.level.toString() === searchLevel)
    : xpData

  if (!user) return null

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Titre et champ de recherche sur la même ligne */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-900">XP Familier</h1>

          {/* Champ de recherche de niveau à droite */}
          <div className="flex items-center gap-3">
            <label htmlFor="searchLevel" className="text-sm font-medium text-gray-700">
              Recherche niveau:
            </label>
            <input
              id="searchLevel"
              type="number"
              value={searchLevel}
              onChange={(e) => setSearchLevel(e.target.value)}
              placeholder="Entrez un niveau..."
              className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchLevel && (
              <button
                onClick={() => setSearchLevel('')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Chargement des données...</span>
            </div>
          ) : xpData.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Aucune donnée disponible
                </h3>
                <p className="text-yellow-700 mb-4">
                  La table XP Familier est vide. Vous devez créer la table dans Supabase et y insérer les données.
                </p>
                <div className="bg-white rounded p-4 text-left text-sm">
                  <p className="font-semibold mb-2">SQL pour créer la table :</p>
                  <code className="block bg-gray-100 p-3 rounded text-xs">
                    {`CREATE TABLE xp_familier (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL,
  xp_required BIGINT NOT NULL,
  xp_total BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`}
                  </code>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800">
                  Tableau d'expérience
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Niveau
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        XP Requise
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        XP Totale
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredXpData.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                          {row.level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="inline-flex items-center group relative">
                            {editingCell === `${row.id}-xp_required` ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellBlur(row.id, 'xp_required')}
                                onKeyDown={(e) => handleKeyPress(e, row.id, 'xp_required')}
                                className="w-32 px-2 py-1 border border-blue-500 rounded text-center text-blue-600 font-medium"
                                autoFocus
                              />
                            ) : (
                              <>
                                <span className="text-blue-600 font-medium">+{row.xp_required?.toLocaleString() || '-'}</span>
                                <button
                                  onClick={() => handleCellClick(row.id, 'xp_required', row.xp_required)}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                          <div className="inline-flex items-center group relative">
                            {editingCell === `${row.id}-xp_total` ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellBlur(row.id, 'xp_total')}
                                onKeyDown={(e) => handleKeyPress(e, row.id, 'xp_total')}
                                className="w-32 px-2 py-1 border border-blue-500 rounded text-center"
                                autoFocus
                              />
                            ) : (
                              <>
                                <span>{row.xp_total?.toLocaleString() || '-'}</span>
                                <button
                                  onClick={() => handleCellClick(row.id, 'xp_total', row.xp_total)}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
