import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const ICONS = {
  mat: '🍽️',
  dryck: '🍹',
  utflykter: '🗺️',
  strandar: '🏖️',
  transport: '🚌',
  shopping: '🛍️',
  boende: '🏨',
}

export default function CategorySection({ id, sektion }) {
  const [open, setOpen] = useState(false)

  if (!sektion) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
      >
        <span className="text-2xl">{ICONS[id] || '📍'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{sektion.rubrik}</p>
          {!open && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{sektion.intro}</p>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-50">
          <p className="text-sm text-slate-600 mt-3 mb-3 leading-relaxed">{sektion.intro}</p>
          <ul className="space-y-2">
            {(sektion.tips || []).map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
