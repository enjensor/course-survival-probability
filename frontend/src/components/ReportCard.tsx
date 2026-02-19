import type { ReportData, TrendPoint, CourseLevelBreakdown, CourseLevelPcts } from '../types'
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

/* ── Course Level Mix chart ───────────────────────────────────────── */

const LEVEL_LABELS: Record<string, string> = {
  postgrad_research: 'PG Research',
  postgrad_coursework: 'PG Coursework',
  bachelor: 'Bachelor',
  sub_bachelor: 'Sub-Bachelor',
}

const LEVEL_COLORS: Record<string, string> = {
  postgrad_research: '#818cf8',   // indigo-400
  postgrad_coursework: '#a78bfa', // violet-400
  bachelor: '#34d399',            // emerald-400
  sub_bachelor: '#fbbf24',        // amber-400
}

const LEVEL_KEYS = ['postgrad_research', 'postgrad_coursework', 'bachelor', 'sub_bachelor'] as const

function StackedBar({
  label,
  data,
  pctKey,
}: {
  label: string
  data: Record<string, number>
  pctKey: 'pct_postgrad_research' | 'pct_postgrad_coursework' | 'pct_bachelor' | 'pct_sub_bachelor'
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <div className="flex h-5 rounded-full overflow-hidden bg-gray-800">
        {LEVEL_KEYS.map((key) => {
          const pct = data[`pct_${key}`]
          if (!pct || pct < 0.5) return null
          return (
            <div
              key={key}
              className="relative group"
              style={{ width: `${pct}%`, backgroundColor: LEVEL_COLORS[key] }}
            >
              {pct >= 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-900">
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CourseLevelChart({
  enrolment,
  completion,
  nationalAvg,
  efficiency,
}: {
  enrolment: CourseLevelBreakdown
  completion: CourseLevelBreakdown | null
  nationalAvg: CourseLevelPcts | null
  efficiency: { postgrad_research: number | null; postgrad_coursework: number | null; bachelor: number | null; sub_bachelor: number | null; overall: number } | null
}) {
  return (
    <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        How this institution's student body is distributed across undergraduate and postgraduate courses,
        compared to the national average.
      </p>

      {/* Stacked bars */}
      <div className="space-y-3">
        <StackedBar label="This institution" data={enrolment as unknown as Record<string, number>} pctKey="pct_bachelor" />
        {nationalAvg && (
          <StackedBar label="National average" data={nationalAvg as unknown as Record<string, number>} pctKey="pct_bachelor" />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {LEVEL_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: LEVEL_COLORS[key] }} />
            <span className="text-xs text-gray-500">{LEVEL_LABELS[key]}</span>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-1.5 font-medium">Level</th>
              <th className="text-right py-1.5 font-medium">Enrolled</th>
              <th className="text-right py-1.5 font-medium">%</th>
              {completion && <th className="text-right py-1.5 font-medium">Graduates</th>}
              {completion && <th className="text-right py-1.5 font-medium">%</th>}
              {nationalAvg && <th className="text-right py-1.5 font-medium">Nat. avg %</th>}
            </tr>
          </thead>
          <tbody>
            {LEVEL_KEYS.map((key) => {
              const enrolCount = enrolment[key] ?? 0
              const enrolPct = enrolment[`pct_${key}` as keyof CourseLevelBreakdown] as number
              const compCount = completion?.[key] ?? null
              const compPct = completion?.[`pct_${key}` as keyof CourseLevelBreakdown] as number | undefined
              const natPct = nationalAvg?.[`pct_${key}` as keyof CourseLevelPcts]
              const diff = natPct != null ? enrolPct - natPct : null

              return (
                <tr key={key} className="border-b border-gray-800/50">
                  <td className="py-1.5 text-gray-300 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: LEVEL_COLORS[key] }} />
                    {LEVEL_LABELS[key]}
                  </td>
                  <td className="text-right py-1.5 text-gray-300 tabular-nums">
                    {enrolCount.toLocaleString()}
                  </td>
                  <td className="text-right py-1.5 text-gray-300 tabular-nums">
                    {enrolPct.toFixed(1)}%
                  </td>
                  {completion && (
                    <td className="text-right py-1.5 text-gray-300 tabular-nums">
                      {compCount !== null ? compCount.toLocaleString() : '—'}
                    </td>
                  )}
                  {completion && (
                    <td className="text-right py-1.5 text-gray-300 tabular-nums">
                      {compPct != null ? `${compPct.toFixed(1)}%` : '—'}
                    </td>
                  )}
                  {nationalAvg && (
                    <td className="text-right py-1.5 tabular-nums">
                      <span className="text-gray-500">{natPct?.toFixed(1)}%</span>
                      {diff !== null && Math.abs(diff) >= 1 && (
                        <span className={`ml-1 text-[10px] ${diff > 0 ? 'text-indigo-400' : 'text-gray-600'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {/* Total row */}
            <tr className="font-medium">
              <td className="py-1.5 text-gray-200">Total</td>
              <td className="text-right py-1.5 text-gray-200 tabular-nums">
                {enrolment.total.toLocaleString()}
              </td>
              <td className="text-right py-1.5 text-gray-200 tabular-nums">100%</td>
              {completion && (
                <td className="text-right py-1.5 text-gray-200 tabular-nums">
                  {completion.total.toLocaleString()}
                </td>
              )}
              {completion && (
                <td className="text-right py-1.5 text-gray-200 tabular-nums">100%</td>
              )}
              {nationalAvg && <td />}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Efficiency note */}
      {efficiency && (
        <div className="pt-1">
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="text-gray-400 font-medium">Graduates-to-enrolled ratio:</span>{' '}
            {efficiency.overall}% overall.
            This is a cross-sectional snapshot (graduates in {enrolment.year} vs students enrolled in {enrolment.year}),
            not a cohort completion rate.
          </p>
        </div>
      )}
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

      {/* ── Course Level Mix ── */}
      {data.course_level && data.course_level.enrolment && (
        <>
          <SectionLabel>
            Course Level Mix
            {data.course_level.enrolment.year && (
              <span className="ml-2 text-gray-600 normal-case tracking-normal font-normal">
                — {data.course_level.enrolment.year} data
              </span>
            )}
          </SectionLabel>
          <CourseLevelChart
            enrolment={data.course_level.enrolment}
            completion={data.course_level.completion}
            nationalAvg={data.course_level.national_avg_enrolment}
            efficiency={data.course_level.efficiency}
          />
        </>
      )}

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
