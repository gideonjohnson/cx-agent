import { getConfig, setConfig } from '../lib/config.js'
import { first, all, run } from '../lib/db.js'
import { logEvent } from '../lib/events.js'
import Anthropic from '@anthropic-ai/sdk'

const TG = (token: string) => `https://api.telegram.org/bot${token}`
let lastUpdateId = 0

// ── Telegram API ─────────────────────────────────────────────────────

async function tg(method: string, body?: Record<string, unknown>): Promise<any> {
  const token = getConfig('TELEGRAM_BOT_TOKEN')
  if (!token) return null
  try {
    const url = `${TG(token)}/${method}`
    const res = body
      ? await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch(url)
    const json: any = await res.json()
    return json.ok ? json.result : null
  } catch { return null }
}

export async function sendTelegram(text: string): Promise<void> {
  const chatId = getConfig('TELEGRAM_CHAT_ID')
  if (!chatId) return
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' })
}

// Called by other modules to push alerts to the operator
export async function notifyOperator(text: string): Promise<void> {
  await sendTelegram(text).catch(() => {})
}

// ── State helpers ─────────────────────────────────────────────────────

function statusSummary(): string {
  const open    = first<{ c: number }>(`SELECT count(*) c FROM conversations WHERE status NOT IN ('resolved','closed')`)?.c ?? 0
  const esc     = first<{ c: number }>(`SELECT count(*) c FROM conversations WHERE status = 'escalated'`)?.c ?? 0
  const pending = first<{ c: number }>(`SELECT count(*) c FROM inbound_messages WHERE status = 'awaiting_approval'`)?.c ?? 0
  const today   = first<{ c: number }>(`SELECT count(*) c FROM conversations WHERE date(updated_at) = date('now')`)?.c ?? 0
  const mode    = getConfig('REPLY_MODE') ?? 'approve_social'
  return [
    '*CX Agent — Status*',
    `📬 Open: *${open}*   🚨 Escalated: *${esc}*   ⏳ Pending: *${pending}*   ✅ Today: *${today}*`,
    `⚙️ Reply mode: \`${mode}\``,
  ].join('\n')
}

function inboxSummary(): string {
  const rows = all<{ id: string; sender_id: string; channel: string; body: string; created_at: string }>(
    `SELECT id, sender_id, channel, body, created_at FROM inbound_messages
     WHERE status NOT IN ('resolved','closed') ORDER BY created_at DESC LIMIT 5`
  )
  if (!rows.length) return '✅ Inbox is empty.'
  return '*Latest messages:*\n' + rows.map(r =>
    `• \`${r.id.slice(0,8)}\` [${r.channel}] ${r.sender_id.slice(0,24)} — ${r.body.slice(0,60).replace(/\n/g,' ')}`
  ).join('\n')
}

function escalationsSummary(): string {
  const rows = all<{ id: string; customer_id: string; updated_at: string }>(
    `SELECT c.id, c.customer_id, c.updated_at FROM conversations c
     WHERE c.status = 'escalated' ORDER BY c.updated_at DESC LIMIT 10`
  )
  if (!rows.length) return '✅ No open escalations.'
  return '*Open escalations:*\n' + rows.map(r =>
    `• \`${r.id.slice(0,8)}\` customer \`${r.customer_id.slice(0,8)}\` — ${r.updated_at.slice(0,16)}`
  ).join('\n')
}

function pendingSummary(): string {
  const rows = all<{ id: string; sender_id: string; channel: string; body: string; agent_reply: string }>(
    `SELECT id, sender_id, channel, body, agent_reply FROM inbound_messages
     WHERE status = 'awaiting_approval' ORDER BY created_at ASC LIMIT 5`
  )
  if (!rows.length) return '✅ No pending approvals.'
  return '*Pending approvals:*\n\n' + rows.map(r => [
    `\`${r.id.slice(0,8)}\` [${r.channel}] ${r.sender_id.slice(0,30)}`,
    `_Customer:_ ${r.body.slice(0,80).replace(/\n/g,' ')}`,
    `_Reply:_ ${(r.agent_reply ?? '').slice(0,100).replace(/\n/g,' ')}`,
  ].join('\n')).join('\n\n')
}

// ── Command handler ──────────────────────────────────────────────────

async function handle(text: string): Promise<string> {
  const parts = text.trim().split(/\s+/)
  const cmd = parts[0].toLowerCase()

  if (cmd === '/start' || cmd === '/help') {
    return [
      '*CX Agent — Operator Bot*',
      '',
      '`/status` — Dashboard overview',
      '`/inbox` — Latest 5 messages',
      '`/escalations` — Open escalations',
      '`/pending` — Replies awaiting approval',
      '`/approve <id>` — Send a pending reply',
      '`/reject <id>` — Discard a pending reply',
      '`/pause` — Pause all auto-replies',
      '`/resume` — Resume auto-replies (email/SMS/web: auto)',
      '',
      'Or ask anything in plain English.',
    ].join('\n')
  }

  if (cmd === '/status')      return statusSummary()
  if (cmd === '/inbox')       return inboxSummary()
  if (cmd === '/escalations') return escalationsSummary()
  if (cmd === '/pending')     return pendingSummary()

  if (cmd === '/pause') {
    setConfig('REPLY_MODE', 'approve_all')
    return '⏸ Auto-replies paused. All responses will queue for your approval.'
  }

  if (cmd === '/resume') {
    setConfig('REPLY_MODE', 'approve_social')
    return '▶️ Auto-replies resumed. Email, SMS, and web chat send automatically; social media queues for approval.'
  }

  if (cmd === '/approve' && parts[1]) {
    const shortId = parts[1]
    const msg = first<{ id: string; sender_id: string; channel: string; agent_reply: string }>(
      `SELECT id, sender_id, channel, agent_reply FROM inbound_messages
       WHERE id LIKE ? AND status = 'awaiting_approval' LIMIT 1`,
      shortId + '%'
    )
    if (!msg) return `❌ No pending message with ID starting \`${shortId}\`.`
    const { sendReply } = await import('../lib/channel-send.js')
    try {
      await sendReply({ channel: msg.channel as any, senderId: msg.sender_id, replyType: 'direct', externalId: null, subject: null, text: msg.agent_reply })
      run(`UPDATE inbound_messages SET status = 'resolved', agent_reply_sent = 1 WHERE id = ?`, msg.id)
      logEvent('telegram_approved', msg.sender_id, `Operator approved reply ${msg.id.slice(0,8)}`)
      return `✅ Reply sent to \`${msg.sender_id.slice(0,30)}\`.`
    } catch (e) {
      return `❌ Failed to send: ${String(e).slice(0,120)}`
    }
  }

  if (cmd === '/reject' && parts[1]) {
    const shortId = parts[1]
    const msg = first<{ id: string }>(`SELECT id FROM inbound_messages WHERE id LIKE ? AND status = 'awaiting_approval' LIMIT 1`, shortId + '%')
    if (!msg) return `❌ No pending message with ID starting \`${shortId}\`.`
    run(`UPDATE inbound_messages SET status = 'resolved', agent_reply_sent = 0 WHERE id = ?`, msg.id)
    logEvent('telegram_rejected', 'operator', `Operator rejected reply ${msg.id.slice(0,8)}`)
    return `🗑 Reply discarded.`
  }

  // Free-form question → ask Claude with live context
  return await askClaude(text)
}

async function askClaude(question: string): Promise<string> {
  const apiKey = getConfig('ANTHROPIC_API_KEY')
  if (!apiKey) return '⚠️ No Anthropic API key configured.'
  const context = [statusSummary(), inboxSummary(), escalationsSummary()].join('\n\n')
  try {
    const client = new Anthropic({ apiKey })
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are the CX Agent operator assistant. Answer the operator's question concisely based on the live system state below. Use plain text only — no markdown. Keep answers under 200 words.\n\nSystem state:\n${context}`,
      messages: [{ role: 'user', content: question }],
    })
    return (res.content[0] as any).text ?? 'No response.'
  } catch (e) {
    return `⚠️ Claude error: ${String(e).slice(0,100)}`
  }
}

// ── Registration (first /start) ───────────────────────────────────────

async function handleRegistration(update: any): Promise<boolean> {
  const chatId = String(update.message?.chat?.id ?? '')
  const text   = update.message?.text ?? ''
  if (!chatId) return false
  if (getConfig('TELEGRAM_CHAT_ID')) return false  // already registered

  if (text.startsWith('/start')) {
    setConfig('TELEGRAM_CHAT_ID', chatId)
    await tg('sendMessage', {
      chat_id: chatId,
      text: '✅ *Registered!* You are now the CX Agent operator.\n\nSend `/help` to see available commands.',
      parse_mode: 'Markdown',
    })
    logEvent('telegram_registered', chatId, 'Operator Telegram chat registered')
    return true
  }

  await tg('sendMessage', { chat_id: chatId, text: 'Send /start to register as the CX Agent operator.' })
  return true
}

// ── Long-poll loop ────────────────────────────────────────────────────

export async function startTelegramPolling(): Promise<void> {
  const token = getConfig('TELEGRAM_BOT_TOKEN')
  if (!token) {
    console.log('[telegram] No TELEGRAM_BOT_TOKEN — bot disabled')
    return
  }

  const me = await tg('getMe')
  if (!me) {
    console.error('[telegram] Invalid bot token or network unreachable')
    return
  }
  console.log(`[telegram] Bot @${me.username} online`)

  const poll = async () => {
    const t = getConfig('TELEGRAM_BOT_TOKEN')
    if (!t) return

    try {
      const updates: any[] = await tg('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 25,
        allowed_updates: ['message'],
      }) ?? []

      for (const update of updates) {
        lastUpdateId = update.update_id

        const registered = getConfig('TELEGRAM_CHAT_ID')
        if (!registered) {
          await handleRegistration(update)
          continue
        }

        const chatId = String(update.message?.chat?.id ?? '')
        const text   = (update.message?.text ?? '').trim()
        if (!chatId || !text) continue

        if (chatId !== registered) {
          await tg('sendMessage', { chat_id: chatId, text: '⛔ Unauthorized.' })
          continue
        }

        try {
          const reply = await handle(text)
          await tg('sendMessage', { chat_id: chatId, text: reply, parse_mode: 'Markdown' })
        } catch (e) {
          console.error('[telegram] handler error:', e)
          await tg('sendMessage', { chat_id: chatId, text: '⚠️ Something went wrong. Check server logs.' })
        }
      }
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('ECONNREFUSED') && !msg.includes('ENOTFOUND') && !msg.includes('fetch failed')) {
        console.error('[telegram] poll error:', msg)
      }
    }

    setTimeout(poll, 500)
  }

  poll()
}
