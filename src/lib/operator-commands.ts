// Shared operator command handler — used by both Telegram and WhatsApp bots
import { getConfig, setConfig } from './config.js'
import { first, all, run } from './db.js'
import { logEvent } from './events.js'
import Anthropic from '@anthropic-ai/sdk'

export function statusSummary(): string {
  const open    = first<{ c: number }>(`SELECT count(*) c FROM conversations WHERE status NOT IN ('resolved','closed')`)?.c ?? 0
  const esc     = first<{ c: number }>(`SELECT count(*) c FROM conversations WHERE status = 'escalated'`)?.c ?? 0
  const pending = first<{ c: number }>(`SELECT count(*) c FROM inbound_messages WHERE status = 'awaiting_approval'`)?.c ?? 0
  const today   = first<{ c: number }>(`SELECT count(*) c FROM conversations WHERE date(updated_at) = date('now')`)?.c ?? 0
  const mode    = getConfig('REPLY_MODE') ?? 'approve_social'
  return [
    'CX Agent Status',
    `Open: ${open}  Escalated: ${esc}  Pending approval: ${pending}  Handled today: ${today}`,
    `Reply mode: ${mode}`,
  ].join('\n')
}

export function inboxSummary(): string {
  const rows = all<{ id: string; sender_id: string; channel: string; body: string; created_at: string }>(
    `SELECT id, sender_id, channel, body, created_at FROM inbound_messages
     WHERE status NOT IN ('resolved','closed') ORDER BY created_at DESC LIMIT 5`
  )
  if (!rows.length) return 'Inbox is empty.'
  return 'Latest messages:\n' + rows.map(r =>
    `• ${r.id.slice(0,8)} [${r.channel}] ${r.sender_id.slice(0,24)} — ${r.body.slice(0,60).replace(/\n/g,' ')}`
  ).join('\n')
}

export function escalationsSummary(): string {
  const rows = all<{ id: string; customer_id: string; updated_at: string }>(
    `SELECT c.id, c.customer_id, c.updated_at FROM conversations c
     WHERE c.status = 'escalated' ORDER BY c.updated_at DESC LIMIT 10`
  )
  if (!rows.length) return 'No open escalations.'
  return 'Open escalations:\n' + rows.map(r =>
    `• ${r.id.slice(0,8)} — customer ${r.customer_id.slice(0,8)} — ${r.updated_at.slice(0,16)}`
  ).join('\n')
}

export function pendingSummary(): string {
  const rows = all<{ id: string; sender_id: string; channel: string; body: string; agent_reply: string }>(
    `SELECT id, sender_id, channel, body, agent_reply FROM inbound_messages
     WHERE status = 'awaiting_approval' ORDER BY created_at ASC LIMIT 5`
  )
  if (!rows.length) return 'No pending approvals.'
  return 'Pending approvals:\n\n' + rows.map(r => [
    `${r.id.slice(0,8)} [${r.channel}] ${r.sender_id.slice(0,30)}`,
    `Customer: ${r.body.slice(0,80).replace(/\n/g,' ')}`,
    `Draft reply: ${(r.agent_reply ?? '').slice(0,100).replace(/\n/g,' ')}`,
  ].join('\n')).join('\n\n')
}

async function askClaude(question: string): Promise<string> {
  const apiKey = getConfig('ANTHROPIC_API_KEY')
  if (!apiKey) return 'No Anthropic API key configured.'
  const context = [statusSummary(), inboxSummary(), escalationsSummary()].join('\n\n')
  try {
    const client = new Anthropic({ apiKey })
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are the CX Agent operator assistant. Answer the operator's question concisely based on the live system state below. Plain text only, no markdown. Under 200 words.\n\nSystem state:\n${context}`,
      messages: [{ role: 'user', content: question }],
    })
    return (res.content[0] as any).text ?? 'No response.'
  } catch (e) {
    return `Claude error: ${String(e).slice(0,100)}`
  }
}

export const HELP_TEXT = [
  'CX Agent — Operator Commands',
  '',
  '/status — Dashboard overview',
  '/inbox — Latest 5 messages',
  '/escalations — Open escalations',
  '/pending — Replies awaiting approval',
  '/approve <id> — Send a pending reply',
  '/reject <id> — Discard a pending reply',
  '/pause — Pause all auto-replies',
  '/resume — Resume auto-replies',
  '',
  'Or ask anything in plain English.',
].join('\n')

export async function handleOperatorCommand(text: string): Promise<string> {
  const parts = text.trim().split(/\s+/)
  const cmd   = parts[0].toLowerCase()

  if (cmd === '/start' || cmd === '/help') return HELP_TEXT
  if (cmd === '/status')      return statusSummary()
  if (cmd === '/inbox')       return inboxSummary()
  if (cmd === '/escalations') return escalationsSummary()
  if (cmd === '/pending')     return pendingSummary()

  if (cmd === '/pause') {
    setConfig('REPLY_MODE', 'approve_all')
    return 'Auto-replies paused. All responses will queue for your approval.'
  }

  if (cmd === '/resume') {
    setConfig('REPLY_MODE', 'approve_social')
    return 'Auto-replies resumed. Email, SMS, and web chat send automatically; social media queues for approval.'
  }

  if (cmd === '/approve' && parts[1]) {
    const shortId = parts[1]
    const msg = first<{ id: string; sender_id: string; channel: string; agent_reply: string }>(
      `SELECT id, sender_id, channel, agent_reply FROM inbound_messages
       WHERE id LIKE ? AND status = 'awaiting_approval' LIMIT 1`,
      shortId + '%'
    )
    if (!msg) return `No pending message with ID starting "${shortId}".`
    const { sendReply } = await import('./channel-send.js')
    try {
      await sendReply({ channel: msg.channel as any, senderId: msg.sender_id, replyType: 'direct', externalId: null, subject: null, text: msg.agent_reply })
      run(`UPDATE inbound_messages SET status = 'resolved', agent_reply_sent = 1 WHERE id = ?`, msg.id)
      logEvent('operator_approved', msg.sender_id, `Reply approved for ${msg.id.slice(0,8)}`)
      return `Reply sent to ${msg.sender_id.slice(0,30)}.`
    } catch (e) {
      return `Failed to send: ${String(e).slice(0,120)}`
    }
  }

  if (cmd === '/reject' && parts[1]) {
    const shortId = parts[1]
    const msg = first<{ id: string }>(`SELECT id FROM inbound_messages WHERE id LIKE ? AND status = 'awaiting_approval' LIMIT 1`, shortId + '%')
    if (!msg) return `No pending message with ID starting "${shortId}".`
    run(`UPDATE inbound_messages SET status = 'resolved', agent_reply_sent = 0 WHERE id = ?`, msg.id)
    logEvent('operator_rejected', 'operator', `Reply rejected for ${msg.id.slice(0,8)}`)
    return 'Reply discarded.'
  }

  return await askClaude(text)
}
