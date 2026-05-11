import { MapPin, Navigation, Globe, Heart, Trash2, RefreshCw, Clock, CalendarCheck } from 'lucide-react'

const ICONS = {
  mat: '🍽️',
  dryck: '🍹',
  utflykter: '🗺️',
  strandar: '🏖️',
  transport: '🚌',
  shopping: '🛍️',
  boende: '🏨',
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function TipsKort({ tip, userPos, isFavorit, onToggleFavorit, onDeleteTip, onGoToMap }) {
  const harKoords = tip.lat && tip.lng && tip.lat !== 0 && tip.lng !== 0
  const mapsUrl = harKoords
    ? `https://maps.google.com/?q=${tip.lat},${tip.lng}`
    : `https://maps.google.com/?q=${encodeURIComponent(tip.namn + ' ' + (tip.adress || ''))}`

  const dist = userPos && harKoords
    ? haversineKm(userPos.lat, userPos.lng, tip.lat, tip.lng)
    : null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-base leading-snug">{tip.namn}</h4>
          {tip.pris && (
            <span className="text-xs text-slate-500 font-medium">{tip.pris}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {tip.dolda_parlan && (
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
              💎 Gömd pärla
            </span>
          )}
          {onToggleFavorit && (
            <button
              onClick={onToggleFavorit}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors"
              aria-label={isFavorit ? 'Ta bort favorit' : 'Lägg till favorit'}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${isFavorit ? 'fill-red-500 text-red-500' : 'text-slate-300'}`}
              />
            </button>
          )}
          {onDeleteTip && (
            <button
              onClick={onDeleteTip}
              className="p-1 rounded-full hover:bg-red-50 transition-colors group"
              aria-label="Ta bort tips"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-200 group-hover:text-red-400 transition-colors" />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed">{tip.beskrivning}</p>

      {tip.dolda_parlan && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed italic">
          {tip.dolda_parlan}
        </p>
      )}

      {tip.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tip.tags.map(t => (
            <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}

      {(tip.oppettider || tip.bokning_rekommenderas || tip.besokstips) && (
        <div className="space-y-1.5 border-t border-slate-50 pt-2">
          {tip.oppettider && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {tip.oppettider}
            </p>
          )}
          {tip.bokning_rekommenderas && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <CalendarCheck className="w-3 h-3 flex-shrink-0" />
              Bokning rekommenderas
            </p>
          )}
          {tip.besokstips && (
            <p className="text-xs text-slate-500 italic leading-relaxed">
              💡 {tip.besokstips}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {tip.adress && (
          <div className="flex items-center gap-1">
            {onGoToMap ? (
              <button
                onClick={onGoToMap}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{tip.adress}</span>
              </button>
            ) : (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{tip.adress}</span>
              </a>
            )}
          </div>
        )}
        {tip.webbplats && tip.webbplats !== 'null' && (
          <a
            href={tip.webbplats}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Officiell webbplats</span>
          </a>
        )}
        {dist !== null && (
          <span className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
            <Navigation className="w-3 h-3" />
            {formatDist(dist)} bort
          </span>
        )}
      </div>
    </div>
  )
}

export default function CategorySection({ id, sektion, userPos, favoriter = [], onToggleFavorit, onDeleteTip, onRegenerate, regenerating, onGoToMap, hideIntro = false }) {
  if (!sektion) return null

  const tips = sektion.tips || []

  return (
    <div className="space-y-3">
      {!hideIntro && sektion.intro && (
        <p className="text-sm text-slate-600 leading-relaxed px-1">{sektion.intro}</p>
      )}
      {onRegenerate && (
        <div className="flex justify-end">
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 disabled:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Genererar nya tips…' : 'Generera om kategorin'}
          </button>
        </div>
      )}
      {regenerating ? (
        <div className="space-y-3">
          {[1, 2, 3].map(k => <div key={k} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        tips.map((tip, i) => {
          const tipObj = typeof tip === 'string' ? { namn: tip, beskrivning: '' } : tip
          const katId = tipObj.katId || id
          const index = tipObj.index !== undefined ? tipObj.index : i
          const favKey = `${katId}-${index}`
          return (
            <TipsKort
              key={i}
              tip={tipObj}
              userPos={userPos}
              isFavorit={favoriter.includes(favKey)}
              onToggleFavorit={onToggleFavorit ? () => onToggleFavorit(katId, index) : null}
              onDeleteTip={onDeleteTip ? () => onDeleteTip(katId, index) : null}
              onGoToMap={onGoToMap ? () => onGoToMap(katId, index) : null}
            />
          )
        })
      )}
    </div>
  )
}
