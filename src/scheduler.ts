import cron from 'node-cron'
import { sendEmail } from './lib/email.js'
import { logEvent } from './lib/events.js'
import {
  closeStaleConversations,
  sendPendingCsatRequests,
  checkEscalationRate,
  checkEscalationSla,
  flagStuckConversations,
  checkOverdueWithSubscription,
} from './rules.js'

async function safely(taskName: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn()
  } catch (err) {
    const msg = String(err)
    console.error(`[scheduler:${taskName}] Error: ${msg}`)
    logEvent('scheduler_error', taskName, msg.slice(0, 200))
    const clientEmail = process.env.CLIENT_EMAIL
    if (clientEmail) {
      await sendEmail(clientEmail, `[CX Agent] Scheduler error in ${taskName}`, `Task: ${taskName}\nError: ${msg}\nTime: ${new Date().toISOString()}`).catch(() => {})
    }
  }
}

// Every 2 minutes: poll email inbox for new messages
cron.schedule('*/2 * * * *', () => safely('email-poll', async () => {
  const { pollEmailInbox } = await import('./channels/email-poller.js')
  await pollEmailInbox()
}))

// Every 30 minutes: close stale conversations + check escalation rate + SLA
cron.schedule('*/30 * * * *', () => safely('stale+escalation-check', async () => {
  closeStaleConversations()
  await checkEscalationRate()
  await checkEscalationSla()
}))

// Every hour: send CSAT requests for resolved conversations
cron.schedule('0 * * * *', () => safely('csat-requests', () => sendPendingCsatRequests()))

// Every 2 hours: flag stuck conversations
cron.schedule('0 */2 * * *', () => safely('stuck-conversations', () => flagStuckConversations()))

// Daily at 09:00: proactive outreach to at-risk customers
cron.schedule('0 9 * * *', () => safely('proactive-outreach', () => checkOverdueWithSubscription()))

// Daily at 06:00: morning digest to client
cron.schedule('0 6 * * *', () => safely('morning-digest', async () => {
  const { getMetrics } = await import('./analytics/metrics.js')
  const m = getMetrics(1)
  const clientEmail = process.env.CLIENT_EMAIL
  const clientName = process.env.CLIENT_NAME ?? 'Team'
  if (!clientEmail) return

  await sendEmail(clientEmail, `CX Daily Digest — ${new Date().toLocaleDateString('en-GB')}`,
    `Good morning, ${clientName}!\n\nYesterday's CX snapshot:\n\n` +
    `Conversations: ${m.volume.today} today / ${m.volume.this_week} this week\n` +
    `Resolution rate: ${m.resolution.resolution_rate_pct}%\n` +
    `Escalation rate: ${m.escalations.escalation_rate_pct}%\n` +
    `CSAT: ${m.sentiment.avg_csat ?? 'No scores yet'}/5 (${m.sentiment.csat_count} ratings)\n` +
    `Open conversations: ${m.resolution.open}\n\n` +
    `Top action: ${m.actions.top_action}\n` +
    `Frustration flags: ${m.sentiment.frustration_flags}\n\n` +
    `View the dashboard for full details.`
  )
  logEvent('digest', 'Morning digest sent', `Sent to ${clientEmail}`)
}))

// Weekly Monday 08:00: weekly summary
cron.schedule('0 8 * * 1', () => safely('weekly-digest', async () => {
  const { getMetrics } = await import('./analytics/metrics.js')
  const m = getMetrics(7)
  const clientEmail = process.env.CLIENT_EMAIL
  const clientName = process.env.CLIENT_NAME ?? 'Team'
  if (!clientEmail) return

  await sendEmail(clientEmail, `CX Weekly Summary — w/e ${new Date().toLocaleDateString('en-GB')}`,
    `Hi ${clientName},\n\nHere's your weekly CX Agent summary:\n\n` +
    `Total conversations: ${m.volume.this_week}\n` +
    `Resolved: ${m.resolution.resolved} (${m.resolution.resolution_rate_pct}% rate)\n` +
    `Escalated: ${m.resolution.escalated} (${m.escalations.escalation_rate_pct}% rate)\n` +
    `First contact resolution: ${m.resolution.fcr_rate_pct}%\n` +
    `Avg turns to resolve: ${m.resolution.avg_turns_to_resolve}\n\n` +
    `CSAT: ${m.sentiment.avg_csat ?? 'No scores yet'}/5 from ${m.sentiment.csat_count} ratings\n\n` +
    `Top actions taken:\n${m.actions.by_type.slice(0, 5).map(a => `  - ${a.action_name}: ${a.count} times (${a.verified_pct}% verified)`).join('\n')}\n\n` +
    `Escalation triggers:\n${m.escalations.by_trigger.map(t => `  - ${t.trigger}: ${t.count}`).join('\n') || '  None'}\n\n` +
    `View the dashboard for conversation-level detail.`
  )
  logEvent('digest', 'Weekly digest sent', `Sent to ${clientEmail}`)
}))

console.log(`[CX Agent] Scheduler running — ${new Date().toISOString()}`)
console.log('  Stale close + escalation check: every 30 minutes')
console.log('  CSAT requests: every hour')
console.log('  Stuck conversation check: every 2 hours')
console.log('  Proactive outreach: daily 09:00')
console.log('  Morning digest: daily 06:00')
console.log('  Weekly summary: Monday 08:00')
