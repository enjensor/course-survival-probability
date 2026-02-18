import type { Institution, Field, ReportData, HeatmapData, EquityReportData } from './types'

// In dev, Vite proxies /api → localhost:8000.
// In production, VITE_API_URL points to the Render backend.
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export async function fetchInstitutions(): Promise<Institution[]> {
  const res = await fetch(`${BASE}/institutions`)
  if (!res.ok) throw new Error('Failed to fetch institutions')
  return res.json()
}

export async function fetchFields(): Promise<Field[]> {
  const res = await fetch(`${BASE}/fields`)
  if (!res.ok) throw new Error('Failed to fetch fields')
  return res.json()
}

export async function fetchReport(
  institutionId: number,
  fieldId?: number,
): Promise<ReportData> {
  const url = fieldId
    ? `${BASE}/report/${institutionId}?field_id=${fieldId}`
    : `${BASE}/report/${institutionId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch report')
  return res.json()
}

export async function fetchHeatmap(fieldId: number): Promise<HeatmapData> {
  const res = await fetch(`${BASE}/heatmap?field_id=${fieldId}`)
  if (!res.ok) throw new Error('Failed to fetch heatmap data')
  return res.json()
}

export async function fetchEquityReport(institutionId: number): Promise<EquityReportData> {
  const res = await fetch(`${BASE}/equity/${institutionId}`)
  if (!res.ok) throw new Error('Failed to fetch equity report')
  return res.json()
}
