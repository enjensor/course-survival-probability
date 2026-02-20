/* ── API response types ── */

export interface Institution {
  id: number
  name: string
  state: string
}

export interface Field {
  id: number
  name: string
}

export interface Completion {
  four_year_pct: number | null
  six_year_pct: number | null
  nine_year_pct: number | null
  national_avg_four_year: number | null
  cohort_period: string | null
  still_enrolled_pct: number | null
  dropped_out_pct: number | null
  never_returned_pct: number | null
}

export interface Attrition {
  latest_rate: number | null
  latest_year: number | null
  national_avg: number | null
  percentile: number | null
  risk_level: string | null
}

export interface RateYear {
  rate: number | null
  year: number | null
}

export interface Trend {
  years: number[]
  attrition_rates: number[]
  direction: string
  slope: number
}

export interface TimelineEntry {
  pct: number | null
  period: string | null
  national_avg: number | null
}

export interface CompletionTimeline {
  four_year: TimelineEntry
  six_year: TimelineEntry
  nine_year: TimelineEntry
}

export interface TrendPoint {
  year: number
  value: number
}

export interface RankingEntry {
  id: number
  name: string
  enrolled: number
  graduates: number
  ratio: number
  rank: number
}

export interface FieldRankingData {
  this_institution: { rank: number | null; of: number; ratio: number | null }
  top_5: RankingEntry[]
  bottom_5: RankingEntry[]
  national_avg_ratio: number
}

export interface FieldContext {
  enrolment: number | null
  total_enrolment: number | null
  field_share_pct: number | null
  year: number | null
  completions: number | null
  total_completions: number | null
  completion_ratio: number | null
  enrolment_trend: TrendPoint[]
  completions_trend: TrendPoint[]
  ranking: FieldRankingData | null
}

export interface InternationalMetric {
  rate: number | null
  year: number | null
  national_avg: number | null
}

export interface InternationalData {
  attrition: InternationalMetric
  retention: InternationalMetric
  success: InternationalMetric
  trend: Array<{ year: number; rate: number }>
}

export interface CourseLevelBreakdown {
  postgrad_research: number | null
  postgrad_coursework: number | null
  bachelor: number | null
  sub_bachelor: number | null
  total: number
  year: number
  pct_postgrad_research: number
  pct_postgrad_coursework: number
  pct_bachelor: number
  pct_sub_bachelor: number
}

export interface CourseLevelPcts {
  pct_postgrad_research: number
  pct_postgrad_coursework: number
  pct_bachelor: number
  pct_sub_bachelor: number
}

export interface CourseLevelEfficiency {
  postgrad_research: number | null
  postgrad_coursework: number | null
  bachelor: number | null
  sub_bachelor: number | null
  overall: number
}

export interface CourseLevelData {
  enrolment: CourseLevelBreakdown | null
  completion: CourseLevelBreakdown | null
  national_avg_enrolment: CourseLevelPcts | null
  efficiency: CourseLevelEfficiency | null
}

export interface StaffRatioTrendPoint {
  year: number
  academic: number
  non_academic: number | null
}

export interface StaffRatioData {
  year: number
  academic_ratio: number
  non_academic_ratio: number | null
  eftsl: number | null
  academic_fte: number | null
  non_academic_fte: number | null
  national_avg_academic: number | null
  national_avg_non_academic: number | null
  percentile: number
  intensity: string
  trend: StaffRatioTrendPoint[]
  trend_direction: string
  trend_slope: number
}

export interface ReportData {
  institution: { id: number; name: string; state: string; provider_type: string }
  field: { id: number; name: string } | null
  completion: Completion
  attrition: Attrition
  retention: RateYear
  success: RateYear
  trend: Trend
  completion_timeline: CompletionTimeline
  field_context: FieldContext | null
  international: InternationalData | null
  course_level: CourseLevelData | null
  staff_ratio: StaffRatioData | null
}

/* ── Heatmap (Explore by Field) types ── */

export interface HeatmapEntry {
  institution_id: number
  institution_name: string
  state: string
  attrition_rate: number
  grad_ratio: number | null
  composite_risk: number
  risk_tier: 'low' | 'medium' | 'high'
}

export interface HeatmapData {
  field_id: number
  field_name: string
  entries: HeatmapEntry[]
  summary: {
    num_institutions: number
    avg_risk: number
    min_risk: number
    max_risk: number
    best_institution_name: string
    worst_institution_name: string
    attrition_year: number
    enrolment_year: number
  }
}

/* ── Equity Report types ── */

export interface EquityGroupMetric {
  rate: number | null
  national_avg: number | null
  gap: number | null
}

export interface EquityGroupData {
  retention: EquityGroupMetric
  success: EquityGroupMetric
  attainment: EquityGroupMetric
  trend: Array<{ year: number; retention: number }>
}

export interface EquitySummary {
  groups_above_avg: number
  groups_total: number
  overall_label: string
}

export interface EquityReportData {
  institution: { id: number; name: string; state: string }
  latest_year: Record<string, number>
  groups: Record<string, EquityGroupData>
  all_domestic: {
    retention: EquityGroupMetric
    success: EquityGroupMetric
    attainment: EquityGroupMetric
  }
  support_summary: EquitySummary
}

/* ── Courses (ATAR & Entry Requirements) types ── */

export interface CampusVariant {
  campus_name: string
  course_code: string
  atar_lowest: string | null
  atar_lowest_num: number | null
  selection_rank_lowest: string | null
  selection_rank_median: string | null
  further_info_url: string | null
}

export interface UacCourse {
  course_code: string
  title: string
  levels: string[]
  course_level: string | null
  course_level_label: string | null
  fee_type: string | null
  fee_type_label: string | null
  duration: string | null
  mode_of_attendance: string | null
  campus_name: string | null
  // ATAR
  atar_year: number | null
  atar_lowest: string | null
  atar_median: string | null
  atar_highest: string | null
  atar_lowest_num: number | null
  atar_median_num: number | null
  selection_rank_lowest: string | null
  selection_rank_median: string | null
  selection_rank_highest: string | null
  // Student profile
  student_profile_year: number | null
  total_students: string | null
  pct_atar_based: string | null
  pct_higher_ed: string | null
  pct_vet: string | null
  pct_work_life: string | null
  pct_international: string | null
  // Field of study
  field_of_study: string | null
  field_of_study_label: string | null
  // Detail content
  about: string | null
  assumed_knowledge: string | null
  admission_criteria: string | null
  career_opportunities: string | null
  practical_experience: string | null
  professional_recognition: string | null
  further_info_url: string | null
  start_months: string | null
  // Campus grouping
  campuses?: CampusVariant[]
  campus_count?: number
  // Discipline tag for cross-institution comparison
  discipline?: string | null
}

export interface CoursesSummary {
  total_courses: number
  courses_with_atar: number
  atar_range: { low: number; high: number } | null
  by_course_level: Record<string, number>
  by_fee_type: Record<string, number>
  by_field_of_study: Record<string, number>
  atar_year: number | null
}

export interface FieldComparisonEntry {
  institution: string
  atar: number
  title: string
  course_code: string
}

export interface AtarTrendPoint {
  year: number
  atar: number
}

export interface CoursesReportData {
  institution: { id: number; name: string; state: string }
  uac_region_note: string
  courses: UacCourse[]
  summary: CoursesSummary
  field_comparison: Record<string, FieldComparisonEntry[]>
  atar_trends: Record<string, AtarTrendPoint[]>
}

export interface SectorAdmissionProfile {
  profile_year: number | null
  total_students: number
  pct_atar_based: number
  pct_higher_ed: number
  pct_vet: number
  pct_work_life: number
  pct_international: number
}
