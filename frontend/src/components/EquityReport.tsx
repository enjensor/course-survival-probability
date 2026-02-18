import type { EquityReportData, EquityGroupData, EquityGroupMetric } from '../types'

interface Props {
  data: EquityReportData
}

/* ── Constants ──────────────────────────────────────────────────────── */

const GROUP_META: Record<string, { label: string; description: string }> = {
  low_ses:       { label: 'Lower-income areas',    description: 'Students from lower socioeconomic areas (bottom 25% nationally)' },
  regional:      { label: 'Regional',              description: 'Students from regional or outer-regional areas' },
  first_nations: { label: 'First Nations',         description: 'Aboriginal and Torres Strait Islander students' },
  disability:    { label: 'Disability',             description: 'Students who have reported a disability' },
  nesb:          { label: 'Non-English speaking background', description: 'Students from non-English speaking backgrounds' },
  remote:        { label: 'Remote',                description: 'Students from remote and very remote areas' },
}

const MEASURE_LABELS: Record<string, { label: string; description: string }> = {
  retention:  { label: 'Came back',       description: 'Re-enrolled the following year' },
  success:    { label: 'Passed subjects', description: 'Passed their enrolled subjects' },
  attainment: { label: 'Finished degree', description: 'Completed a qualification' },
}

const KEY_GROUPS = ['low_ses', 'regional', 'first_nations', 'disability', 'nesb']

/* ── Support label styling ──────────────────────────────────────────── */

function supportStyle(label: string) {
  switch (label) {
    case 'Strong': return { bg: 'bg-emerald-900/30', border: 'border-emerald-700', text: 'text-emerald-400' }
    case 'Weak':   return { bg: 'bg-red-900/30',     border: 'border-red-700',     text: 'text-red-400' }
    default:       return { bg: 'bg-amber-900/30',    border: 'border-amber-700',   text: 'text-amber-400' }
  }
}

/* ── Gap indicator ──────────────────────────────────────────────────── */

function GapBadge({ gap }: { gap: number | null }) {
  if (gap === null) return <span className="text-xs text-gray-600">N/A</span>
  const positive = gap >= 0
  const color = positive ? 'text-emerald-400' : 'text-red-400'
  const arrow = positive ? '▲' : '▼'
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {arrow} {Math.abs(gap).toFixed(1)} pts
    </span>
  )
}

/* ── Metric bar (rate vs national average) ──────────────────────────── */

function MetricBar({ metric, measure }: { metric: EquityGroupMetric; measure: string }) {
  const info = MEASURE_LABELS[measure]
  if (metric.rate === null) {
    return (
      <div className="py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">{info.label}</span>
          <span className="text-xs text-gray-600">No data</span>
        </div>
        <div className="h-2 rounded-full bg-gray-800" />
      </div>
    )
  }

  const rate = metric.rate
  const avg = metric.national_avg ?? 0
  const gap = metric.gap
  const positive = gap !== null && gap >= 0

  // Bar fills relative to 100%
  const ratePct = Math.min(rate, 100)
  const avgPct = Math.min(avg, 100)

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500" title={info.description}>{info.label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold tabular-nums ${positive ? 'text-emerald-300' : 'text-red-300'}`}>
            {rate.toFixed(1)}%
          </span>
          <GapBadge gap={gap} />
        </div>
      </div>
      <div className="relative h-2 rounded-full bg-gray-800 overflow-hidden">
        {/* Institution bar */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${positive ? 'bg-emerald-500/70' : 'bg-red-500/70'}`}
          style={{ width: `${ratePct}%` }}
        />
        {/* National average marker */}
        {avg > 0 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-gray-300 opacity-60"
            style={{ left: `${avgPct}%` }}
            title={`National avg: ${avg.toFixed(1)}%`}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-xs text-gray-600">0%</span>
        <span className="text-xs text-gray-600">
          Natl avg: {avg.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

/* ── Retention trend sparkline ──────────────────────────────────────── */

function RetentionSparkline({ trend }: { trend: EquityGroupData['trend'] }) {
  if (!trend || trend.length < 2) return null

  const values = trend.map((t) => t.retention)
  const years = trend.map((t) => t.year)
  const minV = Math.min(...values) - 1
  const maxV = Math.max(...values) + 1
  const range = maxV - minV || 1

  const W = 180
  const H = 36
  const pad = 4
  const plotW = W - pad * 2
  const plotH = H - pad * 2

  const points = values.map((v, i) => ({
    x: pad + (i / Math.max(values.length - 1, 1)) * plotW,
    y: pad + plotH - ((v - minV) / range) * plotH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const first = values[0]
  const last = values[values.length - 1]
  const up = last >= first

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-gray-600">Return rate trend</span>
        <span className={`text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
          {up ? '↑' : '↓'} {Math.abs(last - first).toFixed(1)} pts
          <span className="text-gray-600 ml-1">({years[0]}–{years[years.length - 1]})</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9">
        <path d={linePath} fill="none" stroke={up ? '#34d399' : '#f87171'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[0].x} cy={points[0].y} r="2" fill={up ? '#34d399' : '#f87171'} />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={up ? '#34d399' : '#f87171'} />
      </svg>
      <div className="flex justify-between text-xs text-gray-600 -mt-0.5">
        <span>{first.toFixed(1)}%</span>
        <span>{last.toFixed(1)}%</span>
      </div>
    </div>
  )
}

/* ── Equity Group Card ─────────────────────────────────────────────── */

function EquityGroupCard({
  groupKey,
  groupData,
}: {
  groupKey: string
  groupData: EquityGroupData
}) {
  const meta = GROUP_META[groupKey]
  if (!meta) return null

  // Check if any data exists
  const hasAnyData = groupData.retention.rate !== null
    || groupData.success.rate !== null
    || groupData.attainment.rate !== null

  if (!hasAnyData) return null

  // Compute group-level verdict
  const gaps = [groupData.retention.gap, groupData.success.gap, groupData.attainment.gap].filter(
    (g): g is number => g !== null
  )
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0
  const verdict = avgGap >= 1 ? 'Above average' : avgGap >= -1 ? 'Near average' : 'Below average'
  const verdictColor = avgGap >= 1 ? 'text-emerald-400' : avgGap >= -1 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
      {/* Group header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-100">{meta.label}</h3>
          <p className="text-xs text-gray-500">{meta.description}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 ${verdictColor}`}>
          {verdict}
        </span>
      </div>

      {/* Metric bars */}
      <div className="space-y-1">
        {(['retention', 'success', 'attainment'] as const).map((m) => (
          <MetricBar key={m} metric={groupData[m]} measure={m} />
        ))}
      </div>

      {/* Sparkline */}
      <RetentionSparkline trend={groupData.trend} />
    </div>
  )
}

/* ── All Domestic baseline card ─────────────────────────────────────── */

function BaselineCard({ allDomestic }: { allDomestic: EquityReportData['all_domestic'] }) {
  // Only show measures that have data (attainment has no all-domestic baseline
  // because the government data measures equity group share of completions,
  // so an "all domestic" value would always be 100% and is not published)
  const availableMeasures = (['retention', 'success', 'attainment'] as const).filter(
    (m) => allDomestic[m].rate !== null
  )

  if (!availableMeasures.length) return null

  return (
    <div className="bg-gray-900/60 rounded-2xl p-5 border border-gray-800">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-300">All Domestic Students</h3>
        <p className="text-xs text-gray-500">Baseline — how all domestic students at this uni are performing</p>
      </div>
      <div className={`grid gap-4 text-center ${availableMeasures.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {availableMeasures.map((m) => {
          const metric = allDomestic[m]
          const info = MEASURE_LABELS[m]
          return (
            <div key={m}>
              <p className="text-lg font-bold text-gray-100 tabular-nums">
                {metric.rate !== null ? `${metric.rate.toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">{info.label}</p>
              {metric.national_avg !== null && (
                <p className="text-xs text-gray-600 mt-0.5">
                  Natl: {metric.national_avg.toFixed(1)}%
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Support Score Header ───────────────────────────────────────────── */

function SupportHeader({ data }: { data: EquityReportData }) {
  const { support_summary } = data
  const style = supportStyle(support_summary.overall_label)

  return (
    <div className={`rounded-2xl p-5 ${style.bg} border ${style.border}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${style.text}`}>
            {support_summary.overall_label} Equity Support
          </h2>
          <p className="text-sm text-gray-400">
            {support_summary.groups_above_avg} of {support_summary.groups_total} equity groups perform above the national average
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini score indicator */}
          <div className="flex gap-1">
            {Array.from({ length: support_summary.groups_total }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm ${i < support_summary.groups_above_avg ? 'bg-emerald-500' : 'bg-gray-700'}`}
              />
            ))}
          </div>
          <span className="text-sm font-bold text-gray-300 tabular-nums">
            {support_summary.groups_above_avg}/{support_summary.groups_total}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────────────────── */

export default function EquityReport({ data }: Props) {
  const groups = data.groups
  const remoteData = groups['remote']
  const latestYears = data.latest_year

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-gray-100">{data.institution.name}</h2>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
          {data.institution.state && <span>{data.institution.state}</span>}
          <span className="text-gray-700">|</span>
          <span className="text-indigo-400">Equity Performance Report</span>
        </div>
        <p className="text-xs text-gray-600 mt-1.5">
          Data years — Return rate: {latestYears.retention ?? 'N/A'}
          {' · '}Subject pass rate: {latestYears.success ?? 'N/A'}
          {' · '}Degree completion: {latestYears.attainment ?? 'N/A'}
        </p>
      </div>

      {/* Support score */}
      <SupportHeader data={data} />

      {/* All domestic baseline */}
      <BaselineCard allDomestic={data.all_domestic} />

      {/* Section label */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Equity group breakdown
        </span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      {/* Key equity group cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KEY_GROUPS.map((gk, idx) => {
          const gd = groups[gk]
          if (!gd) return null
          const isLastOdd = idx === KEY_GROUPS.length - 1 && KEY_GROUPS.length % 2 === 1
          return (
            <div key={gk} className={isLastOdd ? 'md:col-span-2' : ''}>
              <EquityGroupCard groupKey={gk} groupData={gd} />
            </div>
          )
        })}
      </div>

      {/* Remote — shown separately with caveat */}
      {remoteData && (remoteData.retention.rate !== null || remoteData.success.rate !== null) && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Remote students
            </span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <EquityGroupCard groupKey="remote" groupData={remoteData} />
              <p className="text-xs text-gray-600 mt-2">
                Remote student cohorts are often very small, so rates may fluctuate significantly between years.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Source note */}
      <p className="text-xs text-gray-600 italic pt-2">
        Source: Department of Education, Section 16 — Equity Performance Data.
        First-generation and mature-age student data are not included in national equity statistics.
      </p>
    </div>
  )
}
