import type { Institution, Field, ReportData, HeatmapData, EquityReportData } from './types'

const BASE = '/api'
const TIMEOUT_MS = 30_000

/**
 * Fetch with a timeout via AbortController.
 * On Render free tier the server cold-starts in ~30s,
 * so we give it a generous window before giving up.
 */
async function fetchWithTimeout(url: string, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out — the server may be starting up. Please try again in a moment.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchInstitutions(): Promise<Institution[]> {
  const res = await fetchWithTimeout(`${BASE}/institutions`)
  if (!res.ok) throw new Error('Failed to fetch institutions')
  return res.json()
}

export async function fetchFields(): Promise<Field[]> {
  const res = await fetchWithTimeout(`${BASE}/fields`)
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
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error('Failed to fetch report')
  return res.json()
}

export async function fetchHeatmap(fieldId: number): Promise<HeatmapData> {
  const res = await fetchWithTimeout(`${BASE}/heatmap?field_id=${fieldId}`)
  if (!res.ok) throw new Error('Failed to fetch heatmap data')
  return res.json()
}

export async function fetchEquityReport(institutionId: number): Promise<EquityReportData> {
  const res = await fetchWithTimeout(`${BASE}/equity/${institutionId}`)
  if (!res.ok) throw new Error('Failed to fetch equity report')
  return res.json()
}
