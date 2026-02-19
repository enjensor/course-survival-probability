/**
 * Data Integrity & Methodology page.
 *
 * Explains every metric end-to-end: where the data comes from,
 * how it is computed, and what the numbers mean.
 */

function SectionCard({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      {children}
    </div>
  )
}

function MetricBlock({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-200">{title}</h4>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="text-sm text-gray-400 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-medium tabular-nums">{value}</span>
    </div>
  )
}

function FormulaBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/60 rounded-lg px-3 py-2 font-mono text-xs text-indigo-300 border border-gray-700">
      {children}
    </div>
  )
}

export default function DataIntegrityPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="text-center pb-2">
        <h2 className="text-2xl font-bold text-gray-100">Data Integrity & Methodology</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xl mx-auto">
          Every number in this app traces back to a government spreadsheet. This page explains
          exactly where the data comes from, how each metric is computed, and what the numbers mean.
        </p>
      </div>

      {/* ── Data Source ── */}
      <SectionCard id="data-source">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Data Source</h3>
        <div className="text-sm text-gray-400 leading-relaxed space-y-2">
          <p>
            All data is sourced from the Australian Department of Education's{' '}
            <span className="text-indigo-400">Higher Education Statistics Collection</span>.
            This is the official government dataset published annually, covering every
            registered higher education provider in Australia.
          </p>
          <p>
            The raw data is downloaded as XLSX spreadsheets from the Department's website,
            parsed into a structured SQLite database, and then queried by the app's analytics engine.
            No data is manually entered or estimated.
          </p>
          <div className="bg-gray-800 rounded-xl p-4 mt-3 space-y-1">
            <DataRow label="Source" value="Dept of Education, Higher Education Statistics" />
            <DataRow label="File format" value="XLSX spreadsheets" />
            <DataRow label="Coverage" value="All registered HE providers" />
            <DataRow label="Years available" value="2001 – 2024" />
            <DataRow label="Data sections used" value="Sections 1, 2, 14, 15, 16, 17" />
            <DataRow label="Database" value="SQLite (9 MB, 30k+ rows)" />
          </div>
        </div>
      </SectionCard>

      {/* ── Dropout Rate (Attrition) ── */}
      <SectionCard id="attrition">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Dropout Rate</h3>
        <div className="space-y-3">
          <MetricBlock title="What it measures" subtitle="Section 15 — Attrition Rate">
            <p>
              The percentage of domestic commencing bachelor students who were enrolled in
              year <em>N</em> but did not return in year <em>N+1</em>. A 10% attrition rate
              means that out of 100 students who started, 10 were not enrolled the following year.
            </p>
            <p>
              This is the government's official definition. It captures students who left for
              any reason: withdrawal, transfer to another institution, deferral, or academic exclusion.
              A student who transfers to another university is counted as "attrited" at the original institution.
            </p>
          </MetricBlock>
          <MetricBlock title="How it's computed in the app">
            <FormulaBox>Latest domestic attrition rate for the institution (most recent year available)</FormulaBox>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Data source" value="Section 15 XLSX files" />
              <DataRow label="Student type" value="Domestic" />
              <DataRow label="Years available" value="2001 – 2023" />
              <DataRow label="Institutions with data" value="42 (for 2023)" />
            </div>
          </MetricBlock>
          <MetricBlock title="Risk ranking">
            <p>
              The app ranks each institution's attrition rate against all other institutions
              in the same year using a midpoint percentile formula:
            </p>
            <FormulaBox>
              percentile = (n_below + 0.5 × n_equal) / total_institutions × 100
            </FormulaBox>
            <p>This percentile is then mapped to a risk level:</p>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="0 – 24th percentile" value="Low Risk" />
              <DataRow label="25 – 49th percentile" value="Medium Risk" />
              <DataRow label="50 – 74th percentile" value="High Risk" />
              <DataRow label="75th+ percentile" value="Very High Risk" />
            </div>
            <p className="text-xs text-gray-500">
              Higher attrition = higher percentile = higher risk. The midpoint formula avoids
              ties skewing the ranking — an institution equal to the median lands at the 50th percentile.
            </p>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* ── Return Rate (Retention) ── */}
      <SectionCard id="retention">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Came Back for Year 2 (Retention)</h3>
        <div className="space-y-3">
          <MetricBlock title="What it measures" subtitle="Section 15 — Retention Rate">
            <p>
              The percentage of domestic commencing bachelor students who returned for their
              second year. This is essentially the inverse of the attrition rate.
            </p>
            <p>
              For most institutions, retention + attrition ≈ 100%. Small discrepancies (under 0.5pp)
              occur due to rounding in the source data.
            </p>
          </MetricBlock>
          <MetricBlock title="How it's computed in the app">
            <FormulaBox>Latest domestic retention rate for the institution (most recent year available)</FormulaBox>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Data source" value="Section 15 XLSX files" />
              <DataRow label="Years available" value="2001 – 2023" />
              <DataRow label="Relationship to attrition" value="retention + attrition ≈ 100%" />
            </div>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* ── Subject Pass Rate (Success) ── */}
      <SectionCard id="success">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Subject Pass Rate (Success)</h3>
        <div className="space-y-3">
          <MetricBlock title="What it measures" subtitle="Section 15 — Success Rate">
            <p>
              The ratio of passed EFTSL (equivalent full-time student load) to attempted EFTSL
              for domestic students. In simpler terms: of the subjects students attempted,
              how many did they pass?
            </p>
            <p>
              A success rate of 90% means that across the entire student body, 90% of subject
              enrolments resulted in a pass. This is measured at the subject (unit) level, not
              the degree level.
            </p>
          </MetricBlock>
          <MetricBlock title="How it's computed in the app">
            <FormulaBox>Latest domestic success rate for the institution (most recent year available)</FormulaBox>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Data source" value="Section 15 XLSX files" />
              <DataRow label="Years available" value="2001 – 2024" />
              <DataRow label="Note" value="Extends 1 year beyond retention/attrition data" />
            </div>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* ── Dropout Trend ── */}
      <SectionCard id="trend">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Dropout Trend</h3>
        <div className="space-y-3">
          <MetricBlock title="What it measures">
            <p>
              The direction and magnitude of the institution's domestic attrition rate over time.
              The chart shows up to 8 years of historical data, and the trend direction is
              computed from the most recent 5 data points using linear regression.
            </p>
          </MetricBlock>
          <MetricBlock title="How the trend direction is computed">
            <p>
              An ordinary least squares (OLS) linear regression is fitted to the last 5 years of
              domestic attrition rates. The slope of this line (in percentage points per year)
              determines the trend:
            </p>
            <FormulaBox>
              slope = Σ((year - mean_year)(rate - mean_rate)) / Σ((year - mean_year)²)
            </FormulaBox>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Slope < −0.3 pp/yr" value="Improving ↓" />
              <DataRow label="−0.3 to +0.3 pp/yr" value="Stable →" />
              <DataRow label="Slope > +0.3 pp/yr" value="Worsening ↑" />
            </div>
            <p className="text-xs text-gray-500">
              239 institutions have 5+ years of data for trend analysis. Institutions with fewer
              than 5 years use all available data points (minimum 2).
            </p>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* ── Completion Rates ── */}
      <SectionCard id="completion">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Completion Rates (Finished Degree)</h3>
        <div className="space-y-3">
          <MetricBlock title="What it measures" subtitle="Section 17 — Completion Rates by Cohort">
            <p>
              This tracks a specific cohort of domestic commencing bachelor students from the year
              they enrolled and measures what happened to them 4, 6, or 9 years later. Each student
              ends up in one of four categories:
            </p>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Completed" value="Graduated with a degree" />
              <DataRow label="Still enrolled" value="Still studying (haven't finished yet)" />
              <DataRow label="Left but re-enrolled" value="Dropped out then came back" />
              <DataRow label="Never returned" value="Left and did not return" />
            </div>
            <p className="font-medium text-amber-400 text-xs mt-2">
              These four categories sum to 100% for each institution.
            </p>
          </MetricBlock>

          <MetricBlock title="Why the 4-year rate looks low (~42% national average)">
            <p>
              The 4-year completion rate is often surprising because it does not mean the remaining
              58% dropped out. The full picture for the most recent 4-year cohort nationally is:
            </p>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Graduated within 4 years" value="~42%" />
              <DataRow label="Still enrolled (still studying)" value="~36%" />
              <DataRow label="Left but re-enrolled somewhere" value="~12%" />
              <DataRow label="Never returned to higher ed" value="~11%" />
            </div>
            <p>
              So only about 11% of commencing students are truly gone forever at the 4-year mark.
              Most students who haven't graduated are still studying or have re-enrolled.
            </p>
            <p>
              At the <strong className="text-gray-200">6-year mark</strong>, the national average rises
              to <strong className="text-gray-200">~63%</strong> completed. At the{' '}
              <strong className="text-gray-200">9-year mark</strong>, it reaches{' '}
              <strong className="text-gray-200">~70%</strong>.
            </p>
            <p className="text-xs text-gray-500">
              Many bachelor degrees are structured as 3-year programmes, but students commonly take
              longer due to part-time study, combined degrees (e.g., double degrees which are 4-5 years),
              gap years, or course changes. The 4-year window captures a snapshot of a journey that,
              for many students, is still in progress.
            </p>
          </MetricBlock>

          <MetricBlock title="Data availability">
            <p>
              Completion rate data comes from two sources:
            </p>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-2 text-xs">
              <div>
                <span className="text-gray-300 font-medium">Section 17 (2024 publication)</span>
                <span className="text-gray-500"> — 543 rows with full outcome breakdown (graduated,
                still enrolled, dropped out, never returned). Covers the most recent cohorts.</span>
              </div>
              <div>
                <span className="text-gray-300 font-medium">Older Cohort Analysis files</span>
                <span className="text-gray-500"> — 1,354 rows with completed percentage only.
                The outcome breakdown columns are not available for these older cohorts.</span>
              </div>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1 mt-2">
              <DataRow label="4-year cohorts available" value="2005 – 2021 (start year)" />
              <DataRow label="6-year cohorts available" value="2005 – 2019 (start year)" />
              <DataRow label="9-year cohorts available" value="2005 – 2016 (start year)" />
              <DataRow label="Institutions per cohort" value="~42" />
            </div>
          </MetricBlock>

          <MetricBlock title="How the gauge works">
            <p>
              The completion probability gauge shows the best available long-term rate: 9-year if available,
              otherwise 6-year, otherwise 4-year. The sub-text shows all three windows with their cohort periods.
            </p>
            <p>
              The "What happened after 4 years?" stacked bar only appears when outcome breakdown data
              is available (most recent cohorts from the 2024 Section 17 publication).
            </p>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* ── Graduation Ratio (Field Ranking) ── */}
      <SectionCard id="graduation-ratio">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Graduation Ratio (Field Ranking)</h3>
        <div className="space-y-3">
          <MetricBlock title="What it measures" subtitle="Sections 2 + 14 — Enrolments & Completions">
            <p>
              When you select a field of study, the app computes a "graduation ratio" — the number of
              students who completed a degree in that field during the year, divided by the total number
              of students enrolled in that field.
            </p>
            <FormulaBox>
              graduation ratio = (completions in field ÷ total enrolled in field) × 100
            </FormulaBox>
            <p className="text-xs text-amber-400">
              Important: This is a cross-sectional snapshot, not a cohort-tracking measure.
            </p>
            <p>
              A ratio of 25% does not mean only 25% of students graduate. It means that in any given year,
              the number of graduates equals 25% of the total enrolled stock. Since most degrees take 3+
              years, the enrolled stock always includes many students who are mid-degree. A "healthy"
              cross-sectional ratio for a 3-year degree is roughly 25-35%.
            </p>
          </MetricBlock>
          <MetricBlock title="How the ranking works">
            <p>
              All institutions offering the selected field are ranked by this graduation ratio.
              To ensure statistical reliability, institutions with fewer than 50 enrolled students
              in the field are excluded.
            </p>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Data source (enrolments)" value="Section 2 / Pivot tables" />
              <DataRow label="Data source (completions)" value="Section 14 / Pivot tables" />
              <DataRow label="Year" value="2024 (most recent)" />
              <DataRow label="Student type" value="All (not commencing-only)" />
              <DataRow label="Minimum enrolment threshold" value="50 students" />
            </div>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* ── Heatmap (Explore by Field) ── */}
      <SectionCard id="heatmap">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Risk Heatmap (Explore by Field)</h3>
        <div className="space-y-3">
          <MetricBlock title="What it measures">
            <p>
              The heatmap combines two signals — the institution's overall attrition rate and its
              field-specific graduation ratio — into a single composite risk score.
            </p>
            <FormulaBox>
              composite risk = attrition_rate × (1 − graduation_ratio / 100)
            </FormulaBox>
            <p>
              A high attrition rate combined with a low graduation ratio produces a high composite
              risk. Conversely, low attrition and high graduation ratio means low risk.
            </p>
          </MetricBlock>
          <MetricBlock title="Risk tiers">
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Composite risk < 10" value="Low risk (green)" />
              <DataRow label="Composite risk 10 – 18" value="Medium risk (amber)" />
              <DataRow label="Composite risk ≥ 18" value="High risk (red)" />
            </div>
            <p className="text-xs text-gray-500">
              Fields with insufficient data (IDs 11, 12, 13: Food/Hospitality, Mixed Field, Non-Award)
              are excluded from the heatmap.
            </p>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* ── Equity Performance ── */}
      <SectionCard id="equity">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Equity Performance</h3>
        <div className="space-y-3">
          <MetricBlock title="What it measures" subtitle="Section 16 — Equity Performance Data">
            <p>
              The equity report compares how well an institution supports students from different
              backgrounds against the national average. Three measures are tracked for each equity group:
            </p>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Retention" value="% who returned for year 2" />
              <DataRow label="Success" value="% of subjects passed (EFTSL)" />
              <DataRow label="Attainment" value="% with a qualification at census" />
            </div>
          </MetricBlock>
          <MetricBlock title="Equity groups">
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="Low SES" value="Students from low socioeconomic areas (SA1)" />
              <DataRow label="Regional" value="Students from regional areas" />
              <DataRow label="Remote" value="Students from remote areas" />
              <DataRow label="First Nations" value="Aboriginal and Torres Strait Islander students" />
              <DataRow label="Disability" value="Students with disability" />
              <DataRow label="NESB" value="Non-English speaking background" />
            </div>
          </MetricBlock>
          <MetricBlock title="Support summary score">
            <p>
              The app counts how many equity groups the institution outperforms the national average
              in retention, then assigns a label:
            </p>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1">
              <DataRow label="≥ 70% of groups above average" value="Strong" />
              <DataRow label="40 – 70% of groups above average" value="Mixed" />
              <DataRow label="< 40% of groups above average" value="Weak" />
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3 space-y-1 mt-2">
              <DataRow label="Data source" value="Section 16 XLSX files" />
              <DataRow label="Years available" value="2009 – 2024" />
              <DataRow label="Trend period" value="Last 5 years of retention" />
            </div>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* ── Pipeline & Processing ── */}
      <SectionCard id="pipeline">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Data Pipeline</h3>
        <div className="space-y-3">
          <MetricBlock title="How government data becomes this app">
            <div className="space-y-3 text-xs">
              <div className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">1.</span>
                <p>
                  <span className="text-gray-300 font-medium">Download</span> — A scraper retrieves
                  all Higher Education Statistics XLSX files from the Department of Education's website.
                  Files are SHA256-deduplicated and stored with provenance metadata.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">2.</span>
                <p>
                  <span className="text-gray-300 font-medium">Classify</span> — Each file is
                  automatically classified by its section number and data year. The ingestion engine
                  recognises Sections 1, 2, 14, 15, 16, and 17, plus standalone cohort analysis
                  and perturbed pivot table files.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">3.</span>
                <p>
                  <span className="text-gray-300 font-medium">Parse</span> — Each spreadsheet is parsed
                  sheet by sheet. The parser detects header rows, year columns, institution names,
                  and field-of-education breakdowns dynamically (no hardcoded cell positions).
                  Institution names are normalised and resolved through a registry that handles
                  20+ years of name changes and variants.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">4.</span>
                <p>
                  <span className="text-gray-300 font-medium">Load</span> — Parsed data is inserted
                  into a normalised SQLite database with referential integrity. Unique constraints prevent
                  duplicate rows. When newer publications update the same data point, the newer value
                  replaces the older one (INSERT OR REPLACE).
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">5.</span>
                <p>
                  <span className="text-gray-300 font-medium">Serve</span> — The FastAPI backend
                  queries the database at runtime. All analytics (percentiles, trends, rankings) are
                  computed on-the-fly from the raw data.
                </p>
              </div>
            </div>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* ── Known Limitations ── */}
      <SectionCard id="limitations">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Known Limitations</h3>
        <div className="space-y-3">
          <MetricBlock title="What to keep in mind">
            <div className="space-y-2 text-xs">
              <p>
                <span className="text-amber-400 font-medium">Field granularity:</span> Only the 10 broad
                fields of education (ASCED tier 1) are available in government publications. Narrow fields
                (e.g., Nursing within Health, or Computer Science within IT) are not published at the
                institution level, so the app cannot distinguish between sub-disciplines.
              </p>
              <p>
                <span className="text-amber-400 font-medium">Cohort completion breakdowns:</span> The full
                four-outcome breakdown (graduated, still enrolled, dropped out, never returned) is only
                available from the 2024 Section 17 publication. Older cohorts show only the completion
                percentage — the other three outcomes are unknown for those years.
              </p>
              <p>
                <span className="text-amber-400 font-medium">Attrition includes transfers:</span> A student
                who leaves one university to enrol at another is counted as "attrited" at the first institution.
                This can inflate attrition rates for universities whose students commonly transfer (e.g.,
                pathway providers).
              </p>
              <p>
                <span className="text-amber-400 font-medium">Graduation ratio is cross-sectional:</span> The
                field-level graduation ratio divides one year's completions by total enrolled stock.
                This is not a cohort tracking measure — it's a snapshot. It's useful for comparing
                institutions against each other, but the absolute number should not be read as "% who graduate."
              </p>
              <p>
                <span className="text-amber-400 font-medium">Perturbation in pivot tables:</span> Some
                government enrolment/completion files use "perturbed" (slightly randomised) headcounts
                to protect student privacy at small institutions. This means field-level numbers may be
                approximate (±5 students) at smaller providers.
              </p>
              <p>
                <span className="text-amber-400 font-medium">Equity SEIFA versioning:</span> Low SES
                classification uses the SEIFA index, which is revised periodically. Years before 2016
                may use an older SEIFA version, which can affect comparability of Low SES rates over time.
              </p>
              <p>
                <span className="text-amber-400 font-medium">Data lag:</span> The Department of Education
                publishes statistics with a 1-2 year lag. Attrition/retention data for year <em>N</em>
                becomes available in year <em>N+2</em>. The most recent data in the app reflects the
                latest available publication, not the current academic year.
              </p>
            </div>
          </MetricBlock>
        </div>
      </SectionCard>

      {/* Footer note */}
      <div className="text-center pb-4">
        <p className="text-xs text-gray-600 leading-relaxed">
          If you spot an error or have a question about any metric, please get in touch
          via the About page. We take data integrity seriously.
        </p>
      </div>
    </div>
  )
}
