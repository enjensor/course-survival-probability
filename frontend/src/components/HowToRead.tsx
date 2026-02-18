import { useState } from 'react'

interface Props {
  mode: 'report' | 'heatmap' | 'equity'
}

/* ── Collapsible section wrapper ─────────────────────────────────── */
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-gray-800/50 pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span className={`text-xs transition-transform ${open ? 'rotate-90' : ''}`}>&#9654;</span>
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
          {title}
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

/* ── University Report guide ─────────────────────────────────────── */
function ReportGuide() {
  return (
    <>
      <Section title="What the numbers mean" defaultOpen={true}>
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            <strong className="text-gray-400">Completion Probability</strong> — of the students who started together, what
            percentage finished their degree within 4, 6, or 9 years? The gauge shows the longest window available. Higher is better.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Dropout Risk</strong> — the percentage of new students who left and didn't come back
            the following year. <em>Lower is better</em>.
            Risk levels: Low (&lt;15%), Medium (15–25%), High (25–35%), Very High (&gt;35%).
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Came Back for Year 2</strong> — of the students who started, how many returned for
            their second year (or had already finished). <em>Higher is better</em>.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Subject Pass Rate</strong> — of all the subjects students enrolled in, what percentage
            did they actually pass? <em>Higher is better</em>. This tells you how well students are coping with the workload.
          </li>
        </ul>
      </Section>

      <Section title="Reading the charts">
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            <strong className="text-gray-400">Dropout Trend</strong> — shows how the dropout rate has changed year by year.
            &ldquo;Getting better&rdquo; means fewer students are leaving each year. The number in brackets
            shows how much it's changing per year (in percentage points).
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Completion Timeline</strong> — bars show what percentage of students finished by the 4-,
            6-, and 9-year marks. The white marker is the national average. Green (&ge;70%), amber (40–70%), red (&lt;40%).
          </li>
        </ul>
      </Section>

      <Section title="Field of study data">
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            When you select a <strong className="text-gray-400">Field of Study</strong>, you'll see extra data showing
            how many students are enrolled, how many graduated, and the graduation rate for that field at this uni.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Graduates per 100 enrolled</strong> — the number of graduates compared to students
            currently enrolled. This isn't an exact completion rate (since graduates may have started years earlier), but it's
            a useful measure of how productive the program is. Values above 100% can happen in shrinking fields or postgrad-heavy areas.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Ranking tables</strong> show the top 5 and bottom 5 universities by graduation rate
            for the selected field, plus where this uni sits.
          </li>
        </ul>
      </Section>

      <Section title="Where does this data come from?">
        <div className="text-sm text-gray-500 space-y-2" style={{ textAlign: 'justify' }}>
          <p>All numbers come from the Australian Department of Education's official higher education statistics.</p>
          <table className="w-full text-left mt-2 border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-gray-400 font-semibold pb-1.5 pr-4">Metric</th>
                <th className="text-gray-400 font-semibold pb-1.5 pr-4">Source</th>
                <th className="text-gray-400 font-semibold pb-1.5">How it's calculated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              <tr>
                <td className="py-2 pr-4 text-gray-400">Dropout rate</td>
                <td className="py-2 pr-4">Section 15</td>
                <td className="py-2 font-mono text-gray-400 text-xs">
                  (new students who didn't return and didn't finish) / new students &times; 100
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Return rate</td>
                <td className="py-2 pr-4">Section 15</td>
                <td className="py-2 font-mono text-gray-400 text-xs">
                  (students who came back or finished) / new students &times; 100
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Subject pass rate</td>
                <td className="py-2 pr-4">Section 15</td>
                <td className="py-2 font-mono text-gray-400 text-xs">
                  subjects passed / subjects enrolled in &times; 100
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Completion rate</td>
                <td className="py-2 pr-4">Section 17</td>
                <td className="py-2 font-mono text-gray-400 text-xs">
                  students who finished within N years / students who started together &times; 100
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Dropout trend</td>
                <td className="py-2 pr-4">Calculated</td>
                <td className="py-2 font-mono text-gray-400 text-xs">
                  Best-fit line across available years (points per year)
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Risk ranking</td>
                <td className="py-2 pr-4">Calculated</td>
                <td className="py-2 font-mono text-gray-400 text-xs">
                  This uni's dropout rate ranked against all other universities in the same year
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 italic text-gray-600">
            Data follows the Department of Education's official definitions under the Higher Education Support Act 2003.
          </p>
        </div>
      </Section>
    </>
  )
}

/* ── Equity Report guide ─────────────────────────────────────────── */
function EquityGuide() {
  return (
    <>
      <Section title="What the numbers mean" defaultOpen={true}>
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            <strong className="text-gray-400">Came back</strong> — percentage of students from this group who returned for the following year.
            Higher is better.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Passed subjects</strong> — percentage of subjects that students from this group passed.
            Higher is better.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Finished degree</strong> — percentage of students from this group who actually completed their
            qualification. Higher is better. <em>Note:</em> this is often much lower than the other two numbers,
            because finishing a whole degree takes 3–6 years of sustained effort. A uni can be good at keeping students
            year-to-year and helping them pass subjects, but students might still not finish due to part-time study,
            financial pressures, or transferring elsewhere.
          </li>
        </ul>
      </Section>

      <Section title="Reading the bars and gaps">
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            The <strong className="text-gray-400">coloured bar</strong> shows this university's rate.
            The <strong className="text-gray-400">white marker</strong> shows the national average across all universities.
          </li>
          <li className="pl-1">
            <strong className="text-emerald-400">Green</strong> = this uni is above the national average for that group.
            <strong className="text-red-400"> Red</strong> = below the national average.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Gap</strong> — the difference (in percentage points) between this uni and the national
            average. Positive is better.
          </li>
          <li className="pl-1">
            The <strong className="text-gray-400">support score</strong> at the top counts how many student groups are doing
            as well or better than the national average. &ldquo;Strong&rdquo; = 70%+ of groups above average.
          </li>
        </ul>
      </Section>

      <Section title="Why degree completion can be red when the other measures are green">
        <div className="text-sm text-gray-500 space-y-3" style={{ textAlign: 'justify' }}>
          <p>
            It's common for a uni to be above average at keeping students and helping them pass, but below average
            at getting them all the way to graduation. This isn't contradictory — each number measures a different stage:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li className="pl-1"><strong className="text-gray-400">Came back</strong> = &ldquo;Did they return next year?&rdquo; (1-year view)</li>
            <li className="pl-1"><strong className="text-gray-400">Passed subjects</strong> = &ldquo;Did they pass what they enrolled in?&rdquo; (same year)</li>
            <li className="pl-1"><strong className="text-gray-400">Finished degree</strong> = &ldquo;Did they actually get their degree?&rdquo; (takes years)</li>
          </ul>
          <p>
            Possible reasons: part-time study stretching out timelines, moving to a different uni mid-course,
            financial or personal disruptions over longer periods, or changes in course structure.
          </p>
          <p className="italic text-gray-600">
            Source: Department of Education, Section 16 — Equity Performance Data.
          </p>
        </div>
      </Section>

      <Section title="Where does this data come from?">
        <div className="text-sm text-gray-500 space-y-2" style={{ textAlign: 'justify' }}>
          <table className="w-full text-left mt-1 border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-gray-400 font-semibold pb-1.5 pr-4">Metric</th>
                <th className="text-gray-400 font-semibold pb-1.5 pr-4">Source</th>
                <th className="text-gray-400 font-semibold pb-1.5">How it's calculated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              <tr>
                <td className="py-2 pr-4 text-gray-400">Return rate</td>
                <td className="py-2 pr-4">Section 16</td>
                <td className="py-2 font-mono text-gray-400 text-xs">students who came back / students who started &times; 100</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Subject pass rate</td>
                <td className="py-2 pr-4">Section 16</td>
                <td className="py-2 font-mono text-gray-400 text-xs">subjects passed / subjects enrolled in &times; 100</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Degree completion rate</td>
                <td className="py-2 pr-4">Section 16</td>
                <td className="py-2 font-mono text-gray-400 text-xs">students who finished / students who started &times; 100</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">National avg</td>
                <td className="py-2 pr-4">Calculated</td>
                <td className="py-2 font-mono text-gray-400 text-xs">average across all universities for the same group and year</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Gap</td>
                <td className="py-2 pr-4">Calculated</td>
                <td className="py-2 font-mono text-gray-400 text-xs">this uni's rate &minus; national average (in points)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Support score</td>
                <td className="py-2 pr-4">Calculated</td>
                <td className="py-2 font-mono text-gray-400 text-xs">groups above average / total groups with data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </>
  )
}

/* ── Explore by Field guide ──────────────────────────────────────── */
function HeatmapGuide() {
  return (
    <>
      <Section title="How to read this view" defaultOpen={true}>
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            Each row is a university that offers the selected field.
            Rows are colour-coded by risk level:
            <strong className="text-emerald-400"> green</strong> = low risk,
            <strong className="text-amber-400"> amber</strong> = medium,
            <strong className="text-red-400"> red</strong> = high.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Dropout Rate</strong> — the university-wide dropout rate for new domestic students
            (not specific to this field, because field-level dropout data isn't published).
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Grad Rate</strong> — the number of graduates in this field compared to the number of students
            enrolled. A quick measure of how many students are getting through.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Risk Score</strong> — combines dropout rate and graduation performance into one number.
            Lower is safer.
          </li>
        </ul>
      </Section>

      <Section title="How is the risk score calculated?">
        <div className="text-sm text-gray-500 space-y-2" style={{ textAlign: 'justify' }}>
          <table className="w-full text-left mt-1 border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-gray-400 font-semibold pb-1.5 pr-4">Metric</th>
                <th className="text-gray-400 font-semibold pb-1.5">How it's calculated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              <tr>
                <td className="py-2 pr-4 text-gray-400">Combined risk score</td>
                <td className="py-2 font-mono text-gray-400 text-xs">dropout rate &times; (1 &minus; grad rate / 100)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Grad rate</td>
                <td className="py-2 font-mono text-gray-400 text-xs">graduates in this field / students enrolled &times; 100</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-400">Risk level</td>
                <td className="py-2 font-mono text-gray-400 text-xs">Low: &lt;10 · Medium: 10–18 · High: &gt;18</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 italic text-gray-600">
            The risk score penalises universities that have both a high dropout rate and few graduates. A uni with
            high dropout but lots of graduates will score lower (safer) than one with similar dropout but few graduates.
          </p>
        </div>
      </Section>
    </>
  )
}

/* ── Main export ─────────────────────────────────────────────────── */
export default function HowToRead({ mode }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-900/80 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          How to read this {mode === 'heatmap' ? 'view' : 'report'}
        </span>
        <span className={`text-sm text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
          &#9660;
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-1">
          {mode === 'report' && <ReportGuide />}
          {mode === 'equity' && <EquityGuide />}
          {mode === 'heatmap' && <HeatmapGuide />}
        </div>
      )}
    </div>
  )
}
