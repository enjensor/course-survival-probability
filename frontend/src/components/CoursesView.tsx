import { useState, useMemo, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import type { CoursesReportData, UacCourse, SectorAdmissionProfile, FieldComparisonEntry, AtarTrendPoint } from '../types'

interface Props {
  data: CoursesReportData
  sectorProfile?: SectorAdmissionProfile | null
}

/* ── Jargon definitions ────────────────────────────────────────────── */

const DEFINITIONS: Record<string, string> = {
  // Fee types
  CSP: 'Commonwealth Supported Place — the government pays part of your tuition fee and you pay the rest (called a "student contribution"). Most domestic undergraduate students are CSP.',
  DFEE: 'Domestic Full Fee — you pay the entire tuition cost yourself, with no government subsidy. Often applies to postgraduate or specialty courses.',
  INT: 'International — fee category for students who are not Australian or New Zealand citizens or permanent residents.',

  // Admission pathways
  'ATAR-based': 'Students admitted based on their ATAR (Australian Tertiary Admission Rank) — a number between 0 and 99.95 calculated from your Year 12 results. A higher ATAR means you scored better relative to other students.',
  'Higher Ed': 'Students admitted based on previous university study — for example, someone transferring from another degree or who already holds a qualification.',
  VET: 'Vocational Education & Training — students admitted based on a TAFE or trade qualification (such as a Certificate IV or Diploma).',
  'Work/Life': 'Students admitted based on work experience, professional skills, or life experience rather than school or study results. Sometimes called "mature-age" or "non-traditional" entry.',
  International: 'Students who are not Australian/NZ citizens or permanent residents, typically admitted via international qualifications.',

  // ATAR & Selection Rank
  ATAR: 'Australian Tertiary Admission Rank — a number between 0 and 99.95 that indicates your position relative to other students in your age group. An ATAR of 80 means you performed better than 80% of students.',
  'Selection Rank': 'Your ATAR plus any bonus points the university gives for things like subject choices, regional location, or equity factors. This is the number actually used to decide if you get an offer.',
  'Lowest ATAR': 'The lowest ATAR among students admitted via the ATAR pathway in the most recent round. Students admitted through other pathways (Higher Ed, VET, work experience) are not included in this figure.',

  // Competitiveness
  Competitiveness: 'How competitive entry is, based on the lowest ATAR admitted: Elite (95+), Competitive (80–94), Moderate (60–79), or Accessible (below 60).',
  Elite: 'ATAR 95 or above required — among the most competitive courses to gain entry.',
  Competitive: 'ATAR between 80 and 94 — strong results needed for an offer.',
  Moderate: 'ATAR between 60 and 79 — solid results give a good chance of entry.',
  Accessible: 'ATAR below 60 — open to a wide range of students.',

  // Profile bar
  'How Students Were Admitted': 'Shows the mix of entry pathways for students who enrolled in this course. For example, if 60% is ATAR-based, most students got in via their Year 12 results.',

  // Additional terms
  'Bonus Points': 'The difference between the Selection Rank and ATAR cutoffs. A larger gap means adjustment factors (for regional location, equity, or subject choices) make a bigger difference at this university.',
  'Professional Recognition': 'Industry accreditation — means graduates can register or practise in a profession (e.g., Engineers Australia, Australian Psychological Society, CPA).',
  'Practical Experience': 'Work-integrated learning built into the degree — such as industry placements, internships, clinical rotations, or fieldwork.',
  'Pathway Diversity': 'How many different ways students get into this course. "Traditional" means nearly all via ATAR; "Diverse" means a healthy mix of ATAR, prior study, VET, and life experience — more entry options for you.',
  'ATAR Trend': 'How the ATAR cutoff has changed over time. A rising trend means the course is getting harder to enter; a falling trend means it may be becoming more accessible.',
  'Other/Unclassified': 'Students admitted through pathways not separately reported by UAC — such as special admission schemes, portfolio entry, audition-based entry, or categories suppressed for privacy (<5 students).',
}

/* ── Tooltip component ─────────────────────────────────────────────── */

function Tip({ term, children }: { term: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; align: 'center' | 'left' | 'right' }>({ top: 0, left: 0, align: 'center' })
  const text = DEFINITIONS[term]
  if (!text) return <>{children ?? term}</>

  const updatePos = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const tipW = 256 // w-64
    const cx = r.left + r.width / 2
    let align: 'center' | 'left' | 'right' = 'center'
    let left = cx - tipW / 2
    if (left < 8) { align = 'left'; left = r.left }
    else if (left + tipW > window.innerWidth - 8) { align = 'right'; left = r.right - tipW }
    setPos({ top: r.top - 8, left, align })
  }

  return (
    <span className="relative inline-flex items-center">
      {children ?? term}
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); updatePos() }}
        onMouseEnter={() => { setOpen(true); updatePos() }}
        onMouseLeave={() => setOpen(false)}
        className="ml-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-colors cursor-help flex-shrink-0"
        aria-label={`What is ${term}?`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>
      {open && ReactDOM.createPortal(
        <span
          className="fixed w-64 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-300 leading-relaxed shadow-xl z-[9999] pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
        >
          <span className="font-semibold text-gray-200">{term}:</span> {text}
          <span
            className="absolute top-full -mt-px border-4 border-transparent border-t-gray-700"
            style={pos.align === 'right' ? { right: 12 } : pos.align === 'left' ? { left: 12 } : { left: '50%', transform: 'translateX(-50%)' }}
          />
        </span>,
        document.body
      )}
    </span>
  )
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const MODE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  on_campus: 'On campus',
  online: 'Online',
  external: 'External',
  multi_modal: 'Multi-modal',
  remote: 'Remote',
  block: 'Block mode',
}

function formatMode(raw: string): string {
  return raw
    .split(/[,;]\s*/)
    .map((m) => MODE_LABELS[m.trim()] || m.trim().replace(/_/g, ' '))
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .join(', ')
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
  '1': 'January', '2': 'February', '3': 'March', '4': 'April', '5': 'May', '6': 'June',
  '7': 'July', '8': 'August', '9': 'September',
}

function formatStartMonths(raw: string): string {
  return raw
    .split(/[,;]\s*/)
    .map((m) => MONTH_NAMES[m.trim()] || m.trim())
    .filter(Boolean)
    .join(', ')
}

/** Strip HTML entities & tags from UAC text fields */
function cleanText(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Compute a pathway diversity index from admission percentages.
 *  Returns { score: 0-100, label, color, pathwayCount }.
 *  Score is based on Shannon entropy normalised to 0-100. */
function pathwayDiversity(course: UacCourse): { score: number; label: string; color: string; pathwayCount: number } | null {
  const pcts = [
    parsePct(course.pct_atar_based),
    parsePct(course.pct_higher_ed),
    parsePct(course.pct_vet),
    parsePct(course.pct_work_life),
    parsePct(course.pct_international),
  ]
  const valid = pcts.filter((p): p is number => p !== null && p > 0)
  if (valid.length === 0) return null

  const total = valid.reduce((a, b) => a + b, 0)
  if (total <= 0) return null

  // Shannon entropy
  let H = 0
  for (const p of valid) {
    const frac = p / total
    if (frac > 0) H -= frac * Math.log2(frac)
  }
  const maxH = Math.log2(valid.length)
  const score = maxH > 0 ? Math.round((H / maxH) * 100) : 0
  const pathwayCount = valid.length

  if (score >= 65) return { score, label: 'Diverse entry', color: 'text-emerald-400', pathwayCount }
  if (score >= 40) return { score, label: 'Mixed entry', color: 'text-amber-400', pathwayCount }
  return { score, label: 'Traditional entry', color: 'text-gray-400', pathwayCount }
}

function atarColor(num: number | null): string {
  if (num === null) return 'text-gray-500'
  if (num >= 95) return 'text-indigo-400'
  if (num >= 80) return 'text-red-400'
  if (num >= 60) return 'text-amber-400'
  return 'text-emerald-400'
}

function atarLabel(num: number | null): string {
  if (num === null) return 'N/A'
  if (num >= 95) return 'Elite'
  if (num >= 80) return 'Competitive'
  if (num >= 60) return 'Moderate'
  return 'Accessible'
}

function feeColor(type: string | null): string {
  switch (type) {
    case 'CSP': return 'bg-emerald-900/50 text-emerald-300 border-emerald-800'
    case 'DFEE': return 'bg-amber-900/50 text-amber-300 border-amber-800'
    case 'INT': return 'bg-blue-900/50 text-blue-300 border-blue-800'
    default: return 'bg-gray-800 text-gray-400 border-gray-700'
  }
}

function parsePct(val: string | null): number | null {
  if (!val || val.includes('<')) return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

/* ── Admission Profile Chart (institution or sector) ─────────────── */

const PROFILE_SEGMENTS = [
  { key: 'atar_based', label: 'ATAR-based', color: 'bg-indigo-500' },
  { key: 'higher_ed', label: 'Higher Ed', color: 'bg-blue-500' },
  { key: 'vet', label: 'VET', color: 'bg-teal-500' },
  { key: 'work_life', label: 'Work/Life', color: 'bg-amber-500' },
  { key: 'international', label: 'International', color: 'bg-gray-500' },
] as const

interface ProfileData {
  pct_atar_based: number
  pct_higher_ed: number
  pct_vet: number
  pct_work_life: number
  pct_international: number
  total_students: number
  profile_year: number | null
}

function AdmissionProfileChart({
  label,
  profile,
}: {
  label: string
  profile: ProfileData
}) {
  const knownPct = profile.pct_atar_based + profile.pct_higher_ed + profile.pct_vet + profile.pct_work_life + profile.pct_international
  const otherPct = Math.max(0, 100 - knownPct)
  const segments = [
    { ...PROFILE_SEGMENTS[0], pct: profile.pct_atar_based },
    { ...PROFILE_SEGMENTS[1], pct: profile.pct_higher_ed },
    { ...PROFILE_SEGMENTS[2], pct: profile.pct_vet },
    { ...PROFILE_SEGMENTS[3], pct: profile.pct_work_life },
    { ...PROFILE_SEGMENTS[4], pct: profile.pct_international },
    ...(otherPct > 0.5 ? [{ key: 'other' as const, label: 'Other/Unclassified', color: 'bg-gray-600', pct: otherPct }] : []),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-xs text-gray-500">
          {profile.total_students.toLocaleString()} students
          {profile.profile_year ? ` (${profile.profile_year})` : ''}
        </p>
      </div>
      <div className="flex h-7 rounded-full overflow-hidden bg-gray-800">
        {segments.map((s, i) => {
          if (s.pct <= 0) return null
          // Find if there's a next visible segment for the dividing line
          const hasNext = segments.slice(i + 1).some((ns) => ns.pct > 0)
          return (
            <div
              key={s.key}
              className={`${s.color} relative group flex items-center justify-center`}
              style={{
                width: `${s.pct}%`,
                borderRight: hasNext ? '2px solid rgb(17 24 39)' : 'none',
              }}
              title={`${s.label}: ${s.pct.toFixed(1)}%`}
            >
              {s.pct >= 8 && (
                <span className="text-[10px] font-medium text-white/90 truncate px-1">
                  {s.pct.toFixed(0)}%
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <Tip term={s.label}>{s.label}</Tip>: {s.pct.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Student Profile Bar ──────────────────────────────────────────── */

function StudentProfileBar({ course }: { course: UacCourse }) {
  const segments: { label: string; pct: number | null; raw: string | null; color: string }[] = [
    { label: 'ATAR-based', pct: parsePct(course.pct_atar_based), raw: course.pct_atar_based, color: 'bg-indigo-500' },
    { label: 'Higher Ed', pct: parsePct(course.pct_higher_ed), raw: course.pct_higher_ed, color: 'bg-blue-500' },
    { label: 'VET', pct: parsePct(course.pct_vet), raw: course.pct_vet, color: 'bg-teal-500' },
    { label: 'Work/Life', pct: parsePct(course.pct_work_life), raw: course.pct_work_life, color: 'bg-amber-500' },
    { label: 'International', pct: parsePct(course.pct_international), raw: course.pct_international, color: 'bg-gray-500' },
  ]

  const hasData = segments.some(s => s.pct !== null || (s.raw && s.raw.includes('<')))
  if (!hasData) return null

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        <Tip term="How Students Were Admitted">How students were admitted</Tip>
        {course.student_profile_year ? ` (${course.student_profile_year})` : ''}
        {course.total_students ? ` \u00b7 ${course.total_students} students` : ''}
      </p>
      <div className="flex h-5 rounded-full overflow-hidden bg-gray-800">
        {segments.map((s, i) => {
          if (!s.pct || s.pct <= 0) return null
          const hasNext = segments.slice(i + 1).some((ns) => ns.pct && ns.pct > 0)
          return (
            <div
              key={s.label}
              className={`${s.color} relative group`}
              style={{
                width: `${s.pct}%`,
                borderRight: hasNext ? '2px solid rgb(17 24 39)' : 'none',
              }}
              title={`${s.label}: ${s.pct.toFixed(1)}%`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {segments.map((s) => {
          if (!s.raw && s.pct === null) return null
          const display = s.pct !== null ? `${s.pct.toFixed(1)}%` : s.raw
          return (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              <Tip term={s.label}>{s.label}</Tip>: {display}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/* ── Course Card ──────────────────────────────────────────────────── */

function CourseCard({
  course,
  expanded,
  onToggle,
  allCourses,
  fieldComparison,
  atarTrend,
  institutionName,
}: {
  course: UacCourse
  expanded: boolean
  onToggle: () => void
  allCourses: UacCourse[]
  fieldComparison?: FieldComparisonEntry[]
  atarTrend?: AtarTrendPoint[]
  institutionName: string
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3 hover:bg-gray-800/50 transition-colors group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-200 leading-snug">
              {course.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-500">{course.course_code}</span>
              {(course.campus_count ?? 1) > 1 ? (
                <span className="text-xs text-gray-500">&middot; {course.campus_count} campuses</span>
              ) : course.campus_name ? (
                <span className="text-xs text-gray-500">&middot; {course.campus_name}</span>
              ) : null}
              {course.course_level_label && (
                <span className="text-xs text-gray-500">&middot; {course.course_level_label}</span>
              )}
              {course.duration && (
                <span className="text-xs text-gray-500">&middot; {course.duration}</span>
              )}
              {course.mode_of_attendance && (
                <span className="text-xs text-gray-500">&middot; {formatMode(course.mode_of_attendance)}</span>
              )}
              {course.fee_type && (
                <Tip term={course.fee_type}>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${feeColor(course.fee_type)}`}>
                    {course.fee_type}
                  </span>
                </Tip>
              )}
              {course.field_of_study_label && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">
                  {course.field_of_study_label}
                </span>
              )}
              {course.practical_experience && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-800/50" title="This course includes work placements, internships, or industry projects">
                  &#9881; Placement
                </span>
              )}
            </div>
            {/* Collapsed feature hints — show what's inside */}
            {!expanded && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {course.total_students != null && Number(course.total_students) > 0 && (
                  <span className="text-[10px] text-gray-500">{Number(course.total_students).toLocaleString()} students</span>
                )}
                {(course.campuses?.length ?? 0) > 1 && (
                  <span className="text-[10px] text-gray-600">&middot; campus ATARs</span>
                )}
                {atarTrend && atarTrend.length >= 2 && (
                  <span className="text-[10px] text-gray-600">&middot; ATAR trend</span>
                )}
                {fieldComparison && fieldComparison.length > 0 && (
                  <span className="text-[10px] text-gray-600">&middot; compare institutions</span>
                )}
                {course.professional_recognition && (
                  <span className="text-[10px] text-gray-600">&middot; accredited</span>
                )}
              </div>
            )}
          </div>

          {/* ATAR badge + expand indicator */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              {course.atar_lowest_num !== null ? (
                <>
                  <p className={`text-lg font-bold tabular-nums ${atarColor(course.atar_lowest_num)}`}>
                    {course.atar_lowest_num.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500"><Tip term="Lowest ATAR">Lowest ATAR</Tip></p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">{course.atar_lowest || 'N/A'}</p>
                  <p className="text-xs text-gray-500"><Tip term="ATAR">ATAR</Tip></p>
                </>
              )}
            </div>
            <svg
              className={`w-4 h-4 text-gray-500 group-hover:text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-gray-800 px-4 py-4 space-y-4">
          {/* ATAR detail row */}
          {(course.atar_lowest || course.selection_rank_lowest) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {course.atar_lowest && (
                <div>
                  <p className="text-xs text-gray-500"><Tip term="ATAR">ATAR Range</Tip></p>
                  <p className="text-sm text-gray-300 tabular-nums">
                    <span className={atarColor(course.atar_lowest_num)}>{course.atar_lowest}</span>
                    {' \u2013 '}
                    {course.atar_highest || '...'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Median: {course.atar_median || 'N/A'}
                  </p>
                </div>
              )}
              {course.selection_rank_lowest && (
                <div>
                  <p className="text-xs text-gray-500"><Tip term="Selection Rank">Selection Rank</Tip></p>
                  <p className="text-sm text-gray-300 tabular-nums">
                    {course.selection_rank_lowest}
                    {course.selection_rank_highest ? ` \u2013 ${course.selection_rank_highest}` : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {course.selection_rank_median ? `Median: ${course.selection_rank_median} · ` : ''}Includes adjustment factors
                  </p>
                </div>
              )}
              {course.atar_lowest_num !== null && (
                <div>
                  <p className="text-xs text-gray-500"><Tip term="Competitiveness">Competitiveness</Tip></p>
                  <p className={`text-sm font-medium ${atarColor(course.atar_lowest_num)}`}>
                    {atarLabel(course.atar_lowest_num)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Campus detail — multi-campus grouped courses */}
          {course.campuses && course.campuses.length > 1 && (() => {
            const validAtars = course.campuses.filter(c => c.atar_lowest_num !== null)
            const allSameAtar = validAtars.length > 0 && validAtars.every(c => c.atar_lowest_num === validAtars[0].atar_lowest_num)
            return (
              <div className="rounded-lg bg-gray-800/40 border border-gray-700/40 px-3 py-2.5">
                <p className="text-xs text-gray-500 mb-2">
                  {allSameAtar ? 'Available campuses' : 'ATAR by campus'}
                </p>
                {allSameAtar ? (
                  <div className="flex flex-wrap gap-1.5">
                    {course.campuses.map((cv) => (
                      <span key={cv.course_code} className="text-xs px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">
                        {cv.campus_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {course.campuses.map((cv) => (
                      <div key={cv.course_code} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-300">{cv.campus_name}</span>
                        <span className={`text-xs font-medium tabular-nums ${cv.atar_lowest_num !== null ? atarColor(cv.atar_lowest_num) : 'text-gray-500'}`}>
                          {cv.atar_lowest_num !== null ? cv.atar_lowest_num.toFixed(2) : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ATAR gap insight */}
          {(() => {
            const srLow = course.selection_rank_lowest ? parseFloat(course.selection_rank_lowest) : null
            const atarLow = course.atar_lowest_num
            if (srLow && atarLow && !isNaN(srLow) && srLow > atarLow) {
              const gap = srLow - atarLow
              return (
                <div className="flex items-start gap-2 rounded-lg bg-indigo-950/30 border border-indigo-900/40 px-3 py-2">
                  <span className="text-indigo-400 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  </span>
                  <p className="text-xs text-indigo-300/80 leading-relaxed">
                    <Tip term="Bonus Points"><span className="font-medium text-indigo-300">Bonus points potential:</span></Tip>
                    {' '}The selection rank is <span className="font-semibold text-indigo-200">{gap.toFixed(1)} points</span> above the ATAR cutoff, meaning adjustment factors (regional, equity, subject bonuses) can make a real difference for this course.
                  </p>
                </div>
              )
            }
            return null
          })()}

          {/* ATAR trend insight */}
          {(() => {
            if (!atarTrend || atarTrend.length < 2) return null
            const sorted = [...atarTrend].sort((a, b) => a.year - b.year)
            const oldest = sorted[0]
            const newest = sorted[sorted.length - 1]
            const diff = newest.atar - oldest.atar
            if (Math.abs(diff) < 0.01) return null
            const rising = diff > 0
            return (
              <div className="flex items-start gap-2 rounded-lg bg-gray-800/50 border border-gray-700/50 px-3 py-2">
                <span className={`mt-0.5 text-sm ${rising ? 'text-red-400' : 'text-emerald-400'}`}>
                  {rising ? '↑' : '↓'}
                </span>
                <p className="text-xs text-gray-400 leading-relaxed">
                  <Tip term="ATAR Trend"><span className="font-medium text-gray-300">ATAR trend:</span></Tip>
                  {' '}Cutoff {rising ? 'rose' : 'dropped'}{' '}
                  <span className={`font-semibold ${rising ? 'text-red-300' : 'text-emerald-300'}`}>
                    {Math.abs(diff).toFixed(1)} pts
                  </span>
                  {' '}from {oldest.year} ({oldest.atar.toFixed(1)}) to {newest.year} ({newest.atar.toFixed(1)})
                  {' — '}{rising ? 'getting harder to enter' : 'becoming more accessible'}.
                </p>
              </div>
            )
          })()}

          {/* Cross-institution ATAR comparison */}
          {(() => {
            if (!fieldComparison || fieldComparison.length === 0 || !course.field_of_study_label) return null
            // Build a combined list: this institution + others, sorted by ATAR
            const thisEntry = {
              institution: institutionName,
              atar: course.atar_lowest_num ?? 0,
              title: course.title,
              course_code: course.course_code,
              isThis: true as const,
            }
            const others = fieldComparison.slice(0, 5).map((e) => ({ ...e, isThis: false as const }))
            const all = [thisEntry, ...others].sort((a, b) => a.atar - b.atar)
            return (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {course.discipline || course.field_of_study_label} at other institutions
                </p>
                <div className="space-y-1">
                  {all.map((e, i) => (
                    <div
                      key={`${e.course_code}-${i}`}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-xs ${
                        e.isThis
                          ? 'bg-indigo-950/30 border border-indigo-900/40'
                          : 'bg-gray-800/30 border border-gray-700/30'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className={`font-medium ${e.isThis ? 'text-indigo-300' : 'text-gray-400'}`}>
                          {e.institution}
                        </span>
                        {e.isThis && <span className="ml-1.5 text-[10px] text-indigo-400/70">(this)</span>}
                      </div>
                      <span className={`tabular-nums font-semibold flex-shrink-0 ${atarColor(e.atar)}`}>
                        {e.atar.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Quick info pills — start dates, study mode */}
          {(course.start_months || course.mode_of_attendance) && (
            <div className="flex flex-wrap gap-2">
              {course.start_months && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Starts: {formatStartMonths(course.start_months!)}
                </span>
              )}
              {course.mode_of_attendance && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  {formatMode(course.mode_of_attendance)}
                </span>
              )}
            </div>
          )}

          {/* Student profile */}
          <StudentProfileBar course={course} />

          {/* Pathway diversity insight */}
          {(() => {
            const pd = pathwayDiversity(course)
            if (!pd) return null
            return (
              <div className="flex items-center gap-2">
                <Tip term="Pathway Diversity">
                  <span className={`text-xs font-medium ${pd.color}`}>{pd.label}</span>
                </Tip>
                <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pd.score >= 65 ? 'bg-emerald-500' : pd.score >= 40 ? 'bg-amber-500' : 'bg-gray-600'}`}
                    style={{ width: `${pd.score}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 tabular-nums">{pd.pathwayCount} pathways</span>
              </div>
            )
          })()}

          {/* Professional recognition / accreditation */}
          {course.professional_recognition && (
            <div>
              <p className="text-xs text-gray-500 mb-1"><Tip term="Professional Recognition">Professional Recognition</Tip></p>
              <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{cleanText(course.professional_recognition!)}</p>
            </div>
          )}

          {/* Practical experience / placements */}
          {course.practical_experience && (
            <div>
              <p className="text-xs text-gray-500 mb-1"><Tip term="Practical Experience">Practical Experience</Tip></p>
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{cleanText(course.practical_experience!)}</p>
            </div>
          )}

          {/* Assumed knowledge */}
          {course.assumed_knowledge && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Assumed Knowledge</p>
              <p className="text-sm text-gray-300 leading-relaxed">{cleanText(course.assumed_knowledge!)}</p>
            </div>
          )}

          {/* Admission criteria */}
          {course.admission_criteria && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Admission Criteria</p>
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">{cleanText(course.admission_criteria!)}</p>
            </div>
          )}

          {/* About */}
          {course.about && (
            <div>
              <p className="text-xs text-gray-500 mb-1">About</p>
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">{cleanText(course.about!)}</p>
            </div>
          )}

          {/* Career opportunities */}
          {course.career_opportunities && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Career Opportunities</p>
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{cleanText(course.career_opportunities!)}</p>
            </div>
          )}

          {/* Also consider — similar courses in same field */}
          {(() => {
            if (!course.field_of_study || course.field_of_study === 'Mixed Field Programs') return null
            const similar = allCourses
              .filter((c) =>
                c.title !== course.title &&
                c.field_of_study === course.field_of_study &&
                c.atar_lowest_num !== null
              )
              .sort((a, b) => {
                // Prefer courses with similar ATAR
                const ref = course.atar_lowest_num ?? 75
                const diffA = Math.abs((a.atar_lowest_num ?? 75) - ref)
                const diffB = Math.abs((b.atar_lowest_num ?? 75) - ref)
                return diffA - diffB
              })
              .slice(0, 3)
            if (similar.length === 0) return null
            return (
              <div>
                <p className="text-xs text-gray-500 mb-2">Also consider in {course.field_of_study_label}</p>
                <div className="space-y-1.5">
                  {similar.map((s) => (
                    <div
                      key={s.course_code}
                      className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/50 border border-gray-700/50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-300 truncate">{s.title}</p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {s.course_code}
                          {(s.campus_count ?? 1) > 1
                            ? ` · ${s.campus_count} campuses`
                            : s.campus_name ? ` · ${s.campus_name}` : ''}
                          {s.duration ? ` · ${s.duration}` : ''}
                        </p>
                      </div>
                      {s.atar_lowest_num !== null && (
                        <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${atarColor(s.atar_lowest_num)}`}>
                          {s.atar_lowest_num.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Footer: levels + link */}
          <div className="flex items-center justify-between pt-1">
            {course.levels.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Available to:</span>
                {course.levels.map((l) => (
                  <span
                    key={l}
                    className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700"
                  >
                    {l}
                  </span>
                ))}
              </div>
            )}
            {course.further_info_url && /^https?:\/\//i.test(course.further_info_url) && (
              <a
                href={course.further_info_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                More info
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Component ───────────────────────────────────────────────── */

type SortKey = 'title' | 'atar-asc' | 'atar-desc'

export default function CoursesView({ data, sectorProfile }: Props) {
  const PAGE_SIZE = 25
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('TBP')
  const [fieldFilter, setFieldFilter] = useState<string>('all')
  const [feeFilter, setFeeFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('atar-asc')
  const [hideNoAtar, setHideNoAtar] = useState(true)
  const [atarMin, setAtarMin] = useState(50)
  const [atarMax, setAtarMax] = useState(99)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const { courses, summary } = data

  // Derive available level options from data
  const levelOptions = useMemo(() => {
    const levels = new Map<string, string>()
    for (const c of courses) {
      if (c.course_level && c.course_level_label) {
        levels.set(c.course_level, c.course_level_label)
      }
    }
    return Array.from(levels.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [courses])

  // Derive available field of study options
  const fieldOptions = useMemo(() => {
    const fields = new Map<string, string>()
    for (const c of courses) {
      if (c.field_of_study && c.field_of_study_label) {
        fields.set(c.field_of_study, c.field_of_study_label)
      }
    }
    return Array.from(fields.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [courses])

  // Compute overall ATAR bounds for the slider
  const atarBounds = useMemo(() => {
    let lo = 100, hi = 0
    for (const c of courses) {
      if (c.atar_lowest_num !== null) {
        if (c.atar_lowest_num < lo) lo = c.atar_lowest_num
        if (c.atar_lowest_num > hi) hi = c.atar_lowest_num
      }
    }
    return { lo: Math.floor(lo), hi: Math.ceil(hi) }
  }, [courses])

  // Aggregate institution-level admission profile (weighted average).
  // UAC shares the same student profile across multiple campus/variant
  // listings (e.g. Nursing at 4 campuses all report 1,315 students).
  // Deduplicate by the full profile signature so each cohort is
  // counted only once.
  const institutionProfile = useMemo<ProfileData | null>(() => {
    let totalStudents = 0
    let wAtar = 0, wHe = 0, wVet = 0, wWl = 0, wInt = 0
    let year: number | null = null
    const seen = new Set<string>()

    for (const c of courses) {
      const n = c.total_students ? parseInt(String(c.total_students).replace(/,/g, ''), 10) : 0
      if (!n || n <= 0) continue
      const pAtar = parsePct(c.pct_atar_based)
      if (pAtar === null) continue

      // Build a dedup key from the student profile fields.
      // Courses sharing an identical profile are the same cohort
      // listed under different campus codes or course variants.
      const key = `${n}|${c.pct_atar_based}|${c.pct_higher_ed}|${c.pct_vet}|${c.pct_work_life}|${c.pct_international}`
      if (seen.has(key)) continue
      seen.add(key)

      totalStudents += n
      wAtar += (pAtar || 0) * n
      wHe += (parsePct(c.pct_higher_ed) || 0) * n
      wVet += (parsePct(c.pct_vet) || 0) * n
      wWl += (parsePct(c.pct_work_life) || 0) * n
      wInt += (parsePct(c.pct_international) || 0) * n
      if (!year && c.student_profile_year) year = c.student_profile_year
    }

    if (totalStudents === 0) return null

    return {
      pct_atar_based: wAtar / totalStudents,
      pct_higher_ed: wHe / totalStudents,
      pct_vet: wVet / totalStudents,
      pct_work_life: wWl / totalStudents,
      pct_international: wInt / totalStudents,
      total_students: totalStudents,
      profile_year: year,
    }
  }, [courses])

  // Derive available fee type options
  const feeOptions = useMemo(() => {
    const fees = new Set<string>()
    for (const c of courses) {
      if (c.fee_type) fees.add(c.fee_type)
    }
    return Array.from(fees).sort()
  }, [courses])

  // Base filtering (search + text) applied before all dropdowns
  const baseFiltered = useMemo(() => {
    let result = courses
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.course_code.toLowerCase().includes(q) ||
          (c.campus_name && c.campus_name.toLowerCase().includes(q)) ||
          (c.campuses && c.campuses.some(cv => cv.campus_name?.toLowerCase().includes(q))) ||
          (c.campuses && c.campuses.some(cv => cv.course_code?.toLowerCase().includes(q))),
      )
    }
    return result
  }, [courses, search])

  // Helper: does a course pass the ATAR filters?
  const passesAtarFilter = (c: UacCourse) => {
    if (hideNoAtar && c.atar_lowest_num === null) return false
    if (c.atar_lowest_num !== null) {
      if (c.atar_lowest_num < atarMin || c.atar_lowest_num > atarMax) return false
    }
    return true
  }

  // Filter and sort
  const filtered = useMemo(() => {
    let result = baseFiltered

    // Level filter
    if (levelFilter !== 'all') {
      result = result.filter((c) => c.course_level === levelFilter)
    }

    // Field of study filter
    if (fieldFilter !== 'all') {
      result = result.filter((c) => c.field_of_study === fieldFilter)
    }

    // Fee filter
    if (feeFilter !== 'all') {
      result = result.filter((c) => c.fee_type === feeFilter)
    }

    // ATAR filters
    result = result.filter(passesAtarFilter)

    // Sort
    result = [...result]
    switch (sortKey) {
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'atar-asc':
        result.sort((a, b) => (a.atar_lowest_num ?? Infinity) - (b.atar_lowest_num ?? Infinity))
        break
      case 'atar-desc':
        result.sort((a, b) => (b.atar_lowest_num ?? -Infinity) - (a.atar_lowest_num ?? -Infinity))
        break
    }

    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFiltered, levelFilter, fieldFilter, feeFilter, hideNoAtar, atarMin, atarMax, sortKey])

  // Dynamic counts that respect all OTHER active filters (cross-filter counts)
  const dynamicCounts = useMemo(() => {
    // For each dropdown, count items matching all OTHER filters
    const levelCounts: Record<string, number> = {}
    const fieldCounts: Record<string, number> = {}
    const feeCounts: Record<string, number> = {}

    for (const c of baseFiltered) {
      if (!passesAtarFilter(c)) continue
      const matchesLevel = levelFilter === 'all' || c.course_level === levelFilter
      const matchesField = fieldFilter === 'all' || c.field_of_study === fieldFilter
      const matchesFee = feeFilter === 'all' || c.fee_type === feeFilter

      // Level count: must match field + fee (not level)
      if (matchesField && matchesFee) {
        const lk = c.course_level || 'Unknown'
        levelCounts[lk] = (levelCounts[lk] || 0) + 1
      }
      // Field count: must match level + fee (not field)
      if (matchesLevel && matchesFee) {
        const fk = c.field_of_study || 'Mixed Field Programs'
        fieldCounts[fk] = (fieldCounts[fk] || 0) + 1
      }
      // Fee count: must match level + field (not fee)
      if (matchesLevel && matchesField) {
        const ftk = c.fee_type || 'Unknown'
        feeCounts[ftk] = (feeCounts[ftk] || 0) + 1
      }
    }
    return { levelCounts, fieldCounts, feeCounts }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFiltered, levelFilter, fieldFilter, feeFilter, hideNoAtar, atarMin, atarMax])

  // Clamp ATAR slider to actual data bounds when data changes
  useEffect(() => {
    if (atarMin < atarBounds.lo) setAtarMin(atarBounds.lo)
    if (atarMax > atarBounds.hi) setAtarMax(atarBounds.hi)
  }, [atarBounds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, levelFilter, fieldFilter, feeFilter, hideNoAtar, atarMin, atarMax, sortKey])

  return (
    <div className="space-y-4">
      {/* UAC region banner */}
      <div className="rounded-xl bg-amber-900/20 border border-amber-800/50 px-4 py-3">
        <p className="text-xs text-amber-300/80 leading-relaxed">
          {data.uac_region_note}
          {summary.atar_year && (
            <span className="text-amber-400"> ATAR data is for {summary.atar_year} admissions.</span>
          )}
        </p>
      </div>

      {/* Summary bar */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-2xl font-bold text-gray-100 tabular-nums">{summary.total_courses}</p>
            <p className="text-xs text-gray-500">courses</p>
          </div>
          {summary.atar_range && (
            <div className="border-l border-gray-800 pl-4">
              <p className="text-sm text-gray-300 tabular-nums">
                <span className={atarColor(summary.atar_range.low)}>{summary.atar_range.low.toFixed(1)}</span>
                {' \u2013 '}
                <span className={atarColor(summary.atar_range.high)}>{summary.atar_range.high.toFixed(1)}</span>
              </p>
              <p className="text-xs text-gray-500">
                <Tip term="ATAR">ATAR</Tip> range ({summary.courses_with_atar} with data)
              </p>
            </div>
          )}
          <div className="border-l border-gray-800 pl-4 flex flex-wrap gap-1.5">
            {Object.entries(summary.by_fee_type).map(([type, count]) => (
              <Tip key={type} term={type}>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${feeColor(type)}`}>
                  {type} ({count})
                </span>
              </Tip>
            ))}
          </div>
        </div>
      </div>

      {/* Admission profile charts */}
      {(institutionProfile || sectorProfile) && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            <Tip term="How Students Were Admitted">How Students Were Admitted</Tip>
          </h3>
          {institutionProfile && (
            <AdmissionProfileChart
              label={data.institution.name}
              profile={institutionProfile}
            />
          )}
          {sectorProfile && (
            <AdmissionProfileChart
              label="NSW / ACT Sector Average"
              profile={sectorProfile}
            />
          )}
        </div>
      )}

      {/* Filter/sort controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Text search */}
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-700"
          aria-label="Search courses by name"
        />

        {/* Level filter */}
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-700"
          aria-label="Filter by course level"
        >
          <option value="all">All levels</option>
          {levelOptions.map(([key, label]) => {
            const count = dynamicCounts.levelCounts[key] || 0
            return (
              <option key={key} value={key}>
                {label} ({count})
              </option>
            )
          })}
        </select>

        {/* Field of study filter */}
        <select
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-700"
          aria-label="Filter by field of study"
        >
          <option value="all">All fields</option>
          {fieldOptions.map(([key, label]) => {
            const count = dynamicCounts.fieldCounts[key] || 0
            return (
              <option key={key} value={key}>
                {label} ({count})
              </option>
            )
          })}
        </select>

        {/* Fee filter */}
        <select
          value={feeFilter}
          onChange={(e) => setFeeFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-700"
          aria-label="Filter by fee type"
        >
          <option value="all">All fee types</option>
          {feeOptions.map((f) => {
            const count = dynamicCounts.feeCounts[f] || 0
            return (
              <option key={f} value={f}>
                {f} ({count})
              </option>
            )
          })}
        </select>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-700"
          aria-label="Sort courses"
        >
          <option value="atar-asc">ATAR: Low to High</option>
          <option value="atar-desc">ATAR: High to Low</option>
          <option value="title">Title: A-Z</option>
        </select>
      </div>

      {/* ATAR range controls */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideNoAtar}
              onChange={(e) => setHideNoAtar(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs text-gray-400">Hide courses with no ATAR</span>
          </label>
          <span className="text-xs text-gray-500">
            <Tip term="ATAR">ATAR</Tip> range: <span className="text-gray-300 tabular-nums">{atarMin}</span> – <span className="text-gray-300 tabular-nums">{atarMax}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 tabular-nums w-6 text-right">{atarBounds.lo}</span>
          <div className="relative flex-1" style={{ height: '20px' }}>
            {/* Track background */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 rounded-full bg-gray-700" />
            {/* Active range highlight */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-indigo-500/60"
              style={{
                left: `${((atarMin - atarBounds.lo) / Math.max(atarBounds.hi - atarBounds.lo, 1)) * 100}%`,
                right: `${100 - ((atarMax - atarBounds.lo) / Math.max(atarBounds.hi - atarBounds.lo, 1)) * 100}%`,
              }}
            />
            {/* Min slider */}
            <input
              type="range"
              min={atarBounds.lo}
              max={atarBounds.hi}
              value={atarMin}
              onChange={(e) => {
                const v = Number(e.target.value)
                setAtarMin(Math.min(v, atarMax - 1))
              }}
              className="absolute top-0 w-full h-full appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
              aria-label="Minimum ATAR"
            />
            {/* Max slider */}
            <input
              type="range"
              min={atarBounds.lo}
              max={atarBounds.hi}
              value={atarMax}
              onChange={(e) => {
                const v = Number(e.target.value)
                setAtarMax(Math.max(v, atarMin + 1))
              }}
              className="absolute top-0 w-full h-full appearance-none bg-transparent pointer-events-none z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
              aria-label="Maximum ATAR"
            />
          </div>
          <span className="text-xs text-gray-500 tabular-nums w-6">{atarBounds.hi}</span>
        </div>
      </div>

      {/* Results count + clear filters */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {filtered.length === courses.length
            ? `${filtered.length} courses`
            : `Showing ${filtered.length} of ${courses.length} courses`}
        </p>
        {(search || levelFilter !== 'TBP' || fieldFilter !== 'all' || feeFilter !== 'all' || !hideNoAtar || atarMin !== atarBounds.lo || atarMax !== atarBounds.hi) && (
          <button
            onClick={() => {
              setSearch('')
              setLevelFilter('TBP')
              setFieldFilter('all')
              setFeeFilter('all')
              setHideNoAtar(true)
              setAtarMin(atarBounds.lo)
              setAtarMax(atarBounds.hi)
              setVisibleCount(PAGE_SIZE)
            }}
            className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Course list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No courses match your filters.</p>
          <button
            onClick={() => {
              setSearch('')
              setLevelFilter('TBP')
              setFieldFilter('all')
              setFeeFilter('all')
              setHideNoAtar(true)
              setAtarMin(atarBounds.lo)
              setAtarMax(atarBounds.hi)
              setVisibleCount(PAGE_SIZE)
            }}
            className="text-indigo-400 text-sm mt-2 hover:text-indigo-300 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, visibleCount).map((course) => {
            const key = course.campus_name ? `${course.course_code}-${course.campus_name}` : course.course_code
            return (
              <CourseCard
                key={key}
                course={course}
                expanded={expandedCode === key}
                onToggle={() => setExpandedCode(expandedCode === key ? null : key)}
                allCourses={courses}
                fieldComparison={data.field_comparison?.[course.course_code]}
                atarTrend={data.atar_trends?.[course.course_code]}
                institutionName={data.institution.name}
              />
            )
          })}

          {/* Show more / pagination footer */}
          {visibleCount < filtered.length && (
            <div className="text-center py-4">
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="px-6 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:bg-gray-700 hover:border-gray-600 transition-colors"
              >
                Show more ({Math.min(PAGE_SIZE, filtered.length - visibleCount)} more of {filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
