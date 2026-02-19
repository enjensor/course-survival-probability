import type { FieldRankingData, RankingEntry } from '../types'

interface Props {
  data: FieldRankingData
  institutionId: number
  fieldName: string
  year: number | null
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function positionColor(rank: number, total: number): string {
  const pct = rank / total
  if (pct <= 0.25) return 'text-emerald-400'
  if (pct <= 0.5) return 'text-amber-400'
  if (pct <= 0.75) return 'text-orange-400'
  return 'text-red-400'
}

function positionBg(rank: number, total: number): string {
  const pct = rank / total
  if (pct <= 0.25) return 'bg-emerald-900/40 border-emerald-700'
  if (pct <= 0.5) return 'bg-amber-900/40 border-amber-700'
  if (pct <= 0.75) return 'bg-orange-900/40 border-orange-700'
  return 'bg-red-900/40 border-red-700'
}

function RankTable({
  entries,
  currentId,
  label,
}: {
  entries: RankingEntry[]
  currentId: number
  label: string
}) {
  if (!entries.length) return null
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </h4>
      <div className="space-y-1">
        {entries.map((e) => {
          const isCurrent = e.id === currentId
          return (
            <div
              key={e.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition
                ${isCurrent ? 'bg-indigo-900/30 border border-indigo-700' : 'bg-gray-800/50'}`}
            >
              <span
                className={`w-7 text-right font-mono text-xs font-bold
                  ${isCurrent ? 'text-indigo-400' : 'text-gray-500'}`}
              >
                #{e.rank}
              </span>
              <span className={`flex-1 truncate ${isCurrent ? 'text-indigo-300 font-medium' : 'text-gray-300'}`}>
                {e.name}
                {isCurrent && <span className="ml-1.5 text-indigo-500 text-xs">(you)</span>}
              </span>
              <span className="text-xs text-gray-500 hidden sm:inline">
                {e.enrolled.toLocaleString()} enrolled
              </span>
              <span className={`font-bold tabular-nums w-14 text-right
                ${isCurrent ? 'text-indigo-400' : 'text-gray-200'}`}>
                {e.ratio}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function FieldRanking({ data, institutionId, fieldName, year }: Props) {
  const { this_institution: pos, top_5, bottom_5, national_avg_ratio } = data

  if (pos.rank === null) return null

  const rank = pos.rank
  const total = pos.of
  const ratio = pos.ratio ?? 0

  return (
    <div className="bg-gray-900 rounded-2xl p-6 space-y-5">
      <h3 className="text-sm font-medium text-gray-400">
        Graduation Rate Ranking
        <span className="text-gray-600 font-normal ml-1">({fieldName})</span>
      </h3>

      {/* Position badge + ratio comparison */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Rank badge */}
        <div className={`inline-flex items-baseline gap-1.5 px-4 py-2 rounded-xl border ${positionBg(rank, total)}`}>
          <span className={`text-2xl font-bold ${positionColor(rank, total)}`}>
            {ordinal(rank)}
          </span>
          <span className="text-sm text-gray-400">
            of {total} institutions
          </span>
        </div>

        {/* Ratio vs national average */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>This uni: {ratio}%</span>
            <span>National avg: {national_avg_ratio}%</span>
          </div>
          <div className="relative h-3 rounded-full bg-gray-800 overflow-hidden">
            {/* This institution's bar */}
            <div
              className={`absolute top-0 h-full rounded-full transition-all duration-500
                ${ratio >= national_avg_ratio ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(ratio / 50 * 100, 100)}%`, opacity: 0.7 }}
            />
            {/* National avg marker */}
            <div
              className="absolute top-0 h-full w-0.5 bg-white/60"
              style={{ left: `${Math.min(national_avg_ratio / 50 * 100, 100)}%` }}
              title={`National avg: ${national_avg_ratio}%`}
            />
          </div>
        </div>
      </div>

      {/* Top 5 / Bottom 5 tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <RankTable entries={top_5} currentId={institutionId} label="Highest graduation rate" />
        <RankTable entries={bottom_5} currentId={institutionId} label="Lowest graduation rate" />
      </div>

      <p className="text-xs text-gray-600">
        Graduation rate = graduates per 100 enrolled students{year ? ` (${year} data)` : ''}. Institutions with fewer than 50 students excluded.
      </p>
    </div>
  )
}
