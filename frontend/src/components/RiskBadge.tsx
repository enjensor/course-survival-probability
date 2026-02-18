import type { Attrition } from '../types'

interface Props {
  data: Attrition
}

const RISK_STYLES: Record<string, string> = {
  Low: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  Medium: 'bg-amber-900/50 text-amber-300 border-amber-700',
  High: 'bg-orange-900/50 text-orange-300 border-orange-700',
  'Very High': 'bg-red-900/50 text-red-300 border-red-700',
}

export default function RiskBadge({ data }: Props) {
  const style = data.risk_level ? RISK_STYLES[data.risk_level] ?? '' : ''

  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Dropout Risk</h3>

      {data.latest_rate !== null ? (
        <>
          {/* Big risk badge */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${style}`}
            >
              {data.risk_level}
            </span>
            <span className="text-2xl font-bold text-gray-100">{data.latest_rate}%</span>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">National average</span>
              <span className="text-gray-300">
                {data.national_avg !== null ? `${data.national_avg}%` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ranking</span>
              <span className="text-gray-300">
                {data.percentile !== null ? `${data.percentile}th percentile` : 'N/A'}
              </span>
            </div>

            {/* Comparison bar */}
            {data.national_avg !== null && (
              <div className="mt-3">
                <div className="relative h-2 rounded-full bg-gray-800">
                  {/* National avg marker */}
                  <div
                    className="absolute top-0 h-2 w-0.5 bg-gray-500"
                    style={{ left: `${Math.min(data.national_avg, 100)}%` }}
                    title={`National avg: ${data.national_avg}%`}
                  />
                  {/* This institution */}
                  <div
                    className="absolute top-0 h-2 rounded-full bg-current opacity-60"
                    style={{ width: `${Math.min(data.latest_rate, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-600">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            )}
          </div>

          {data.latest_year && (
            <p className="mt-3 text-xs text-gray-600">Data year: {data.latest_year}</p>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-sm">No dropout data available.</p>
      )}
    </div>
  )
}
