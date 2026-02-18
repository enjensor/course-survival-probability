import type { Completion } from '../types'

interface Props {
  data: Completion
}

function gaugeColor(pct: number | null): string {
  if (pct === null) return 'text-gray-600'
  if (pct >= 70) return 'text-emerald-400'
  if (pct >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function strokeColor(pct: number | null): string {
  if (pct === null) return '#4b5563'
  if (pct >= 70) return '#34d399'
  if (pct >= 40) return '#fbbf24'
  return '#f87171'
}

export default function CompletionGauge({ data }: Props) {
  const pct = data.nine_year_pct ?? data.six_year_pct ?? data.four_year_pct
  const label =
    data.nine_year_pct !== null
      ? '9-year'
      : data.six_year_pct !== null
        ? '6-year'
        : '4-year'

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const filled = pct !== null ? (pct / 100) * circumference : 0

  // Outcome breakdown (from 4-year cohort data)
  const hasOutcomes = data.still_enrolled_pct !== null || data.dropped_out_pct !== null || data.never_returned_pct !== null
  const outcomes = hasOutcomes
    ? [
        { label: 'Graduated', pct: data.four_year_pct, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
        { label: 'Still studying', pct: data.still_enrolled_pct, color: 'bg-indigo-500', textColor: 'text-indigo-400' },
        { label: 'Left but came back', pct: data.dropped_out_pct, color: 'bg-amber-500', textColor: 'text-amber-400' },
        { label: 'Never returned', pct: data.never_returned_pct, color: 'bg-red-500', textColor: 'text-red-400' },
      ].filter((o) => o.pct !== null)
    : []

  return (
    <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Completion Probability</h3>

      {/* SVG Gauge */}
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={strokeColor(pct)}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${gaugeColor(pct)}`}>
            {pct !== null ? `${pct}%` : 'N/A'}
          </span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </div>

      {/* Completion window breakdown */}
      <div className="mt-4 w-full space-y-1 text-sm">
        {data.four_year_pct !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">4-year</span>
            <span className="text-gray-300">{data.four_year_pct}%</span>
          </div>
        )}
        {data.six_year_pct !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">6-year</span>
            <span className="text-gray-300">{data.six_year_pct}%</span>
          </div>
        )}
        {data.nine_year_pct !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">9-year</span>
            <span className="text-gray-300">{data.nine_year_pct}%</span>
          </div>
        )}
        {data.national_avg_four_year !== null && (
          <div className="flex justify-between pt-1 border-t border-gray-800">
            <span className="text-gray-500">National avg (4yr)</span>
            <span className="text-gray-400">{data.national_avg_four_year}%</span>
          </div>
        )}
      </div>

      {/* Outcome breakdown — "What happens to 100 students?" */}
      {outcomes.length > 0 && (
        <div className="mt-4 w-full pt-3 border-t border-gray-800">
          <p className="text-xs font-medium text-gray-500 mb-2">
            What happened after 4 years?
          </p>
          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden mb-2">
            {outcomes.map((o) => (
              <div
                key={o.label}
                className={`${o.color} opacity-70 transition-all duration-500`}
                style={{ width: `${o.pct}%` }}
                title={`${o.label}: ${o.pct}%`}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {outcomes.map((o) => (
              <div key={o.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${o.color} opacity-70`} />
                  <span className="text-gray-500">{o.label}</span>
                </span>
                <span className={`font-medium tabular-nums ${o.textColor}`}>{o.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.cohort_period && (
        <p className="mt-2 text-xs text-gray-600">
          Students who started in {data.cohort_period.split('-')[0]}, tracked to {data.cohort_period.split('-')[1]}
        </p>
      )}
    </div>
  )
}
