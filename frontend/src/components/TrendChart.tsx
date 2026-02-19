import type { Trend } from '../types'

interface Props {
  data: Trend
}

const DIRECTION_LABEL: Record<string, { text: string; color: string; arrow: string }> = {
  improving: { text: 'Getting better', color: 'text-emerald-400', arrow: '\u2193' },
  stable: { text: 'Stable', color: 'text-amber-400', arrow: '\u2192' },
  worsening: { text: 'Getting worse', color: 'text-red-400', arrow: '\u2191' },
  unknown: { text: 'Unknown', color: 'text-gray-500', arrow: '' },
}

export default function TrendChart({ data }: Props) {
  const dir = DIRECTION_LABEL[data.direction] ?? DIRECTION_LABEL.unknown

  if (!data.years.length) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Dropout Trend</h3>
        <p className="text-gray-500 text-sm">No dropout trend data available.</p>
      </div>
    )
  }

  const rates = data.attrition_rates
  const minR = Math.max(0, Math.min(...rates) - 3)
  const maxR = Math.max(...rates) + 3
  const range = maxR - minR || 1

  // SVG sparkline dimensions
  const W = 280
  const H = 80
  const padX = 10
  const padY = 8
  const plotW = W - padX * 2
  const plotH = H - padY * 2

  const points = rates.map((r, i) => {
    const x = padX + (i / Math.max(rates.length - 1, 1)) * plotW
    const y = padY + plotH - ((r - minR) / range) * plotH
    return { x, y, r }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-1">Dropout Trend</h3>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-lg font-bold ${dir.color}`}>
          {dir.arrow} {dir.text}
        </span>
        <span className="text-xs text-gray-500">
          ({data.slope > 0 ? '+' : ''}
          {data.slope} pts/yr)
        </span>
      </div>

      {/* Sparkline */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none" role="img" aria-label={`Dropout trend chart: ${dir.text}, ${data.slope > 0 ? '+' : ''}${data.slope} points per year over ${data.years[0]} to ${data.years[data.years.length - 1]}`}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={padX}
            x2={W - padX}
            y1={padY + plotH * (1 - frac)}
            y2={padY + plotH * (1 - frac)}
            stroke="#374151"
            strokeWidth="0.5"
          />
        ))}

        {/* Line */}
        <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#818cf8" stroke="#1f2937" strokeWidth="1.5" />
        ))}
      </svg>

      {/* Year labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-1 px-2">
        {data.years.map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </div>
  )
}
