import { anthropic } from './client.js'
import { all, first, run, uid } from './db.js'

export interface InsightReport {
  id: string
  period_start: string
  period_end: string
  top_issues: string[]
  complaint_clusters: { cluster: string; count: number; examples: string[] }[]
  competitor_mentions: string[]
  pricing_signals: string[]
  product_signals: string[]
  summary: string
  created_at: string
}

export async function generateInsightReport(days = 7): Promise<InsightReport | null> {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const convos = all<{ id: string; status: string; first_message: string; turn_count: number }>(
    `SELECT c.id, c.status, c.turn_count,
       (SELECT m.content FROM messages m WHERE m.conversation_id = c.id AND m.role = 'customer' ORDER BY m.created_at ASC LIMIT 1) as first_message
     FROM conversations c
     WHERE c.started_at >= ?
       AND c.status IN ('resolved', 'escalated')
     ORDER BY c.started_at DESC
     LIMIT 150`, since
  )

  if (convos.length < 3) return null

  const escalated = convos.filter(c => c.status === 'escalated').length
  const samples = convos
    .filter(c => c.first_message)
    .map((c, i) => `[${i + 1}] (${c.status}) ${c.first_message}`)
    .join('\n')

  try {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      system: `You are a business intelligence analyst reviewing customer service data. Extract actionable insights.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "top_issues": ["issue description", ...],
  "complaint_clusters": [{"cluster": "cluster name", "count": <number>, "examples": ["example 1", "example 2"]}],
  "competitor_mentions": ["competitor: context of mention"],
  "pricing_signals": ["signal description"],
  "product_signals": ["signal description"],
  "summary": "3-4 sentence executive summary with specific recommendations"
}

Rules:
- top_issues: up to 5 most recurring issue types, specific not generic
- complaint_clusters: up to 5 clusters with rough count and 1-2 example quotes
- competitor_mentions: any competitor names or comparison language found
- pricing_signals: price objections, "too expensive", willingness-to-pay signals
- product_signals: defects mentioned, feature requests, confusion about how something works
- summary: what the data shows, what action the business should take, be specific
- Use [] for any field with no data`,
      messages: [{
        role: 'user',
        content: `${convos.length} conversations (${escalated} escalated, ${convos.length - escalated} resolved) from the last ${days} days:\n\n${samples.slice(0, 14000)}`,
      }],
    })

    const text = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}'
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(text)
    } catch {
      const m = text.match(/\{[\s\S]*\}/)
      if (m) try { parsed = JSON.parse(m[0]) } catch {}
    }

    const id = uid()
    const now = new Date().toISOString()
    const report: InsightReport = {
      id,
      period_start: since,
      period_end: now,
      top_issues: (parsed['top_issues'] as string[]) ?? [],
      complaint_clusters: (parsed['complaint_clusters'] as InsightReport['complaint_clusters']) ?? [],
      competitor_mentions: (parsed['competitor_mentions'] as string[]) ?? [],
      pricing_signals: (parsed['pricing_signals'] as string[]) ?? [],
      product_signals: (parsed['product_signals'] as string[]) ?? [],
      summary: String(parsed['summary'] ?? 'Insufficient data to generate insights.'),
      created_at: now,
    }

    run(
      `INSERT INTO insight_reports (id, period_start, period_end, top_issues_json, complaint_clusters_json, competitor_mentions_json, pricing_signals_json, product_signals_json, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, since, now,
      JSON.stringify(report.top_issues),
      JSON.stringify(report.complaint_clusters),
      JSON.stringify(report.competitor_mentions),
      JSON.stringify(report.pricing_signals),
      JSON.stringify(report.product_signals),
      report.summary, now
    )

    return report
  } catch {
    return null
  }
}

export function getLatestInsightReport(): InsightReport | null {
  const row = first<Record<string, unknown>>(
    `SELECT * FROM insight_reports ORDER BY created_at DESC LIMIT 1`
  )
  if (!row) return null
  return {
    id: String(row['id']),
    period_start: String(row['period_start']),
    period_end: String(row['period_end']),
    top_issues: tryParse(row['top_issues_json'], []),
    complaint_clusters: tryParse(row['complaint_clusters_json'], []),
    competitor_mentions: tryParse(row['competitor_mentions_json'], []),
    pricing_signals: tryParse(row['pricing_signals_json'], []),
    product_signals: tryParse(row['product_signals_json'], []),
    summary: String(row['summary']),
    created_at: String(row['created_at']),
  }
}

export function listInsightReports(limit = 10): InsightReport[] {
  const rows = all<Record<string, unknown>>(
    `SELECT * FROM insight_reports ORDER BY created_at DESC LIMIT ?`, limit
  )
  return rows.map(row => ({
    id: String(row['id']),
    period_start: String(row['period_start']),
    period_end: String(row['period_end']),
    top_issues: tryParse(row['top_issues_json'], []),
    complaint_clusters: tryParse(row['complaint_clusters_json'], []),
    competitor_mentions: tryParse(row['competitor_mentions_json'], []),
    pricing_signals: tryParse(row['pricing_signals_json'], []),
    product_signals: tryParse(row['product_signals_json'], []),
    summary: String(row['summary']),
    created_at: String(row['created_at']),
  }))
}

function tryParse<T>(s: unknown, fallback: T): T {
  if (!s) return fallback
  try { return JSON.parse(String(s)) as T } catch { return fallback }
}
