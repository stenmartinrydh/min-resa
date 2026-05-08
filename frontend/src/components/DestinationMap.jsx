import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

const KATEGORI_FARG = {
  mat: '#f97316',
  dryck: '#a855f7',
  utflykter: '#22c55e',
  strandar: '#3b82f6',
  transport: '#94a3b8',
  shopping: '#ec4899',
  boende: '#eab308',
}

const KATEGORI_EMOJI = {
  mat: '🍽️',
  dryck: '🍹',
  utflykter: '🗺️',
  strandar: '🏖️',
  transport: '🚌',
  shopping: '🛍️',
  boende: '🏨',
}

function pinIcon(katId) {
  const color = KATEGORI_FARG[katId] || '#64748b'
  return L.divIcon({
    html: `<div style="width:14px;height:14px;background:${color};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })
}

function FitBounds({ markers }) {
  const map = useMap()
  useEffect(() => {
    if (markers.length === 0) return
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [map, markers])
  return null
}

export default function DestinationMap({ sektioner, onKategoriClick }) {
  const markers = []
  Object.entries(sektioner || {}).forEach(([katId, sek]) => {
    ;(sek.tips || []).forEach((tip, i) => {
      if (tip.lat && tip.lng && tip.lat !== 0 && tip.lng !== 0) {
        markers.push({ ...tip, katId, index: i })
      }
    })
  })

  const center = markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : [48, 15]

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm" style={{ height: '420px' }}>
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds markers={markers} />
        {markers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={pinIcon(m.katId)}>
            <Popup>
              <div style={{ minWidth: '160px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  {KATEGORI_EMOJI[m.katId]} {m.namn}
                </div>
                {m.pris && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{m.pris}</div>
                )}
                <button
                  onClick={() => onKategoriClick(m.katId)}
                  style={{
                    fontSize: '12px',
                    color: KATEGORI_FARG[m.katId] || '#3b82f6',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Visa i guide →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
