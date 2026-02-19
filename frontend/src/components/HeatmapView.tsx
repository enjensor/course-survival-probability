import { useState } from 'react'
import type { HeatmapData, HeatmapEntry } from '../types'

interface Props {
  data: HeatmapData
  onSelectInstitution: (institutionId: number, fieldId: number) => void
  stateFilter?: string | null
}

/* ── Risk tier colour helpers ──────────────────────────────────────── */
function tierBg(tier: HeatmapEntry['risk_tier']): string {
  switch (tier) {
    case 'low':    return 'bg-emerald-900/40 border-l-2 border-emerald-600'
    case 'medium': return 'bg-amber-900/30 border-l-2 border-amber-600'
    case 'high':   return 'bg-red-900/40 border-l-2 border-red-600'
  }
}

function tierText(tier: HeatmapEntry['risk_tier']): string {
  switch (tier) {
    case 'low':    return 'text-emerald-400'
    case 'medium': return 'text-amber-400'
    case 'high':   return 'text-red-400'
  }
}

function tierLabel(tier: HeatmapEntry['risk_tier']): string {
  switch (tier) {
    case 'low':    return 'Low'
    case 'medium': return 'Medium'
    case 'high':   return 'High'
  }
}

function tierPillClass(tier: HeatmapEntry['risk_tier']): string {
  switch (tier) {
    case 'low':    return 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
    case 'medium': return 'bg-amber-900/60 text-amber-300 border border-amber-700'
    case 'high':   return 'bg-red-900/60 text-red-300 border border-red-700'
  }
}

/* ── Risk score mini-bar ───────────────────────────────────────────── */
function RiskBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = Math.min((score / Math.max(maxScore, 1)) * 100, 100)
  const color =
    score < 10 ? 'bg-emerald-500' :
    score < 18 ? 'bg-amber-500' :
    'bg-red-500'

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-gray-800 min-w-[60px]">
        <div
          className={`h-full rounded-full ${color} opacity-70 transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-sm font-bold text-gray-200 w-10 text-right shrink-0">
        {score.toFixed(1)}
      </span>
    </div>
  )
}

/* ── Summary bar at top ────────────────────────────────────────────── */
function SummaryBar({ summary, fieldName }: { summary: HeatmapData['summary']; fieldName: string }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-100">{fieldName}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Dropout data: {summary.attrition_year} &nbsp;&middot;&nbsp; Enrolment/graduates: {summary.enrolment_year}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-gray-800 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-bold text-gray-100">{summary.num_institutions}</p>
            <p className="text-xs text-gray-500">Institutions</p>
          </div>
          <div className="bg-gray-800 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-bold text-amber-400">{summary.avg_risk.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Avg Risk</p>
          </div>
          <div className="bg-gray-800 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-bold text-emerald-400">{summary.min_risk.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Best</p>
          </div>
          <div className="bg-gray-800 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-bold text-red-400">{summary.max_risk.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Worst</p>
          </div>
        </div>
      </div>

      {/* Best / Worst callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-emerald-900/20 border border-emerald-800 px-3 py-2">
          <span className="text-emerald-500 font-medium">Safest: </span>
          <span className="text-gray-300">{summary.best_institution_name}</span>
          <span className="text-gray-600 ml-1">(score {summary.min_risk.toFixed(1)})</span>
        </div>
        <div className="rounded-lg bg-red-900/20 border border-red-800 px-3 py-2">
          <span className="text-red-500 font-medium">Riskiest: </span>
          <span className="text-gray-300">{summary.worst_institution_name}</span>
          <span className="text-gray-600 ml-1">(score {summary.max_risk.toFixed(1)})</span>
        </div>
      </div>

      {/* Risk tier legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
        <span>Risk tier:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          Low (&lt;10)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          Medium (10–18)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          High (&gt;18)
        </span>
      </div>
    </div>
  )
}

/* ── Sort controls ─────────────────────────────────────────────────── */
type SortKey = 'composite_risk' | 'attrition_rate' | 'grad_ratio' | 'institution_name'
type SortDir = 'asc' | 'desc'

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
        ${active
          ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700'
          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
        }`}
    >
      {label}
      {active && (
        <span className="ml-1 opacity-70">{dir === 'asc' ? '\u2191' : '\u2193'}</span>
      )}
    </button>
  )
}

/* ── Main HeatmapView ──────────────────────────────────────────────── */
export default function HeatmapView({ data, onSelectInstitution, stateFilter }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('composite_risk')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Filter entries by state if a state filter is active
  const filteredEntries = stateFilter
    ? data.entries.filter((e) => e.state === stateFilter)
    : data.entries

  const maxRisk = data.summary.max_risk

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'institution_name' ? 'asc' : 'asc')
    }
  }

  const sorted = [...filteredEntries].sort((a, b) => {
    let av: number | string
    let bv: number | string

    if (sortKey === 'institution_name') {
      av = a.institution_name
      bv = b.institution_name
    } else if (sortKey === 'grad_ratio') {
      av = a.grad_ratio ?? 0
      bv = b.grad_ratio ?? 0
    } else {
      av = a[sortKey]
      bv = b[sortKey]
    }

    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'asc'
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number)
  })

  // Compute filtered summary stats when state filter is active
  const displaySummary = stateFilter && filteredEntries.length > 0
    ? {
        ...data.summary,
        num_institutions: filteredEntries.length,
        avg_risk: +(filteredEntries.reduce((a, e) => a + e.composite_risk, 0) / filteredEntries.length).toFixed(1),
        min_risk: Math.min(...filteredEntries.map((e) => e.composite_risk)),
        max_risk: Math.max(...filteredEntries.map((e) => e.composite_risk)),
        best_institution_name: filteredEntries.reduce((best, e) => e.composite_risk < best.composite_risk ? e : best, filteredEntries[0]).institution_name,
        worst_institution_name: filteredEntries.reduce((worst, e) => e.composite_risk > worst.composite_risk ? e : worst, filteredEntries[0]).institution_name,
      }
    : data.summary

  return (
    <div className="space-y-4">
      <SummaryBar summary={displaySummary} fieldName={data.field_name} />

      {/* Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">Sort by:</span>
        <SortButton label="Risk Score" active={sortKey === 'composite_risk'} dir={sortDir} onClick={() => handleSort('composite_risk')} />
        <SortButton label="Dropout Rate" active={sortKey === 'attrition_rate'} dir={sortDir} onClick={() => handleSort('attrition_rate')} />
        <SortButton label="Grad Rate" active={sortKey === 'grad_ratio'} dir={sortDir} onClick={() => handleSort('grad_ratio')} />
        <SortButton label="Name" active={sortKey === 'institution_name'} dir={sortDir} onClick={() => handleSort('institution_name')} />
      </div>

      {/* Table rows */}
      <div className="space-y-1.5">
        {sorted.map((entry, idx) => (
          <button
            key={entry.institution_id}
            onClick={() => onSelectInstitution(entry.institution_id, data.field_id)}
            className={`w-full text-left rounded-xl px-4 py-3 transition-all hover:brightness-125
              cursor-pointer ${tierBg(entry.risk_tier)}`}
          >
            <div className="flex items-center gap-3">
              {/* Rank */}
              <span className="text-xs font-mono text-gray-600 w-6 shrink-0 text-right">
                {idx + 1}
              </span>

              {/* Name + State */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-100 truncate block">
                  {entry.institution_name}
                </span>
                <span className="text-xs text-gray-500">{entry.state}</span>
              </div>

              {/* Attrition rate */}
              <div className="text-right shrink-0 hidden sm:block w-20">
                <p className="text-xs text-gray-500">Dropout</p>
                <p className="text-sm font-semibold text-gray-200">{entry.attrition_rate}%</p>
              </div>

              {/* Grad ratio */}
              <div className="text-right shrink-0 hidden md:block w-20">
                <p className="text-xs text-gray-500">Grad Rate</p>
                <p className="text-sm font-semibold text-gray-200">
                  {entry.grad_ratio !== null ? `${entry.grad_ratio}%` : 'N/A'}
                </p>
              </div>

              {/* Risk tier pill */}
              <div className="shrink-0 hidden sm:block">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tierPillClass(entry.risk_tier)}`}>
                  {tierLabel(entry.risk_tier)}
                </span>
              </div>

              {/* Risk score + bar */}
              <div className="shrink-0 w-32 hidden sm:block">
                <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                <RiskBar score={entry.composite_risk} maxScore={maxRisk} />
              </div>

              {/* Mobile: just risk score */}
              <div className="shrink-0 sm:hidden">
                <span className={`text-sm font-bold ${tierText(entry.risk_tier)}`}>
                  {entry.composite_risk.toFixed(1)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-600 pt-2">
        Risk score = dropout rate &times; (1 &minus; graduation rate). Lower is safer.
        Click any row to see that institution's full report with this field pre-selected.
      </p>
    </div>
  )
}
