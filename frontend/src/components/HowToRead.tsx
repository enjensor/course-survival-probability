import { useState } from 'react'

interface Props {
  mode: 'report' | 'heatmap' | 'equity' | 'courses'
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
            <strong className="text-gray-400">Ranking tables</strong> show the top 5 and bottom 5 institutions by graduation rate
            for the selected field, plus where this institution sits.
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
                  This institution's dropout rate ranked against all others in the same year
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 italic text-gray-500">
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
            The <strong className="text-gray-400">coloured bar</strong> shows this institution's rate.
            The <strong className="text-gray-400">white marker</strong> shows the national average across all institutions.
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
          <p className="italic text-gray-500">
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
                <td className="py-2 font-mono text-gray-400 text-xs">average across all institutions for the same group and year</td>
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
            Each row is an institution that offers the selected field.
            Rows are colour-coded by risk level:
            <strong className="text-emerald-400"> green</strong> = low risk,
            <strong className="text-amber-400"> amber</strong> = medium,
            <strong className="text-red-400"> red</strong> = high.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Dropout Rate</strong> — the institution-wide dropout rate for new domestic students
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
          <p className="mt-3 italic text-gray-500">
            The risk score penalises institutions that have both a high dropout rate and few graduates. An institution with
            high dropout but lots of graduates will score lower (safer) than one with similar dropout but few graduates.
          </p>
        </div>
      </Section>
    </>
  )
}

/* ── Courses & ATAR guide ────────────────────────────────────────── */
function CoursesGuide() {
  return (
    <>
      <Section title="What the numbers mean" defaultOpen={true}>
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            <strong className="text-gray-400">ATAR (Lowest / Median / Highest)</strong> — the Australian Tertiary Admission Rank
            of students admitted in the most recent intake. The <em>lowest</em> is the minimum ATAR that received an offer.
            Colour-coded: <strong className="text-emerald-400">green</strong> (&lt;60),{' '}
            <strong className="text-amber-400">amber</strong> (60–80),{' '}
            <strong className="text-red-400">red</strong> (80–95),{' '}
            <strong className="text-indigo-400">indigo</strong> (95+).
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Selection Rank</strong> — similar to ATAR but may include adjustment factors
            (e.g. bonus points for regional students, subject alignment, or equity schemes). Can be higher than the raw ATAR.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Fee type</strong> — <strong className="text-gray-400">CSP</strong> (Commonwealth Supported Place — government-subsidised)
            or <strong className="text-gray-400">DFEE</strong> (Domestic Full Fee — student pays full cost).
          </li>
        </ul>
      </Section>

      <Section title="Student profile bar">
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            The horizontal bar shows the percentage of students admitted through each pathway:
            <strong className="text-gray-400"> ATAR-based</strong> (school leavers with an ATAR),
            <strong className="text-gray-400"> Higher Ed</strong> (prior university study),
            <strong className="text-gray-400"> VET</strong> (vocational education background),
            <strong className="text-gray-400"> Work/Life</strong> (professional or life experience),
            <strong className="text-gray-400"> International</strong>.
          </li>
          <li className="pl-1">
            A high ATAR-based percentage means the course is primarily accessed by school leavers.
            A high Higher Ed or Work/Life share suggests the course attracts mature or career-change students.
          </li>
        </ul>
      </Section>

      <Section title="Filtering and sorting">
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            Use the <strong className="text-gray-400">text search</strong> to find courses by title.
            The <strong className="text-gray-400">level</strong> and <strong className="text-gray-400">fee type</strong> filters
            narrow the list to specific course types.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Sort by ATAR</strong> to see the most or least competitive courses first.
            Courses without an ATAR (typically postgraduate) will appear at the end.
          </li>
        </ul>
      </Section>

      <Section title="What's inside each course card">
        <ul className="text-sm text-gray-500 space-y-3 list-disc pl-5" style={{ textAlign: 'justify' }}>
          <li className="pl-1">
            <strong className="text-gray-400">Tap any course card to expand it.</strong> Each card reveals
            detailed entry data, campus breakdowns, and insights you won't see in the collapsed view.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Campus ATARs</strong> — for multi-campus courses, see how the
            entry score varies by campus location.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">ATAR trend</strong> — where historical data exists, see whether
            the entry score is rising (getting harder) or dropping (becoming more accessible) over time.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">At other institutions</strong> — compare this course's entry
            score to similar courses at other universities, matched by discipline.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Bonus points potential</strong> — if the selection rank is
            higher than the raw ATAR, adjustment factors (regional, equity, subject bonuses) can boost your
            chances.
          </li>
          <li className="pl-1">
            <strong className="text-gray-400">Admission profile</strong>, <strong className="text-gray-400">pathway diversity</strong>,{' '}
            <strong className="text-gray-400">professional recognition</strong>, and{' '}
            <strong className="text-gray-400">assumed knowledge</strong> are also shown when available.
          </li>
        </ul>
      </Section>

      <Section title="Where does this data come from?">
        <div className="text-sm text-gray-500 space-y-2" style={{ textAlign: 'justify' }}>
          <p>
            Course listings, ATAR profiles, and student demographics are sourced from the
            Universities Admissions Centre (UAC), which manages admissions for NSW and ACT institutions.
          </p>
          <p>
            Institutions in other states use different admission centres (VTAC for Victoria, QTAC for Queensland, etc.)
            and are not yet included. ATAR data reflects the most recent admissions year available.
          </p>
          <p className="italic text-gray-500">
            Postgraduate courses do not have ATAR data, as admission is based on prior qualifications.
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
          How to read this {mode === 'heatmap' ? 'view' : mode === 'courses' ? 'view' : 'report'}
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
          {mode === 'courses' && <CoursesGuide />}
        </div>
      )}
    </div>
  )
}
