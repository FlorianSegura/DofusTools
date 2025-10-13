'use client'

import { useState } from 'react'

export default function TestDataEditor({ initialData }) {
  const [data, setData] = useState(initialData)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const startEdit = (row) => {
    setEditingId(row.id)
    setEditValue(row.test_column || '')
    setMessage(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (id) => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/test/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          value: editValue
        })
      })

      const result = await response.json()

      if (response.status === 401) {
        setMessage({ type: 'error', text: 'You must be logged in to edit data' })
      } else if (result.success) {
        // Update local data
        setData(data.map(row =>
          row.id === id ? { ...row, test_column: editValue } : row
        ))
        setMessage({ type: 'success', text: 'Updated successfully!' })
        setEditingId(null)
      } else {
        setMessage({ type: 'error', text: result.error || 'Update failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`px-4 py-3 rounded ${
          message.type === 'success'
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border-b text-left">ID</th>
              <th className="px-4 py-2 border-b text-left">Test Column</th>
              <th className="px-4 py-2 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b">{row.id}</td>
                <td className="px-4 py-2 border-b">
                  {editingId === row.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 w-full"
                      disabled={loading}
                    />
                  ) : (
                    <span>{row.test_column || '(empty)'}</span>
                  )}
                </td>
                <td className="px-4 py-2 border-b">
                  {editingId === row.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(row.id)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={loading}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(row)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
