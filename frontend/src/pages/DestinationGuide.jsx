import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api } from '../lib/api.js'
import CategorySection from '../components/CategorySection.jsx'

const SEKTION_ORDER = ['mat', 'dryck', 'utflykter', 'strandar', 'transport', 'shopping', 'boende']

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })
}

export default function DestinationGuide() {
  const { id } = useParams()

  const { data: dest, isLoading, error } = useQuery({
    queryKey: ['destination', id],
    queryFn: () => api.get(`/api/destinations/${id}`),
  })

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="h-8 bg-slate-100 rounded-xl animate-pulse mb-4 w-3/4" />
        <div className="space-y-3">
          {SEKTION_ORDER.map(k => <div key={k} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 text-sm">{error.message}</p>
        <Link to="/" className="text-blue-600 text-sm mt-2 inline-block">← Tillbaka</Link>
      </div>
    )
  }

  const guide = dest?.guide
  const sektioner = guide?.sektioner || {}

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link to="/" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Tillbaka
      </Link>

      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900">{dest.name}</h2>
        {dest.country && <p className="text-sm text-slate-500">{dest.country}</p>}
        {dest.dates?.from && (
          <p className="text-sm text-slate-400 mt-0.5">
            {formatDate(dest.dates.from)} – {formatDate(dest.dates.to)}
          </p>
        )}
      </div>

      {dest.status === 'pending' ? (
        <div className="text-center py-12">
          <svg className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-slate-500 text-sm">Genererar din reseguide…</p>
        </div>
      ) : dest.status === 'error' ? (
        <div className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">
          Något gick fel vid genereringen. Försök skapa resan igen.
        </div>
      ) : (
        <>
          {guide?.sammanfattning && (
            <div className="bg-blue-50 rounded-2xl px-4 py-3 mb-4 text-sm text-blue-800 leading-relaxed">
              {guide.sammanfattning}
            </div>
          )}

          <div className="space-y-3">
            {SEKTION_ORDER.map(key => (
              <CategorySection key={key} id={key} sektion={sektioner[key]} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
