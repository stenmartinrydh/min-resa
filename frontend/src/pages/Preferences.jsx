import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { api } from '../lib/api.js'

const KATEGORIER = [
  {
    id: 'mat',
    label: 'Mat & restauranger',
    icon: '🍽️',
    fält: [
      { id: 'koksstilar', label: 'Kökstilar', val: ['Lokalt kök', 'Italienskt', 'Asiatiskt', 'Gatukök', 'Fine dining', 'Vegetarisk/vegansk', 'Seafood', 'Tapas/spanskt', 'Medelhavsmat', 'Fransk bistro', 'Grill & BBQ', 'Sushi', 'Fusionskök', 'Streetfood'] },
      { id: 'budget', label: 'Restaurangbudget', val: ['Budget (under 20€)', 'Medel (20–50€)', 'Lyxigt (över 50€)', 'Blandat'] },
      { id: 'stämning', label: 'Stämning', val: ['Familjärt & mysigt', 'Romantiskt', 'Livligt & socialt', 'Lugnt & avskilt', 'Uteservering/terrass', 'Havsutsikt', 'Historisk miljö'] },
    ],
  },
  {
    id: 'dryck',
    label: 'Dryck & uteliv',
    icon: '🍹',
    fält: [
      { id: 'typer', label: 'Typ av ställen', val: ['Cocktailbarer', 'Vinkrogen/vinotek', 'Lokalt bryggeri', 'Nattliv/klubb', 'Kafé/fika', 'Rooftop barer', 'Sportbar', 'Jazz & livemusik', 'Strandbar'] },
      { id: 'stamning', label: 'Stämning', val: ['Avkopplande', 'Festlig', 'Intim', 'Lokal & autentisk'] },
    ],
  },
  {
    id: 'utflykter',
    label: 'Utflykter & aktiviteter',
    icon: '🗺️',
    fält: [
      { id: 'typer', label: 'Typ av aktiviteter', val: ['Naturupplevelser', 'Historiska platser', 'Museer & konst', 'Äventyr & sport', 'Guidade turer', 'Lokala evenemang', 'Matlagningskurser', 'Vandring', 'Cykling', 'Fotografi', 'Vinprovning', 'Yoga & wellness', 'Lokala marknader'] },
      { id: 'tempo', label: 'Resestil', val: ['Lugnt & avslappnat', 'Aktivt & händelserikt', 'Blandat', 'Spontant'] },
    ],
  },
  {
    id: 'strandar',
    label: 'Stränder & vatten',
    icon: '🏖️',
    fält: [
      { id: 'strandtyp', label: 'Strandtyp', val: ['Lugna & avlägsna', 'Folkrika med service', 'Sandstrand', 'Klippbad', 'Laguner', 'Barnvänlig strand', 'Nudiststranden', 'Vild & orörd natur'] },
      { id: 'aktiviteter', label: 'Vattenaktiviteter', val: ['Simning', 'Snorkling', 'Dykning', 'Surfing', 'Kajakpaddling', 'Segling', 'Kitesurfing', 'Paddleboard', 'Båttur'] },
    ],
  },
  {
    id: 'transport',
    label: 'Transport & förflyttning',
    icon: '🚌',
    fält: [
      { id: 'preferenser', label: 'Föredraget transportsätt', val: ['Hyr bil', 'Kollektivtrafik', 'Taxi/ridesharing', 'Moped/scooter', 'Cykel', 'Promenader', 'Tåg', 'Färja/båt'] },
    ],
  },
  {
    id: 'shopping',
    label: 'Shopping & marknader',
    icon: '🛍️',
    fält: [
      { id: 'typer', label: 'Typ av shopping', val: ['Lokala marknader', 'Köpcentrum', 'Souvenirer', 'Antikviteter', 'Mode & design', 'Lokala livsmedel & delikatesser', 'Hantverk & konst', 'Vintagebutiker', 'Loppmarknader'] },
      { id: 'budget', label: 'Shoppingbudget', val: ['Budget', 'Medel', 'Lyxigt', 'Blandat'] },
    ],
  },
  {
    id: 'boende',
    label: 'Boende & hotell',
    icon: '🏨',
    fält: [
      { id: 'typ', label: 'Boendetyp', val: ['Hotell', 'Resort', 'Villa/privat hus', 'Lägenhet/Airbnb', 'Boutique-hotell', 'Agriturismo/gård', 'Vandrarhem', 'Glamping'] },
      { id: 'standard', label: 'Standard', val: ['Budget', 'Medel', 'Lyx', 'Blandat'] },
      { id: 'onskemål', label: 'Önskemål', val: ['Pool', 'Barnvänligt', 'Husdjursvänligt', 'Centralt läge', 'Strandnära', 'Spa & wellness', 'Frukost ingår', 'Parkering', 'Havsutsikt'] },
    ],
  },
]

function ChipField({ fält, value, onChange }) {
  const arr = Array.isArray(value) ? value : value ? [value] : []
  function toggle(v) {
    onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {fält.val.map(v => (
        <button
          key={v}
          type="button"
          onClick={() => toggle(v)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${
            arr.includes(v)
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
          }`}
        >
          {arr.includes(v) && <Check className="w-3 h-3" />}
          {v}
        </button>
      ))}
    </div>
  )
}

function KategoriSection({ kat, prefs, onChange, onFritext }) {
  const [open, setOpen] = useState(false)
  const antalVal = kat.fält.reduce((n, f) => {
    const v = prefs[f.id]
    return n + (Array.isArray(v) ? v.length : v ? 1 : 0)
  }, 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
      >
        <span className="text-xl">{kat.icon}</span>
        <span className="flex-1 font-medium text-slate-900">{kat.label}</span>
        {antalVal > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
            {antalVal} val
          </span>
        )}
        <span className="text-slate-400 text-sm ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-slate-50 space-y-5 pt-4">
          {kat.fält.map(fält => (
            <div key={fält.id}>
              <p className="text-sm font-medium text-slate-700 mb-2">{fält.label}</p>
              <ChipField fält={fält} value={prefs[fält.id]} onChange={v => onChange(fält.id, v)} />
            </div>
          ))}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Övrigt / fritext</p>
            <textarea
              value={prefs.fritext || ''}
              onChange={e => onFritext(e.target.value)}
              placeholder={`Berätta mer om dina preferenser för ${kat.label.toLowerCase()}…`}
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Preferences() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [localPrefs, setLocalPrefs] = useState(null)

  const { data: serverPrefs } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => api.get('/api/preferences'),
  })

  useEffect(() => {
    if (serverPrefs != null && localPrefs === null) {
      setLocalPrefs(serverPrefs)
    }
  }, [serverPrefs])

  const prefs = localPrefs ?? serverPrefs ?? {}

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/api/preferences', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preferences'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  function updateFält(katId, fältId, value) {
    setLocalPrefs(prev => ({
      ...prev,
      [katId]: { ...(prev?.[katId] || {}), [fältId]: value },
    }))
    setSaved(false)
  }

  function updateFritext(katId, value) {
    setLocalPrefs(prev => ({
      ...prev,
      [katId]: { ...(prev?.[katId] || {}), fritext: value },
    }))
    setSaved(false)
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-6 mt-2">
        <h2 className="text-xl font-bold text-slate-900">Mina preferenser</h2>
        <p className="text-sm text-slate-500 mt-0.5">Anpassa guiden efter dina intressen</p>
      </div>

      <div className="space-y-3 mb-6">
        {KATEGORIER.map(kat => (
          <KategoriSection
            key={kat.id}
            kat={kat}
            prefs={prefs[kat.id] || {}}
            onChange={(fältId, value) => updateFält(kat.id, fältId, value)}
            onFritext={(value) => updateFritext(kat.id, value)}
          />
        ))}
      </div>

      <button
        onClick={() => saveMutation.mutate(prefs)}
        disabled={saveMutation.isPending}
        className={`w-full font-semibold py-3.5 rounded-xl transition-colors ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white'
        }`}
      >
        {saveMutation.isPending ? 'Sparar…' : saved ? '✓ Sparat!' : 'Spara preferenser'}
      </button>
    </div>
  )
}
