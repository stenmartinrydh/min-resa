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

function pinIconHighlight(katId) {
  const color = KATEGORI_FARG[katId] || '#64748b'
  return L.divIcon({
    html: `<div style="width:24px;height:24px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.45)"></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  })
}

function userPosIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(37,99,235,0.22)"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export default function DestinationMap({ sektioner, onKategoriClick, focusKatId, focusTipIndex, userPos }) {
  const containerRef = useRef(null)
  const onKategoriClickRef = useRef(onKategoriClick)

  useEffect(() => {
    onKategoriClickRef.current = onKategoriClick
  })

  useEffect(() => {
    if (!containerRef.current) return

    const allMarkers = []
    Object.entries(sektioner || {}).forEach(([katId, sek]) => {
      ;(sek.tips || []).forEach((tip, i) => {
        if (tip.lat && tip.lng && tip.lat !== 0 && tip.lng !== 0) {
          allMarkers.push({ ...tip, katId, index: i })
        }
      })
    })

    const markers = focusKatId
      ? allMarkers.filter(m => m.katId === focusKatId)
      : allMarkers

    const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [48, 15]
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(center, 14)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    let highlightedMarker = null

    markers.forEach(m => {
      const isHighlighted = focusKatId != null && m.index === focusTipIndex
      const icon = isHighlighted ? pinIconHighlight(m.katId) : pinIcon(m.katId)

      const el = document.createElement('div')
      el.style.minWidth = '170px'

      const title = document.createElement('div')
      title.style.cssText = 'font-weight:600;font-size:14px;margin-bottom:4px'
      title.textContent = `${KATEGORI_EMOJI[m.katId] || ''} ${m.namn}`
      el.appendChild(title)

      if (m.pris) {
        const pris = document.createElement('div')
        pris.style.cssText = 'font-size:12px;color:#64748b;margin-bottom:2px'
        pris.textContent = m.pris
        el.appendChild(pris)
      }

      if (m.adress) {
        const adress = document.createElement('div')
        adress.style.cssText = 'font-size:11px;color:#94a3b8;margin-bottom:6px'
        adress.textContent = m.adress
        el.appendChild(adress)
      }

      const btn = document.createElement('button')
      btn.style.cssText = `font-size:12px;color:${KATEGORI_FARG[m.katId] || '#3b82f6'};background:none;border:none;padding:0;cursor:pointer;text-decoration:underline`
      btn.textContent = 'Visa i guide →'
      btn.addEventListener('click', () => onKategoriClickRef.current(m.katId))
      el.appendChild(btn)

      const marker = L.marker([m.lat, m.lng], { icon }).bindPopup(el).addTo(map)
      if (isHighlighted) highlightedMarker = marker
    })

    if (userPos) {
      L.marker([userPos.lat, userPos.lng], { icon: userPosIcon() })
        .bindPopup('<div style="font-size:12px;font-weight:600">📍 Din position</div>')
        .addTo(map)
    }

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]))
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 })
      if (highlightedMarker) {
        map.whenReady(() => setTimeout(() => highlightedMarker.openPopup(), 200))
      }
    }

    return () => { map.remove() }
  }, [sektioner, focusKatId, focusTipIndex, userPos])

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm"
      style={{ height: 'min(70vh, 640px)', minHeight: '420px' }}
    />
  )
}
