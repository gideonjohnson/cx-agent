import { getConfig, setConfig } from '../lib/config.js'
import { logEvent } from '../lib/events.js'
import { handleOperatorCommand } from '../lib/operator-commands.js'

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
  // Telegram supports Markdown but operator-commands returns plain text — send as-is
  await tg('sendMessage', { chat_id: chatId, text })
}

export async function notifyOperator(text: string): Promise<void> {
  await sendTelegram(text).catch(() => {})
}

// ── Registration (first /start) ───────────────────────────────────────

async function handleRegistration(update: any): Promise<boolean> {
  const chatId = String(update.message?.chat?.id ?? '')
  const text   = update.message?.text ?? ''
  if (!chatId || getConfig('TELEGRAM_CHAT_ID')) return false

  if (text.startsWith('/start')) {
    setConfig('TELEGRAM_CHAT_ID', chatId)
    await tg('sendMessage', { chat_id: chatId, text: 'Registered! You are now the CX Agent operator.\n\nSend /help to see available commands.' })
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
        if (!registered) { await handleRegistration(update); continue }

        const chatId = String(update.message?.chat?.id ?? '')
        const text   = (update.message?.text ?? '').trim()
        if (!chatId || !text) continue

        if (chatId !== registered) {
          await tg('sendMessage', { chat_id: chatId, text: 'Unauthorized.' })
          continue
        }

        try {
          const reply = await handleOperatorCommand(text)
          await tg('sendMessage', { chat_id: chatId, text: reply })
        } catch (e) {
          console.error('[telegram] handler error:', e)
          await tg('sendMessage', { chat_id: chatId, text: 'Something went wrong. Check server logs.' })
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
