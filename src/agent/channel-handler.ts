import { first, run, uid } from '../lib/db.js'
import { getConfig } from '../lib/config.js'
import { logEvent } from '../lib/events.js'
import { handleCustomerMessage } from './resolver.js'
import { sanitizeCustomerInput } from '../lib/sanitize.js'
import { notifyOperator } from '../channels/telegram.js'
import { notifyOperatorWhatsApp } from '../channels/whatsapp.js'

// In-memory rate limiter: max 20 messages per conversation per 10 minutes
const messageTimestamps = new Map<string, number[]>()

function isRateLimited(convId: string): boolean {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000
  const maxPerWindow = 20
  const times = (messageTimestamps.get(convId) ?? []).filter(t => now - t < windowMs)
  times.push(now)
  messageTimestamps.set(convId, times)
  return times.length > maxPerWindow
}

export type Channel = 'email' | 'sms' | 'facebook' | 'instagram' | 'twitter' | 'web'

export interface MediaAttachment {
  type: 'image'
  source:
    | { type: 'url'; url: string }
    | { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string }
}

export interface InboundPayload {
  channel: Channel
  senderId: string
  senderName: string | null
  body: string
  replyType?: 'direct' | 'fb_comment'
  attachments?: MediaAttachment[]
  metadata?: {
    subject?: string
    threadId?: string
    externalId?: string
    postId?: string
  }
}

export interface ProcessResult {
  messageId: string
  customerId: string
  conversationId: string
  response: string
  escalated: boolean
  actionsTaken: string[]
  status: 'handled' | 'escalated' | 'error' | 'awaiting_approval'
  autoSend: boolean
}

function shouldAutoSend(channel: Channel): boolean {
  const mode = getConfig('REPLY_MODE') ?? 'approve_social'
  if (mode === 'auto') return true
  if (mode === 'approve_all') return false
  // approve_social: hold social channels for owner review
  return channel === 'email' || channel === 'sms' || channel === 'web'
}

function toContactEmail(channel: Channel, senderId: string): string {
  if (channel === 'email' || channel === 'web') return senderId.toLowerCase()
  return `${channel}:${senderId}@cx-agent.local`
}

export async function processInbound(payload: InboundPayload): Promise<ProcessResult> {
  const contactEmail = toContactEmail(payload.channel, payload.senderId)

  let customer = first<{ id: string; name: string }>(
    `SELECT id, name FROM customers WHERE lower(email) = ? AND account_status != 'deleted'`,
    contactEmail
  )

  if (!customer) {
    const newId = uid()
    const name = payload.senderName
      ?? (payload.channel === 'email' ? payload.senderId.split('@')[0] : payload.senderId)
    const phone = payload.channel === 'sms' ? payload.senderId : null
    run(
      `INSERT INTO customers (id, name, email, phone, tier, account_status) VALUES (?, ?, ?, ?, 'standard', 'active')`,
      newId, name, contactEmail, phone
    )
    logEvent('contact_auto_created', payload.senderId, `via ${payload.channel}`)
    customer = { id: newId, name }
  }

  let convId: string | null = null

  if (payload.metadata?.threadId) {
    const byId = first<{ id: string; status: string }>(
      `SELECT id, status FROM conversations WHERE id = ?`,
      payload.metadata.threadId
    )
    if (byId && byId.status !== 'escalated' && byId.status !== 'resolved') {
      convId = byId.id
    }
  }

  if (!convId) {
    const open = first<{ id: string }>(
      `SELECT id FROM conversations WHERE customer_id = ? AND channel = ? AND status = 'open' ORDER BY started_at DESC LIMIT 1`,
      customer.id, payload.channel
    )
    convId = open?.id ?? null
  }

  if (!convId) {
    convId = uid()
    // Non-web channels: sender identity IS the verification (email address, phone, PSID)
    const autoVerified = payload.channel !== 'web' ? 1 : 0
    run(
      `INSERT INTO conversations (id, customer_id, channel, status, identity_verified, verification_channel)
       VALUES (?, ?, ?, 'open', ?, ?)`,
      convId, customer.id, payload.channel, autoVerified, payload.channel
    )
  } else if (payload.channel !== 'web') {
    // Ensure existing non-web conversations are marked verified
    run(`UPDATE conversations SET identity_verified = 1 WHERE id = ? AND identity_verified = 0`, convId)
  }

  const replyType = payload.replyType ?? 'direct'
  const msgId = uid()
  run(
    `INSERT INTO inbound_messages (id, channel, sender_id, sender_name, customer_id, subject, body, reply_type, status, conversation_id, external_id, thread_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    msgId, payload.channel, payload.senderId, payload.senderName,
    customer.id, payload.metadata?.subject ?? null, payload.body,
    replyType, convId,
    payload.metadata?.externalId ?? null, payload.metadata?.threadId ?? null
  )

  // Sanitize before touching the LLM
  const { sanitized, injectionAttempt } = sanitizeCustomerInput(payload.body, convId)
  if (injectionAttempt) {
    logEvent('security_injection_attempt', payload.senderId, `channel: ${payload.channel}`)
  }

  // Rate limit check
  if (isRateLimited(convId)) {
    run(`UPDATE inbound_messages SET status = 'error', handled_at = datetime('now') WHERE id = ?`, msgId)
    logEvent('rate_limit', payload.senderId, `channel: ${payload.channel}`)
    return {
      messageId: msgId, customerId: customer.id, conversationId: convId,
      response: "You're sending messages very quickly — please wait a moment before trying again.",
      escalated: false, actionsTaken: [], status: 'error', autoSend: false,
    }
  }

  let result
  try {
    result = await handleCustomerMessage(contactEmail, sanitized, convId, payload.attachments)
  } catch (err) {
    run(`UPDATE inbound_messages SET status = 'error', handled_at = datetime('now') WHERE id = ?`, msgId)
    logEvent('channel_error', payload.channel, String(err).slice(0, 200))
    return {
      messageId: msgId, customerId: customer.id, conversationId: convId,
      response: '', escalated: false, actionsTaken: [], status: 'error', autoSend: false,
    }
  }

  const autoSend = !result.escalated && shouldAutoSend(payload.channel)
  const status: ProcessResult['status'] = result.escalated
    ? 'escalated'
    : autoSend ? 'handled' : 'awaiting_approval'

  run(
    `UPDATE inbound_messages SET agent_reply = ?, agent_reply_sent = 0, agent_action = ?, status = ?, handled_at = datetime('now') WHERE id = ?`,
    result.response, result.actionsTaken?.join(', ') ?? null, status, msgId
  )

  if (status === 'escalated') {
    const alert = `Escalation [${payload.channel}]\nFrom: ${payload.senderId.slice(0,40)}\n${payload.body.slice(0,120)}`
    notifyOperator(alert).catch(() => {})
    notifyOperatorWhatsApp(alert).catch(() => {})
  } else if (status === 'awaiting_approval') {
    const alert = `Approval needed [${payload.channel}]\nFrom: ${payload.senderId.slice(0,40)}\nReply /approve ${msgId.slice(0,8)} to send.`
    notifyOperator(alert).catch(() => {})
    notifyOperatorWhatsApp(alert).catch(() => {})
  }

  return {
    messageId: msgId, customerId: customer.id, conversationId: convId,
    response: result.response, escalated: result.escalated ?? false,
    actionsTaken: result.actionsTaken ?? [], status, autoSend,
  }
}
