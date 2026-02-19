import type { ReportData, TrendPoint } from '../types'
import CompletionGauge from './CompletionGauge'
import RiskBadge from './RiskBadge'
import TrendChart from './TrendChart'
import CompletionTimeline from './CompletionTimeline'
import FieldRanking from './FieldRanking'

interface Props {
  data: ReportData
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-1">{label}</h3>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{children}</span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  )
}

/* ── Mini sparkline for field trends ───────────────────────────────── */
function MiniSparkline({
  data,
  color = '#818cf8',
  label,
}: {
  data: TrendPoint[]
  color?: string
  label: string
}) {
  if (!data.length) return null

  const values = data.map((d) => d.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  const W = 200
  const H = 48
  const padX = 4
  const padY = 4
  const plotW = W - padX * 2
  const plotH = H - padY * 2

  const points = values.map((v, i) => {
    const x = padX + (i / Math.max(values.length - 1, 1)) * plotW
    const y = padY + plotH - ((v - minV) / range) * plotH
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Compute growth
  const first = values[0]
  const last = values[values.length - 1]
  const growthPct = first > 0 ? ((last - first) / first) * 100 : 0
  const growthColor = growthPct >= 0 ? 'text-emerald-400' : 'text-red-400'
  const growthArrow = growthPct >= 0 ? '\u2191' : '\u2193'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-xs font-medium ${growthColor}`}>
          {growthArrow} {Math.abs(growthPct).toFixed(0)}%
          <span className="text-gray-600 ml-1">
            ({data[0].year}-{data[data.length - 1].year})
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12">
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Start and end dots */}
        <circle cx={points[0].x} cy={points[0].y} r="2.5" fill={color} />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />
      </svg>
      <div className="flex justify-between text-xs text-gray-600 -mt-1">
        <span>{first.toLocaleString()}</span>
        <span>{last.toLocaleString()}</span>
      </div>
    </div>
  )
}

/* ── Mini trend for international attrition ──────────────────────── */
function IntlTrendMini({ data }: { data: Array<{ year: number; rate: number }> }) {
  if (data.length < 2) return null

  const rates = data.map((d) => d.rate)
  const minR = Math.min(...rates)
  const maxR = Math.max(...rates)
  const range = maxR - minR || 1

  const W = 200
  const H = 48
  const padX = 4
  const padY = 4
  const plotW = W - padX * 2
  const plotH = H - padY * 2

  const points = rates.map((r, i) => ({
    x: padX + (i / Math.max(rates.length - 1, 1)) * plotW,
    y: padY + plotH - ((r - minR) / range) * plotH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const first = rates[0]
  const last = rates[rates.length - 1]
  const diff = last - first
  // For attrition, lower is better so invert color logic
  const diffColor = diff <= 0 ? 'text-emerald-400' : 'text-red-400'
  const diffArrow = diff <= 0 ? '\u2193' : '\u2191'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">
          {data[0].year}–{data[data.length - 1].year}
        </span>
        <span className={`text-xs font-medium ${diffColor}`}>
          {diffArrow} {Math.abs(diff).toFixed(1)} pp
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12">
        <path d={linePath} fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[0].x} cy={points[0].y} r="2.5" fill="#f87171" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill="#f87171" />
      </svg>
      <div className="flex justify-between text-xs text-gray-600 -mt-1">
        <span>{first}%</span>
        <span>{last}%</span>
      </div>
    </div>
  )
}

export default function ReportCard({ data }: Props) {
  const hasField = !!data.field
  const fc = data.field_context

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-gray-100">{data.institution.name}</h2>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
          {data.institution.state && <span>{data.institution.state}</span>}
          {data.institution.provider_type && (
            <>
              <span className="text-gray-700">|</span>
              <span>{data.institution.provider_type}</span>
            </>
          )}
          {data.field && (
            <>
              <span className="text-gray-700">|</span>
              <span className="text-indigo-400">{data.field.name}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Field-specific section (only when field selected) ── */}
      {hasField && fc && (
        <>
          <SectionLabel>
            Field-specific data: {data.field!.name}
            {fc.year && (
              <span className="ml-2 text-gray-600 normal-case tracking-normal font-normal">
                — {fc.year} data
              </span>
            )}
          </SectionLabel>

          {/* Key field stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-indigo-400">
                {fc.enrolment?.toLocaleString() ?? 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Enrolled</p>
              {fc.year && <p className="text-xs text-gray-600">{fc.year}</p>}
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-emerald-400">
                {fc.completions?.toLocaleString() ?? 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Graduates</p>
              {fc.year && <p className="text-xs text-gray-600">{fc.year}</p>}
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-amber-400">
                {fc.completion_ratio !== null ? `${fc.completion_ratio}%` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Graduates per 100 enrolled</p>
              {fc.year && <p className="text-xs text-gray-600">{fc.year}</p>}
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-gray-100">
                {fc.field_share_pct !== null ? `${fc.field_share_pct}%` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">% of uni's students</p>
              {fc.year && <p className="text-xs text-gray-600">{fc.year}</p>}
            </div>
          </div>

          {/* Field trend sparklines */}
          {(fc.enrolment_trend.length > 1 || fc.completions_trend.length > 1) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fc.enrolment_trend.length > 1 && (
                <div className="bg-gray-900 rounded-2xl p-5">
                  <MiniSparkline
                    data={fc.enrolment_trend}
                    color="#818cf8"
                    label="Enrolment over time"
                  />
                </div>
              )}
              {fc.completions_trend.length > 1 && (
                <div className="bg-gray-900 rounded-2xl p-5">
                  <MiniSparkline
                    data={fc.completions_trend}
                    color="#34d399"
                    label="Graduates over time"
                  />
                </div>
              )}
            </div>
          )}

          {/* Field ranking table */}
          {fc.ranking && (
            <FieldRanking
              data={fc.ranking}
              institutionId={data.institution.id}
              fieldName={data.field!.name}
              year={fc.year}
            />
          )}
        </>
      )}

      {/* ── Institution-wide metrics ── */}
      {hasField && <SectionLabel>Institution-wide metrics</SectionLabel>}

      {/* Main metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CompletionGauge data={data.completion} />
        <RiskBadge data={data.attrition} />
      </div>

      {/* Retention + Success row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Came Back for Year 2"
          value={data.retention.rate !== null ? `${data.retention.rate}%` : 'N/A'}
          sub={data.retention.year ? `${data.retention.year} data` : undefined}
        />
        <StatCard
          label="Subject Pass Rate"
          value={data.success.rate !== null ? `${data.success.rate}%` : 'N/A'}
          sub={data.success.year ? `${data.success.year} data` : undefined}
        />
      </div>

      {/* Trend + Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendChart data={data.trend} />
        <CompletionTimeline data={data.completion_timeline} />
      </div>

      {/* ── International Students ── */}
      {data.international && (
        <>
          <SectionLabel>International Students</SectionLabel>
          <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              How overseas students fare at this institution compared to domestic students and the national average for international students.
            </p>

            {/* Metrics comparison grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Dropout Rate */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-500 font-medium">Dropout Rate</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-gray-100">
                    {data.international.attrition.rate !== null
                      ? `${data.international.attrition.rate}%`
                      : 'N/A'}
                  </p>
                  {data.international.attrition.rate !== null && data.attrition.latest_rate !== null && (
                    <span className={`text-xs font-medium ${
                      data.international.attrition.rate <= data.attrition.latest_rate
                        ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {data.international.attrition.rate <= data.attrition.latest_rate ? '↓' : '↑'} vs domestic ({data.attrition.latest_rate}%)
                    </span>
                  )}
                </div>
                {data.international.attrition.national_avg !== null && (
                  <p className="text-xs text-gray-600">
                    National avg (intl): {data.international.attrition.national_avg}%
                  </p>
                )}
                {data.international.attrition.year && (
                  <p className="text-xs text-gray-700">{data.international.attrition.year} data</p>
                )}
              </div>

              {/* Return Rate */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-500 font-medium">Came Back for Year 2</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-gray-100">
                    {data.international.retention.rate !== null
                      ? `${data.international.retention.rate}%`
                      : 'N/A'}
                  </p>
                  {data.international.retention.rate !== null && data.retention.rate !== null && (
                    <span className={`text-xs font-medium ${
                      data.international.retention.rate >= data.retention.rate
                        ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {data.international.retention.rate >= data.retention.rate ? '↑' : '↓'} vs domestic ({data.retention.rate}%)
                    </span>
                  )}
                </div>
                {data.international.retention.national_avg !== null && (
                  <p className="text-xs text-gray-600">
                    National avg (intl): {data.international.retention.national_avg}%
                  </p>
                )}
                {data.international.retention.year && (
                  <p className="text-xs text-gray-700">{data.international.retention.year} data</p>
                )}
              </div>

              {/* Subject Pass Rate */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-500 font-medium">Subject Pass Rate</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-gray-100">
                    {data.international.success.rate !== null
                      ? `${data.international.success.rate}%`
                      : 'N/A'}
                  </p>
                  {data.international.success.rate !== null && data.success.rate !== null && (
                    <span className={`text-xs font-medium ${
                      data.international.success.rate >= data.success.rate
                        ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {data.international.success.rate >= data.success.rate ? '↑' : '↓'} vs domestic ({data.success.rate}%)
                    </span>
                  )}
                </div>
                {data.international.success.national_avg !== null && (
                  <p className="text-xs text-gray-600">
                    National avg (intl): {data.international.success.national_avg}%
                  </p>
                )}
                {data.international.success.year && (
                  <p className="text-xs text-gray-700">{data.international.success.year} data</p>
                )}
              </div>
            </div>

            {/* Mini trend */}
            {data.international.trend.length > 1 && (
              <div className="pt-1">
                <p className="text-xs text-gray-500 mb-2">International dropout rate trend</p>
                <IntlTrendMini data={data.international.trend} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
