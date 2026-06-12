import { all, first, run } from './lib/db.js'
import { sendEmail } from './lib/email.js'
import { logEvent } from './lib/events.js'
import { getConfig } from './lib/config.js'

const CLIENT_EMAIL = process.env.CLIENT_EMAIL

// Close conversations that have had no activity in 24 hours
export function closeStaleConversations() {
  const stale = all<{ id: string; customer_id: string }>(
    `SELECT id, customer_id FROM conversations
     WHERE status = 'open' AND last_activity_at < datetime('now', '-24 hours')`
  )
  for (const conv of stale) {
    run(`UPDATE conversations SET status = 'resolved', resolution_method = 'auto_close', resolved_at = datetime('now') WHERE id = ?`, conv.id)
  }
  if (stale.length > 0) logEvent('rule', 'Auto-close stale conversations', `Closed ${stale.length} conversations with no activity in 24h`)
}

// Collect CSAT for conversations resolved more than 1 hour ago that haven't been rated
export async function sendPendingCsatRequests() {
  const eligible = all<{ id: string; customer_id: string }>(
    `SELECT c.id, c.customer_id FROM conversations c
     WHERE c.status = 'resolved'
       AND c.resolved_at < datetime('now', '-1 hour')
       AND c.id NOT IN (SELECT conversation_id FROM csat_scores)
     LIMIT 20`
  )

  for (const conv of eligible) {
    const customer = first<{ email: string; name: string }>(
      `SELECT email, name FROM customers WHERE id = ?`, conv.customer_id
    )
    if (!customer) continue

    await sendEmail(
      customer.email,
      'How did we do? (30 seconds)',
      `Hi ${customer.name},\n\nThank you for reaching out. We'd love to know how your experience was.\n\nPlease rate us: 1 (poor) to 5 (excellent)\n\nReply with your rating and any comments. It takes 30 seconds and helps us improve.`
    ).catch(() => {})
  }

  if (eligible.length > 0) logEvent('rule', 'CSAT requests sent', `Sent ${eligible.length} CSAT emails`)
}

// Alert on high escalation rate (>30% in last hour)
export async function checkEscalationRate() {
  const hourly = first<{ total: number; escalated: number }>(
    `SELECT COUNT(*) as total, SUM(escalated) as escalated
     FROM conversations WHERE started_at >= datetime('now', '-1 hour')`
  )
  if (!hourly || hourly.total < 5) return

  const rate = Math.round((hourly.escalated / hourly.total) * 100)
  if (rate > 30 && CLIENT_EMAIL) {
    await sendEmail(
      CLIENT_EMAIL,
      `Alert: Escalation rate at ${rate}% in the last hour`,
      `CX Agent alert:\n\nEscalation rate in the last hour: ${rate}% (${hourly.escalated}/${hourly.total} conversations)\n\nThis is above the 30% threshold. Please review the escalation queue on the dashboard.`
    ).catch(() => {})
    logEvent('alert', 'High escalation rate', `${rate}% escalation rate in last hour (${hourly.escalated}/${hourly.total})`)
  }
}

// Flag conversations with >10 turns that haven't resolved (stuck conversations)
export async function flagStuckConversations() {
  const stuck = all<{ id: string; customer_id: string; turn_count: number }>(
    `SELECT id, customer_id, turn_count FROM conversations
     WHERE status = 'open' AND turn_count >= 10`
  )
  for (const conv of stuck) {
    const customer = first<{ name: string; email: string }>(
      `SELECT name, email FROM customers WHERE id = ?`, conv.customer_id
    )
    logEvent('alert', 'Stuck conversation', `Conversation ${conv.id.slice(0, 8)} for ${customer?.name ?? 'unknown'} has ${conv.turn_count} turns with no resolution`)

    if (CLIENT_EMAIL) {
      await sendEmail(
        CLIENT_EMAIL,
        `Stuck conversation: ${customer?.name ?? 'Customer'} (${conv.turn_count} turns)`,
        `A customer conversation has reached ${conv.turn_count} turns without resolution.\n\nCustomer: ${customer?.name} (${customer?.email})\nConversation: ${conv.id.slice(0, 8)}\n\nReview this conversation in the dashboard.`
      ).catch(() => {})
    }
  }
}

// Alert when escalations have been unassigned beyond the SLA threshold
export async function checkEscalationSla() {
  const slaHours = parseInt(getConfig('ESCALATION_SLA_HOURS') ?? '2')

  // Only alert each escalation once — we mark it with 'SLA_ALERTED' after firing
  const breached = all<{ id: string; trigger: string; summary: string; created_at: string; customer_name?: string }>(
    `SELECT e.id, e.trigger, e.summary, e.created_at, c.name as customer_name
     FROM escalations e
     LEFT JOIN conversations conv ON conv.id = e.conversation_id
     LEFT JOIN customers c ON c.id = conv.customer_id
     WHERE e.resolved_at IS NULL
       AND (e.assigned_to IS NULL OR e.assigned_to = '')
       AND e.created_at < datetime('now', '-${slaHours} hours')`
  )

  for (const esc of breached) {
    const ref = `ESC-${esc.id.slice(0, 8)}`
    logEvent('sla_breach', ref, `Unattended escalation for ${slaHours}h — trigger: ${esc.trigger}`)

    if (CLIENT_EMAIL) {
      await sendEmail(
        CLIENT_EMAIL,
        `⚠ SLA Alert: ${ref} unattended for ${slaHours}h`,
        `An escalation has not been assigned or resolved within the ${slaHours}-hour SLA.\n\nReference: ${ref}\nCustomer: ${esc.customer_name ?? 'unknown'}\nTrigger: ${esc.trigger}\nOpened: ${esc.created_at}\n\nSummary:\n${esc.summary}\n\nPlease review and assign this escalation in the dashboard.`
      ).catch(() => {})
    }

    // Mark as alerted so we don't spam on the next scheduler run
    run(`UPDATE escalations SET assigned_to = 'SLA_ALERTED' WHERE id = ? AND (assigned_to IS NULL OR assigned_to = '')`, esc.id)
  }

  if (breached.length > 0) {
    logEvent('rule', 'Escalation SLA check', `${breached.length} SLA breach(es) alerted`)
  }
}

// Proactive outreach: customers with active subscription + overdue invoice not contacted in 3 days
export async function checkOverdueWithSubscription() {
  const atrisk = all<{ customer_id: string; name: string; email: string; amount_gbp: number }>(
    `SELECT c.id as customer_id, c.name, c.email, i.amount_gbp
     FROM customers c
     JOIN invoices i ON i.customer_id = c.id
     JOIN subscriptions s ON s.customer_id = c.id
     WHERE i.status = 'overdue'
       AND s.status = 'active'
       AND i.due_at < datetime('now', '-7 days')
       AND c.id NOT IN (
         SELECT customer_id FROM conversations
         WHERE started_at >= datetime('now', '-3 days')
       )
     LIMIT 10`
  )

  for (const customer of atrisk) {
    await sendEmail(
      customer.email,
      'Action needed: outstanding balance on your account',
      `Hi ${customer.name},\n\nWe noticed there's an outstanding balance of £${customer.amount_gbp} on your account.\n\nTo avoid any interruption to your service, please update your payment method or contact us to arrange payment.\n\nYou can reply to this email or chat with us on our website.`
    ).catch(() => {})
  }

  if (atrisk.length > 0) logEvent('rule', 'Proactive outreach', `Sent payment reminders to ${atrisk.length} customers with overdue invoices`)
}
