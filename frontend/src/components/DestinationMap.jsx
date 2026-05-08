import { useEffect, useRef } from 'react'
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

export default function DestinationMap({ sektioner, onKategoriClick }) {
  const containerRef = useRef(null)
  const onKategoriClickRef = useRef(onKategoriClick)

  useEffect(() => {
    onKategoriClickRef.current = onKategoriClick
  })

  useEffect(() => {
    if (!containerRef.current) return

    const markers = []
    Object.entries(sektioner || {}).forEach(([katId, sek]) => {
      ;(sek.tips || []).forEach((tip, i) => {
        if (tip.lat && tip.lng && tip.lat !== 0 && tip.lng !== 0) {
          markers.push({ ...tip, katId, index: i })
        }
      })
    })

    const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [48, 15]
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(center, 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    markers.forEach(m => {
      const el = document.createElement('div')
      el.style.minWidth = '160px'

      const title = document.createElement('div')
      title.style.cssText = 'font-weight:600;font-size:14px;margin-bottom:4px'
      title.textContent = `${KATEGORI_EMOJI[m.katId] || ''} ${m.namn}`
      el.appendChild(title)

      if (m.pris) {
        const pris = document.createElement('div')
        pris.style.cssText = 'font-size:12px;color:#64748b;margin-bottom:4px'
        pris.textContent = m.pris
        el.appendChild(pris)
      }

      const btn = document.createElement('button')
      btn.style.cssText = `font-size:12px;color:${KATEGORI_FARG[m.katId] || '#3b82f6'};background:none;border:none;padding:0;cursor:pointer;text-decoration:underline`
      btn.textContent = 'Visa i guide →'
      btn.addEventListener('click', () => onKategoriClickRef.current(m.katId))
      el.appendChild(btn)

      L.marker([m.lat, m.lng], { icon: pinIcon(m.katId) })
        .bindPopup(el)
        .addTo(map)
    })

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }

    return () => { map.remove() }
  }, [sektioner])

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm"
      style={{ height: '420px' }}
    />
  )
}
