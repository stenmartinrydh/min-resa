import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { api } from '../lib/api.js'

const KATEGORIER = [
  {
    id: 'mat',
    label: 'Mat & restauranger',
    icon: '🍽️',
    fält: [
      { id: 'koksstilar', label: 'Kökstilar', typ: 'multi', val: ['Lokalt kök', 'Italienskt', 'Asiatiskt', 'Gatukök', 'Fine dining', 'Vegetarisk/vegansk', 'Seafood', 'Tapas/spanskt'] },
      { id: 'budget', label: 'Restaurangbudget', typ: 'single', val: ['Budget', 'Medel', 'Lyxigt'] },
      { id: 'kost', label: 'Kosthänsyn/allergier', typ: 'multi', val: ['Glutenfritt', 'Laktosintolerant', 'Vegetariskt', 'Veganskt', 'Nöttallergi', 'Halal'] },
    ],
  },
  {
    id: 'dryck',
    label: 'Dryck & uteliv',
    icon: '🍹',
    fält: [
      { id: 'typer', label: 'Typ av ställen', typ: 'multi', val: ['Cocktailbarer', 'Vinkrogen/vinotek', 'Lokalt bryggeri', 'Nattliv/klubb', 'Kafé/fika', 'Rooftop barer'] },
      { id: 'stamning', label: 'Stämning', typ: 'single', val: ['Avkopplande', 'Festlig'] },
    ],
  },
  {
    id: 'utflykter',
    label: 'Utflykter & aktiviteter',
    icon: '🗺️',
    fält: [
      { id: 'typer', label: 'Typ av aktiviteter', typ: 'multi', val: ['Naturupplevelser', 'Historiska platser', 'Museer & konst', 'Äventyr & sport', 'Guidade turer', 'Lokala evenemang', 'Matlagningskurser'] },
      { id: 'tempo', label: 'Resesstil', typ: 'single', val: ['Lugnt', 'Aktivt'] },
    ],
  },
  {
    id: 'strandar',
    label: 'Stränder & vatten',
    icon: '🏖️',
    fält: [
      { id: 'strandtyp', label: 'Strandtyp', typ: 'multi', val: ['Lugna/avlägsna', 'Folkrika med service', 'Sandstrand', 'Klippbad'] },
      { id: 'aktiviteter', label: 'Vattenaktiviteter', typ: 'multi', val: ['Simning', 'Snorkling', 'Dykning', 'Surfing', 'Kajakpaddling', 'Barnvänlig strand'] },
    ],
  },
  {
    id: 'transport',
    label: 'Transport & förflyttning',
    icon: '🚌',
    fält: [
      { id: 'preferenser', label: 'Föredraget transportsätt', typ: 'multi', val: ['Hyr bil', 'Kollektivtrafik', 'Taxi/ridesharing', 'Moped/scooter', 'Cykel', 'Promenader'] },
    ],
  },
  {
    id: 'shopping',
    label: 'Shopping & marknader',
    icon: '🛍️',
    fält: [
      { id: 'typer', label: 'Typ av shopping', typ: 'multi', val: ['Lokala marknader', 'Köpcentrum', 'Souvenirer', 'Antikviteter', 'Mode & design'] },
      { id: 'budget', label: 'Shoppingbudget', typ: 'single', val: ['Budget', 'Medel', 'Lyxigt'] },
    ],
  },
  {
    id: 'boende',
    label: 'Boende & hotell',
    icon: '🏨',
    fält: [
      { id: 'typ', label: 'Boendetyp', typ: 'multi', val: ['Hotell', 'Resort', 'Villa/privat hus', 'Lägenhet/Airbnb', 'Boutique-hotell'] },
      { id: 'standard', label: 'Standard', typ: 'single', val: ['Budget', 'Medel', 'Lyx'] },
      { id: 'onskemål', label: 'Önskemål', typ: 'multi', val: ['Pool', 'Barnvänligt', 'Husdjursvänligt', 'Centralt läge', 'Strandnära', 'Spa & wellness'] },
    ],
  },
]

function MultiField({ fält, value, onChange }) {
  const arr = value || []
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

function SingleField({ fält, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {fält.val.map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${
            value === v
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
          }`}
        >
          {value === v && <Check className="w-3 h-3" />}
          {v}
        </button>
      ))}
    </div>
  )
}

function KategoriAccordion({ kat, prefs, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
      >
        <span className="text-xl">{kat.icon}</span>
        <span className="flex-1 font-medium text-slate-900">{kat.label}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-slate-50 space-y-4 pt-4">
          {kat.fält.map(fält => (
            <div key={fält.id}>
              <p className="text-sm font-medium text-slate-700 mb-2">{fält.label}</p>
              {fält.typ === 'multi' ? (
                <MultiField
                  fält={fält}
                  value={prefs[fält.id]}
                  onChange={v => onChange(fält.id, v)}
                />
              ) : (
                <SingleField
                  fält={fält}
                  value={prefs[fält.id]}
                  onChange={v => onChange(fält.id, v)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Preferences() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [localPrefs, setLocalPrefs] = useState(null)

  const { data: serverPrefs, isLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => api.get('/api/preferences'),
  })

  useEffect(() => {
    if (serverPrefs !== undefined && localPrefs === null) {
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

  function updateKatFält(katId, fältId, value) {
    setLocalPrefs(prev => ({
      ...prev,
      [katId]: { ...(prev?.[katId] || {}), [fältId]: value },
    }))
    setSaved(false)
  }

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-3">
        {KATEGORIER.map(k => <div key={k.id} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-6 mt-2">
        <h2 className="text-xl font-bold text-slate-900">Mina preferenser</h2>
        <p className="text-sm text-slate-500 mt-0.5">Anpassa guiden efter dina intressen</p>
      </div>

      <div className="space-y-3 mb-6">
        {KATEGORIER.map(kat => (
          <KategoriAccordion
            key={kat.id}
            kat={kat}
            prefs={prefs[kat.id] || {}}
            onChange={(fältId, value) => updateKatFält(kat.id, fältId, value)}
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
