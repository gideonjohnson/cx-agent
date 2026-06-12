import { first, all } from '../lib/db.js'

export interface CXMetrics {
  resolution: ResolutionMetrics
  actions: ActionMetrics
  escalations: EscalationMetrics
  sentiment: SentimentMetrics
  volume: VolumeMetrics
}

interface ResolutionMetrics {
  total_conversations: number
  resolved: number
  escalated: number
  open: number
  resolution_rate_pct: number
  fcr_rate_pct: number // first contact resolution
  avg_turns_to_resolve: number
}

interface ActionMetrics {
  total_actions: number
  verified_pct: number
  by_type: { action_name: string; count: number; verified_pct: number }[]
  top_action: string
}

interface EscalationMetrics {
  total_escalations: number
  by_trigger: { trigger: string; count: number }[]
  avg_per_day: number
  escalation_rate_pct: number
}

interface SentimentMetrics {
  avg_csat: number | null
  csat_count: number
  csat_distribution: { score: number; count: number }[]
  frustration_flags: number
}

interface VolumeMetrics {
  today: number
  this_week: number
  this_month: number
  avg_daily: number
}

export function getMetrics(days = 30): CXMetrics {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const totals = first<{ total: number; resolved: number; escalated: number; open: number }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
       SUM(CASE WHEN escalated = 1 THEN 1 ELSE 0 END) as escalated,
       SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open
     FROM conversations WHERE started_at >= ?`, since
  ) ?? { total: 0, resolved: 0, escalated: 0, open: 0 }

  const avgTurns = first<{ avg: number }>(
    `SELECT AVG(turn_count) as avg FROM conversations WHERE status = 'resolved' AND started_at >= ?`, since
  )

  // First contact resolution: resolved on first conversation (no prior conversations for this customer in last 30 days)
  const fcrResult = first<{ fcr: number }>(
    `SELECT ROUND(100.0 * SUM(CASE WHEN prior = 0 THEN 1 ELSE 0 END) / MAX(COUNT(*), 1), 1) as fcr
     FROM (
       SELECT c1.id,
         (SELECT COUNT(*) FROM conversations c2 WHERE c2.customer_id = c1.customer_id AND c2.started_at < c1.started_at AND c2.started_at >= ?) as prior
       FROM conversations c1 WHERE c1.status = 'resolved' AND c1.started_at >= ?
     )`, since, since
  )

  const actionTotals = first<{ total: number; verified: number }>(
    `SELECT COUNT(*) as total, SUM(verified) as verified FROM actions_log
     WHERE created_at >= ?`, since
  ) ?? { total: 0, verified: 0 }

  const byType = all<{ action_name: string; count: number; verified_pct: number }>(
    `SELECT action_name, COUNT(*) as count,
       ROUND(100.0 * SUM(verified) / MAX(COUNT(*), 1), 1) as verified_pct
     FROM actions_log WHERE created_at >= ?
     GROUP BY action_name ORDER BY count DESC LIMIT 10`, since
  )

  const escTotals = first<{ total: number }>(`SELECT COUNT(*) as total FROM escalations WHERE created_at >= ?`, since) ?? { total: 0 }
  const escByTrigger = all<{ trigger: string; count: number }>(
    `SELECT trigger, COUNT(*) as count FROM escalations WHERE created_at >= ? GROUP BY trigger ORDER BY count DESC`, since
  )

  const csatData = first<{ avg: number; count: number }>(
    `SELECT AVG(score) as avg, COUNT(*) as count FROM csat_scores WHERE collected_at >= ?`, since
  ) ?? { avg: 0, count: 0 }
  const csatDist = all<{ score: number; count: number }>(
    `SELECT score, COUNT(*) as count FROM csat_scores WHERE collected_at >= ? GROUP BY score ORDER BY score DESC`, since
  )
  const frustrationFlags = first<{ count: number }>(
    `SELECT COUNT(*) as count FROM messages WHERE frustration_flag = 1 AND created_at >= ?`, since
  )?.count ?? 0

  const volumeToday = first<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE started_at >= datetime('now', 'start of day')`,
  )?.count ?? 0
  const volumeWeek = first<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE started_at >= datetime('now', '-7 days')`,
  )?.count ?? 0
  const volumeMonth = first<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE started_at >= ?`, since
  )?.count ?? 0

  return {
    resolution: {
      total_conversations: totals.total,
      resolved: totals.resolved,
      escalated: totals.escalated,
      open: totals.open,
      resolution_rate_pct: totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0,
      fcr_rate_pct: fcrResult?.fcr ?? 0,
      avg_turns_to_resolve: Math.round((avgTurns?.avg ?? 0) * 10) / 10,
    },
    actions: {
      total_actions: actionTotals.total,
      verified_pct: actionTotals.total > 0 ? Math.round((actionTotals.verified / actionTotals.total) * 100) : 0,
      by_type: byType,
      top_action: byType[0]?.action_name ?? 'none',
    },
    escalations: {
      total_escalations: escTotals.total,
      by_trigger: escByTrigger,
      avg_per_day: Math.round((escTotals.total / days) * 10) / 10,
      escalation_rate_pct: totals.total > 0 ? Math.round((totals.escalated / totals.total) * 100) : 0,
    },
    sentiment: {
      avg_csat: csatData.count > 0 ? Math.round((csatData.avg ?? 0) * 10) / 10 : null,
      csat_count: csatData.count,
      csat_distribution: csatDist,
      frustration_flags: frustrationFlags,
    },
    volume: {
      today: volumeToday,
      this_week: volumeWeek,
      this_month: volumeMonth,
      avg_daily: Math.round((volumeMonth / days) * 10) / 10,
    },
  }
}
