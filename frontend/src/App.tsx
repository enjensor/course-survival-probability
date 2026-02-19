import { useState, useEffect, useMemo } from 'react'
import type { Institution, Field, ReportData, HeatmapData, EquityReportData } from './types'
import { fetchInstitutions, fetchFields, fetchReport, fetchHeatmap, fetchEquityReport } from './api'
import InstitutionSelector from './components/InstitutionSelector'
import FieldSelector from './components/FieldSelector'
import ReportCard from './components/ReportCard'
import HeatmapView from './components/HeatmapView'
import EquityReport from './components/EquityReport'
import AboutPage from './components/AboutPage'
import DataIntegrityPage from './components/DataIntegrityPage'
import AustraliaMap from './components/AustraliaMap'
import HowToRead from './components/HowToRead'

type AppMode = 'report' | 'heatmap' | 'equity' | 'methodology' | 'about'

// Fields with insufficient completion data for heatmap
const EXCLUDED_HEATMAP_FIELDS = new Set([11, 12, 13])

export default function App() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [selectedInst, setSelectedInst] = useState<number | null>(null)
  const [selectedField, setSelectedField] = useState<number | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Heatmap state
  const [mode, setMode] = useState<AppMode>('report')
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)
  const [heatmapLoading, setHeatmapLoading] = useState(false)
  const [heatmapError, setHeatmapError] = useState<string | null>(null)

  // Equity state
  const [equityData, setEquityData] = useState<EquityReportData | null>(null)
  const [equityLoading, setEquityLoading] = useState(false)
  const [equityError, setEquityError] = useState<string | null>(null)

  // State map filter
  const [selectedState, setSelectedState] = useState<string | null>(null)

  // Filtered fields for heatmap mode (exclude 11, 12, 13)
  const heatmapFields = fields.filter((f) => !EXCLUDED_HEATMAP_FIELDS.has(f.id))

  // Compute institution counts per state (for map labels)
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const inst of institutions) {
      if (inst.state && inst.state !== 'Multi-State') {
        counts[inst.state] = (counts[inst.state] ?? 0) + 1
      }
    }
    return counts
  }, [institutions])

  // Filter institutions by state (Multi-State institutions always pass)
  const filteredInstitutions = useMemo(() => {
    if (!selectedState) return institutions
    return institutions.filter(
      (i) => i.state === selectedState || i.state === 'Multi-State',
    )
  }, [institutions, selectedState])

  // Handle state selection from map
  function handleStateSelect(state: string | null) {
    setSelectedState(state)
    setSelectedInst(null)
    setSelectedField(null)
    setReport(null)
    setEquityData(null)
  }

  // Load institutions and fields on mount
  useEffect(() => {
    Promise.all([fetchInstitutions(), fetchFields()])
      .then(([insts, flds]) => {
        setInstitutions(insts)
        setFields(flds)
      })
      .catch(() => setError('Failed to load data. Is the backend running?'))
  }, [])

  // Fetch report when selection changes (report mode)
  useEffect(() => {
    if (selectedInst === null) {
      setReport(null)
      return
    }
    setLoading(true)
    setError(null)
    fetchReport(selectedInst, selectedField ?? undefined)
      .then((r) => {
        setReport(r)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load report.')
        setLoading(false)
      })
  }, [selectedInst, selectedField])

  // Fetch heatmap when field changes (heatmap mode)
  useEffect(() => {
    if (mode !== 'heatmap' || selectedField === null) {
      setHeatmapData(null)
      return
    }
    setHeatmapLoading(true)
    setHeatmapError(null)
    fetchHeatmap(selectedField)
      .then((data) => {
        setHeatmapData(data)
        setHeatmapLoading(false)
      })
      .catch(() => {
        setHeatmapError('Failed to load heatmap data. This field may have insufficient data.')
        setHeatmapLoading(false)
      })
  }, [mode, selectedField])

  // Fetch equity report when institution changes (equity mode)
  useEffect(() => {
    if (mode !== 'equity' || selectedInst === null) {
      setEquityData(null)
      return
    }
    setEquityLoading(true)
    setEquityError(null)
    fetchEquityReport(selectedInst)
      .then((data) => {
        setEquityData(data)
        setEquityLoading(false)
      })
      .catch(() => {
        setEquityError('Failed to load equity report. This institution may not have equity data.')
        setEquityLoading(false)
      })
  }, [mode, selectedInst])

  // Click a row in heatmap → switch to report with institution + field selected
  function handleHeatmapInstitutionSelect(institutionId: number, fieldId: number) {
    setSelectedInst(institutionId)
    setSelectedField(fieldId)
    setMode('report')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                <button
                  onClick={() => {
                    setMode('report')
                    setSelectedState(null)
                    setSelectedInst(null)
                    setSelectedField(null)
                    setReport(null)
                    setEquityData(null)
                    setHeatmapData(null)
                    setError(null)
                    setEquityError(null)
                    setHeatmapError(null)
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  <span className="text-indigo-400">Course Survival</span> Probability
                </button>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                How likely are you to finish? Data-driven completion insights for Australian higher education.
              </p>
            </div>

            {/* Mode switcher — scrollable on mobile, pill on desktop */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex items-center gap-1 bg-gray-900 rounded-full p-1 border border-gray-800 w-max sm:w-auto">
                <button
                  onClick={() => setMode('report')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${mode === 'report'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Report
                </button>
                <button
                  onClick={() => setMode('equity')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${mode === 'equity'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Equity
                </button>
                <button
                  onClick={() => setMode('heatmap')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${mode === 'heatmap'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Fields
                </button>
                <button
                  onClick={() => setMode('methodology')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${mode === 'methodology'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Methodology
                </button>
                <button
                  onClick={() => setMode('about')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${mode === 'about'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'}`}
                >
                  About
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Selectors (hidden on About page) */}
      {mode !== 'about' && mode !== 'methodology' && (
      <section className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {(mode === 'report' || mode === 'equity') && (
            <InstitutionSelector
              institutions={filteredInstitutions}
              value={selectedInst}
              onChange={setSelectedInst}
              stateFilter={selectedState}
              onClearStateFilter={() => handleStateSelect(null)}
            />
          )}
          {mode !== 'equity' && (
            <FieldSelector
              fields={mode === 'heatmap' ? heatmapFields : fields}
              value={selectedField}
              onChange={setSelectedField}
            />
          )}
        </div>
        {/* State filter badge for heatmap mode */}
        {mode === 'heatmap' && selectedState && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-500">Filtered to</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-900/50 border border-indigo-700 text-xs text-indigo-300">
              {selectedState}
              <button
                onClick={() => handleStateSelect(null)}
                className="hover:text-indigo-100 transition-colors ml-0.5"
                aria-label="Clear state filter"
              >
                &times;
              </button>
            </span>
            <span className="text-xs text-gray-600">&middot; showing state-level results</span>
          </div>
        )}
        {mode === 'heatmap' && selectedField === null && !selectedState && (
          <p className="text-xs text-gray-600 mt-2">
            Select a field of study above to see the risk heatmap for all institutions.
          </p>
        )}
        {mode === 'heatmap' && selectedField === null && selectedState && (
          <p className="text-xs text-gray-600 mt-2">
            Select a field of study above to see the risk heatmap for {selectedState} institutions.
          </p>
        )}
        {mode === 'equity' && selectedInst === null && (
          <p className="text-xs text-gray-600 mt-2">
            Select an institution above to see how it supports students from different equity groups.
          </p>
        )}
      </section>
      )}

      {/* Compact disclaimer */}
      {mode !== 'about' && mode !== 'methodology' && (
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs text-amber-700/80 leading-relaxed">
            This app is in development and provided for informational purposes only — not professional advice.
            Data sourced from the Dept of Education; may contain errors or omissions.{' '}
            <button
              onClick={() => {
                setMode('about')
                setTimeout(() => {
                  document.getElementById('disclaimer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }, 50)
              }}
              className="underline hover:text-amber-500 transition-colors"
            >
              Full disclaimer
            </button>
          </p>
        </div>
      )}

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 pt-6 pb-12">

        {/* ── University Report mode ── */}
        {mode === 'report' && (
          <>
            {error && (
              <div className="rounded-xl bg-red-900/30 border border-red-800 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              </div>
            )}

            {!loading && !error && !report && selectedInst === null && (
              <div className="pt-6 pb-16 max-w-2xl mx-auto">
                {/* Hero statement */}
                <div className="text-center mb-10">
                  <p className="text-lg text-gray-400 leading-relaxed">
                    Choosing a university is one of the biggest decisions you'll make. This app uses
                    real government data to show you which unis actually help students finish their degrees.
                  </p>
                  <p className="text-base text-gray-500 mt-4 leading-relaxed">
                    No marketing spin. No vague rankings. Just the numbers on dropout rates,
                    completion rates, and how students like you have fared.
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                  <div className="flex-1 h-px bg-gray-800" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <div className="flex-1 h-px bg-gray-800" />
                </div>

                {/* Core philosophy */}
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-600">
                    It's not about which uni has the flashiest reputation.
                  </p>
                  <p className="text-base font-semibold text-indigo-400">
                    It's about where you're most likely to succeed.
                  </p>
                </div>

                {/* Getting started instruction */}
                <div className="mt-10 mb-4 text-center">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Pick an institution from the dropdown above to get started.
                    <br className="hidden sm:inline" />{' '}
                    Or tap a state on the map below to narrow the list first.
                  </p>
                </div>

                {/* Australia state map */}
                <AustraliaMap
                  selectedState={selectedState}
                  onStateSelect={handleStateSelect}
                  stateCounts={stateCounts}
                />

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-12">
                  <button
                    onClick={() => setMode('report')}
                    className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-left hover:border-indigo-800 transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-gray-200">Institution Report</h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      Completion rates, dropout risk, and whether students are passing their subjects.
                    </p>
                  </button>
                  <button
                    onClick={() => setMode('equity')}
                    className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-left hover:border-indigo-800 transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-gray-200">Equity Report</h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      How well does an institution support students from different backgrounds?
                    </p>
                  </button>
                  <button
                    onClick={() => setMode('heatmap')}
                    className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-left hover:border-indigo-800 transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-gray-200">Explore by Field</h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      Compare all institutions side-by-side for your chosen area of study.
                    </p>
                  </button>
                </div>

                {/* Data currency note */}
                <div className="mt-10 pt-6 border-t border-gray-800/50">
                  <p className="text-xs text-gray-600 text-center leading-relaxed">
                    <span className="text-gray-500 font-medium">Data currency</span>
                    {' · '}Enrolments, completions &amp; subject pass rates: 2024
                    {' · '}Dropout &amp; retention rates: 2023
                    {' · '}Completion cohorts: 2005–2024
                    {' · '}Staff ratios: 2014–2023
                    <br className="hidden sm:inline" />
                    <span className="text-gray-700">
                      Source: Dept of Education, Sep 2025 publication.
                      Attrition data lags ~18 months — next update expected late 2026.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {!loading && report && (
              <>
                <HowToRead mode="report" />
                <div className="mt-4">
                  <ReportCard data={report} />
                </div>
              </>
            )}
          </>
        )}

        {/* ── Explore by Field mode ── */}
        {mode === 'heatmap' && (
          <>
            {heatmapError && (
              <div className="rounded-xl bg-red-900/30 border border-red-800 p-4 text-sm text-red-300">
                {heatmapError}
              </div>
            )}

            {heatmapLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              </div>
            )}

            {!heatmapLoading && !heatmapError && selectedField === null && (
              <div className="text-center pt-6 pb-20">
                <p className="text-gray-500 text-lg">
                  Select a field of study above to compare all institutions at a glance.
                </p>
              </div>
            )}

            {!heatmapLoading && heatmapData && (
              <>
                <HowToRead mode="heatmap" />
                <div className="mt-4">
                  <HeatmapView
                    data={heatmapData}
                    onSelectInstitution={handleHeatmapInstitutionSelect}
                    stateFilter={selectedState}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* ── Equity Report mode ── */}
        {mode === 'equity' && (
          <>
            {equityError && (
              <div className="rounded-xl bg-red-900/30 border border-red-800 p-4 text-sm text-red-300">
                {equityError}
              </div>
            )}

            {equityLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              </div>
            )}

            {!equityLoading && !equityError && selectedInst === null && (
              <div className="text-center pt-6 pb-20">
                <p className="text-gray-500 text-lg">
                  Select an institution above to see how it supports students from different backgrounds.
                </p>
              </div>
            )}

            {!equityLoading && equityData && (
              <>
                <HowToRead mode="equity" />
                <div className="mt-4">
                  <EquityReport data={equityData} />
                </div>
              </>
            )}
          </>
        )}

        {/* ── Methodology mode ── */}
        {mode === 'methodology' && <DataIntegrityPage />}

        {/* ── About mode ── */}
        {mode === 'about' && <AboutPage />}
      </main>

      {/* App-wide footer */}
      {mode !== 'about' && mode !== 'methodology' && (
        <footer className="border-t border-gray-900 py-4 text-center">
          <p className="text-xs text-gray-700">
            v1.0 &middot; Built by{' '}
            <button
              onClick={() => {
                setMode('about')
                setTimeout(() => {
                  document.getElementById('built-by')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }, 50)
              }}
              className="text-gray-500 hover:text-indigo-400 transition-colors"
            >
              Dr Jason Ensor
            </button>
            {' '}&middot;{' '}
            <span className="text-gray-700">
              Data: Dept of Education
            </span>
          </p>
        </footer>
      )}
    </div>
  )
}
