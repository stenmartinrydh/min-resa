import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Trash2, ChevronRight, MapPin } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

function StatusChip({ status }) {
  if (status === 'generated') return (
    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Klar</span>
  )
  if (status === 'pending') return (
    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Genererar…</span>
  )
  return (
    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Fel</span>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ['destinations'],
    queryFn: () => api.get('/api/destinations'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/destinations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['destinations'] }),
  })

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-6 mt-2">
        <h2 className="text-xl font-bold text-slate-900">Hej, {user?.displayName || 'resenär'}! 👋</h2>
        <p className="text-sm text-slate-500 mt-0.5">Dina resor</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : destinations.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🌍</div>
          <p className="text-slate-600 font-medium">Inga resor ännu</p>
          <p className="text-slate-400 text-sm mt-1">Tryck på + för att planera din första resa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {destinations.map(dest => (
            <div key={dest.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <Link to={`/destination/${dest.id}`} className="flex items-center gap-3 px-4 py-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 truncate">{dest.name}</p>
                    <StatusChip status={dest.status} />
                  </div>
                  {dest.country && <p className="text-xs text-slate-400">{dest.country}</p>}
                  {dest.dates?.from && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(dest.dates.from)} – {formatDate(dest.dates.to)}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </Link>

              <div className="border-t border-slate-50 px-4 py-2 flex justify-end">
                <button
                  onClick={() => {
                    if (confirm(`Ta bort ${dest.name}?`)) deleteMutation.mutate(dest.id)
                  }}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Ta bort
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
