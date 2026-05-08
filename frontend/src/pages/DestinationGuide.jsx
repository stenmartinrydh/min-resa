import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Heart } from 'lucide-react'
import { api } from '../lib/api.js'
import CategorySection from '../components/CategorySection.jsx'
import DestinationMap from '../components/DestinationMap.jsx'

const SEKTIONER = [
  { id: 'mat', label: 'Mat', icon: '🍽️' },
  { id: 'dryck', label: 'Dryck', icon: '🍹' },
  { id: 'utflykter', label: 'Utflykter', icon: '🗺️' },
  { id: 'strandar', label: 'Stränder', icon: '🏖️' },
  { id: 'transport', label: 'Transport', icon: '🚌' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'boende', label: 'Boende', icon: '🏨' },
]

const WMO_ICON = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

function weatherIcon(code) {
  return WMO_ICON[code] ?? '🌡️'
}

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })
}

function formatShortDate(str) {
  return new Date(str).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function useGeolocation() {
  const [pos, setPos] = useState(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    )
  }, [])
  return pos
}

function WeatherWidget({ destName, dates, sektioner }) {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    if (!dates?.from) return
    let cancelled = false

    async function fetchWeather() {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destName)}&count=1&language=sv&format=json`
        )
        const geoData = await geoRes.json()
        let lat, lng

        if (geoData.results?.[0]) {
          lat = geoData.results[0].latitude
          lng = geoData.results[0].longitude
        } else {
          // Fallback: använd koordinater från första tips med giltiga koordinater
          for (const sek of Object.values(sektioner || {})) {
            const tip = (sek.tips || []).find(t => t.lat && t.lng && t.lat !== 0)
            if (tip) { lat = tip.lat; lng = tip.lng; break }
          }
        }
        if (!lat || !lng || cancelled) return

        const end = dates.to || dates.from
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&start_date=${dates.from}&end_date=${end}`
        )
        const wData = await weatherRes.json()
        if (!cancelled && wData.daily) setWeather(wData.daily)
      } catch {
        // tyst fel — väder är valfritt
      }
    }
    fetchWeather()
    return () => { cancelled = true }
  }, [destName, dates, sektioner])

  if (!weather) return null

  const days = weather.time || []

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
      <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Väder under resan</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day, i) => (
          <div key={day} className="flex-shrink-0 flex flex-col items-center gap-0.5 min-w-[54px]">
            <span className="text-xs text-slate-400">{formatShortDate(day)}</span>
            <span className="text-2xl">{weatherIcon(weather.weathercode[i])}</span>
            <span className="text-xs font-semibold text-slate-800">{Math.round(weather.temperature_2m_max[i])}°</span>
            <span className="text-xs text-slate-400">{Math.round(weather.temperature_2m_min[i])}°</span>
            {weather.precipitation_sum[i] > 0 && (
              <span className="text-xs text-blue-400">{weather.precipitation_sum[i].toFixed(0)} mm</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ChecklistaFlik({ destId, dest }) {
  const qc = useQueryClient()
  const [generating, setGenerating] = useState(false)
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`checklist-${destId}`) || '{}') } catch { return {} }
  })

  function saveChecked(next) {
    setChecked(next)
    localStorage.setItem(`checklist-${destId}`, JSON.stringify(next))
  }

  function toggleItem(key) {
    saveChecked({ ...checked, [key]: !checked[key] })
  }

  async function generate() {
    setGenerating(true)
    try {
      await api.post(`/api/destinations/${destId}/checklist`, {})
      qc.invalidateQueries({ queryKey: ['destination', destId] })
    } catch {
      // ignorera
    } finally {
      setGenerating(false)
    }
  }

  const checklist = dest?.checklist

  if (!checklist) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-slate-600 font-medium mb-1">Förberedelse-checklista</p>
        <p className="text-slate-400 text-sm mb-6">AI genererar en personlig checklista för din resa</p>
        <button
          onClick={generate}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 mx-auto"
        >
          {generating ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Genererar…
            </>
          ) : '✨ Generera checklista'}
        </button>
      </div>
    )
  }

  const totalItems = checklist.kategorier.flatMap(k => k.items).length
  const doneItems = Object.values(checked).filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-slate-500">{doneItems}/{totalItems} klart</p>
        <button
          onClick={generate}
          disabled={generating}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {generating ? 'Genererar…' : 'Generera om'}
        </button>
      </div>
      {checklist.kategorier.map(kat => (
        <div key={kat.rubrik} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="font-semibold text-slate-900 text-sm">{kat.rubrik}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {kat.items.map((item, i) => {
              const key = `${kat.rubrik}-${i}`
              return (
                <label key={key} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!checked[key]}
                    onChange={() => toggleItem(key)}
                    className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                  />
                  <span className={`text-sm ${checked[key] ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {item}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DestinationGuide() {
  const { id } = useParams()
  const [aktivFlk, setAktivFlk] = useState('översikt')
  const [favoriter, setFavoriter] = useState([])
  const [regeneratingKat, setRegeneratingKat] = useState(null)
  const userPos = useGeolocation()
  const qc = useQueryClient()

  const { data: dest, isLoading, error } = useQuery({
    queryKey: ['destination', id],
    queryFn: () => api.get(`/api/destinations/${id}`),
  })

  // Synka favoriter från Firestore när dest laddas
  useEffect(() => {
    if (dest?.favoriter) setFavoriter(dest.favoriter)
  }, [dest?.favoriter])

  async function deleteTip(katId, index) {
    try {
      await api.delete(`/api/destinations/${id}/tips/${katId}/${index}`)
      qc.invalidateQueries({ queryKey: ['destination', id] })
    } catch {
      // ignorera
    }
  }

  async function regenerateCategory(katId) {
    setRegeneratingKat(katId)
    try {
      await api.post(`/api/destinations/${id}/sektioner/${katId}/regenerate`, {})
      qc.invalidateQueries({ queryKey: ['destination', id] })
    } catch {
      // ignorera
    } finally {
      setRegeneratingKat(null)
    }
  }

  async function toggleFavorit(katId, index) {
    const key = `${katId}-${index}`
    const next = favoriter.includes(key)
      ? favoriter.filter(f => f !== key)
      : [...favoriter, key]
    setFavoriter(next)
    try {
      await api.put(`/api/destinations/${id}/favoriter`, { favoriter: next })
      qc.invalidateQueries({ queryKey: ['destination', id] })
    } catch {
      setFavoriter(favoriter) // återställ vid fel
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="h-8 bg-slate-100 rounded-xl animate-pulse mb-4 w-3/4" />
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(k => <div key={k} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}
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
  const genererad = dest?.status === 'generated'

  // Samla alla favorittips
  const favoritTips = favoriter.flatMap(key => {
    const [katId, idx] = key.split('-')
    const tip = sektioner[katId]?.tips?.[parseInt(idx)]
    if (!tip) return []
    return [{ ...tip, katId, index: parseInt(idx) }]
  })

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-3 pb-1 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">{dest.name}</h2>
          <p className="text-xs text-slate-400 truncate">
            {dest.country}
            {dest.country && dest.dates?.from && ' · '}
            {dest.dates?.from && `${formatDate(dest.dates.from)} – ${formatDate(dest.dates.to)}`}
          </p>
        </div>
      </div>

      {dest.status === 'pending' && (
        <div className="text-center py-16 px-4">
          <svg className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-slate-500 text-sm">Genererar din resmålsguide…</p>
        </div>
      )}

      {dest.status === 'error' && (
        <div className="mx-4 bg-red-50 text-red-700 rounded-2xl p-4 text-sm">
          Något gick fel vid genereringen. Försök skapa resan igen.
        </div>
      )}

      {genererad && (
        <>
          {/* Flikmeny */}
          <div className="sticky top-0 bg-white z-10 border-b border-slate-100 shadow-sm">
            <div className="flex overflow-x-auto scrollbar-hide px-2 gap-1 py-2">
              {/* Översikt */}
              <button
                onClick={() => setAktivFlk('översikt')}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  aktivFlk === 'översikt' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🌍</span>
                <span>Översikt</span>
              </button>

              {/* Karta */}
              <button
                onClick={() => setAktivFlk('karta')}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  aktivFlk === 'karta' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🗺️</span>
                <span>Karta</span>
              </button>

              {/* Kategori-flikar */}
              {SEKTIONER.filter(s => sektioner[s.id]).map(s => (
                <button
                  key={s.id}
                  onClick={() => setAktivFlk(s.id)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    aktivFlk === s.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}

              {/* Favoriter — visas bara om det finns minst en */}
              {favoriter.length > 0 && (
                <button
                  onClick={() => setAktivFlk('favoriter')}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    aktivFlk === 'favoriter' ? 'bg-red-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">❤️</span>
                  <span>Favoriter</span>
                </button>
              )}

              {/* Förberedelser */}
              <button
                onClick={() => setAktivFlk('checklista')}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  aktivFlk === 'checklista' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">✅</span>
                <span>Förberedelser</span>
              </button>
            </div>
          </div>

          {/* Innehåll */}
          <div className="p-4">

            {/* Översikt */}
            {aktivFlk === 'översikt' && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-2xl px-4 py-4 text-sm text-blue-900 leading-relaxed">
                  {guide.sammanfattning}
                </div>

                {/* Väderprognos */}
                <WeatherWidget destName={dest.name} dates={dest.dates} sektioner={sektioner} />

                <div className="grid grid-cols-2 gap-2">
                  {SEKTIONER.filter(s => sektioner[s.id]).map(s => (
                    <button
                      key={s.id}
                      onClick={() => setAktivFlk(s.id)}
                      className="bg-white border border-slate-100 shadow-sm rounded-2xl p-3 flex items-center gap-2 text-left hover:border-blue-200 transition-colors"
                    >
                      <span className="text-xl">{s.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{sektioner[s.id]?.rubrik}</p>
                        <p className="text-xs text-slate-400">{(sektioner[s.id]?.tips || []).length} tips</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Karta */}
            {aktivFlk === 'karta' && (
              <DestinationMap
                sektioner={sektioner}
                onKategoriClick={katId => setAktivFlk(katId)}
              />
            )}

            {/* Kategori-flikar */}
            {SEKTIONER.filter(s => aktivFlk === s.id && sektioner[s.id]).map(s => (
              <div key={s.id}>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{sektioner[s.id].rubrik}</h3>
                <CategorySection
                  id={s.id}
                  sektion={sektioner[s.id]}
                  userPos={userPos}
                  favoriter={favoriter}
                  onToggleFavorit={toggleFavorit}
                  onDeleteTip={deleteTip}
                  onRegenerate={() => regenerateCategory(s.id)}
                  regenerating={regeneratingKat === s.id}
                />
              </div>
            ))}

            {/* Favoriter */}
            {aktivFlk === 'favoriter' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Dina favoriter</h3>
                {favoritTips.length === 0 ? (
                  <p className="text-slate-400 text-sm">Inga favoriter markerade ännu.</p>
                ) : (
                  <div className="space-y-3">
                    {favoritTips.map((tip, i) => (
                      <CategorySection
                        key={i}
                        id={tip.katId}
                        sektion={{ tips: [tip] }}
                        userPos={userPos}
                        favoriter={favoriter}
                        onToggleFavorit={toggleFavorit}
                        hideIntro
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Checklista */}
            {aktivFlk === 'checklista' && (
              <ChecklistaFlik destId={id} dest={dest} />
            )}

          </div>
        </>
      )}
    </div>
  )
}
