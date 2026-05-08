import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

export default function NewDestination() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Ange ett destinationsnamn'); return }
    setError('')
    setLoading(true)
    try {
      const { id } = await api.post('/api/destinations/generate', {
        name: name.trim(),
        country: country.trim(),
        dates: dateFrom ? { from: dateFrom, to: dateTo } : {},
      })
      navigate(`/destination/${id}`)
    } catch (err) {
      setError(err.message || 'Något gick fel. Försök igen.')
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-6 mt-2">
        <h2 className="text-xl font-bold text-slate-900">Nytt resmål</h2>
        <p className="text-sm text-slate-500 mt-0.5">Ange din destination och AI genererar en personanpassad guide</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Destination <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="t.ex. Bali, Barcelona, Thailand"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Land (valfritt)</label>
          <input
            type="text"
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="t.ex. Indonesien, Spanien"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Avresa</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hemresa</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
          Guiden anpassas automatiskt efter dina preferenser. Har du inte ställt in dem ännu?{' '}
          <a href="/preferenser" className="font-medium underline">Gör det här</a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Genererar guide…
            </>
          ) : (
            '✨ Generera resmålsguide'
          )}
        </button>
      </form>
    </div>
  )
}
