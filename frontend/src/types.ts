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
