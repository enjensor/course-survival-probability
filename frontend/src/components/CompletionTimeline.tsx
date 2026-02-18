import type { CompletionTimeline as CTType } from '../types'

interface Props {
  data: CTType
}

interface BarProps {
  label: string
  pct: number | null
  nationalAvg: number | null
  period: string | null
}

function Bar({ label, pct, nationalAvg, period }: BarProps) {
  const barColor =
    pct === null
      ? 'bg-gray-700'
      : pct >= 70
        ? 'bg-emerald-500'
        : pct >= 40
          ? 'bg-amber-500'
          : 'bg-red-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-200 font-medium">{pct !== null ? `${pct}%` : 'N/A'}</span>
      </div>
      <div className="relative h-4 rounded-full bg-gray-800 overflow-hidden">
        {pct !== null && (
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        )}
        {/* National average marker */}
        {nationalAvg !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/50"
            style={{ left: `${Math.min(nationalAvg, 100)}%` }}
            title={`National avg: ${nationalAvg}%`}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{period ?? ''}</span>
        {nationalAvg !== null && <span>Nat. avg: {nationalAvg}%</span>}
      </div>
    </div>
  )
}

export default function CompletionTimeline({ data }: Props) {
  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Completion Timeline</h3>
      <div className="space-y-4">
        <Bar
          label="4-year"
          pct={data.four_year.pct}
          nationalAvg={data.four_year.national_avg}
          period={data.four_year.period}
        />
        <Bar
          label="6-year"
          pct={data.six_year.pct}
          nationalAvg={data.six_year.national_avg}
          period={data.six_year.period}
        />
        <Bar
          label="9-year"
          pct={data.nine_year.pct}
          nationalAvg={data.nine_year.national_avg}
          period={data.nine_year.period}
        />
      </div>
    </div>
  )
}
