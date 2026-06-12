import { getConfig } from '../lib/config.js'
import { logEvent } from '../lib/events.js'
import { handleOperatorCommand } from '../lib/operator-commands.js'

// ── Outbound ──────────────────────────────────────────────────────────

export async function sendWhatsApp(to: string, text: string): Promise<void> {
  const sid   = getConfig('TWILIO_ACCOUNT_SID')
  const auth  = getConfig('TWILIO_AUTH_TOKEN')
  const from  = getConfig('TWILIO_WHATSAPP_NUMBER')
  if (!sid || !auth || !from) return

  const waTo   = to.startsWith('whatsapp:')   ? to   : `whatsapp:${to}`
  const waFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`

  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,
      },
      body: new URLSearchParams({ From: waFrom, To: waTo, Body: text }).toString(),
    })
  } catch (e) {
    logEvent('whatsapp_error', 'send', String(e).slice(0, 200))
  }
}

export async function notifyOperatorWhatsApp(text: string): Promise<void> {
  const operatorNumber = getConfig('WHATSAPP_OPERATOR_NUMBER')
  if (!operatorNumber) return
  await sendWhatsApp(operatorNumber, text).catch(() => {})
}

// ── Inbound webhook handler (called from web.ts) ──────────────────────

export async function handleWhatsAppMessage(from: string, body: string): Promise<void> {
  const operatorNumber = getConfig('WHATSAPP_OPERATOR_NUMBER')
  if (!operatorNumber) return

  // Strip whatsapp: prefix for comparison
  const fromClean     = from.replace(/^whatsapp:/i, '')
  const operatorClean = operatorNumber.replace(/^whatsapp:/i, '')

  if (fromClean !== operatorClean) {
    // Not from the operator — silently ignore (WhatsApp is operator-only channel)
    logEvent('whatsapp_ignored', from, 'Message from non-operator number ignored')
    return
  }

  try {
    const reply = await handleOperatorCommand(body.trim())
    await sendWhatsApp(from, reply)
  } catch (e) {
    console.error('[whatsapp] handler error:', e)
    await sendWhatsApp(from, 'Something went wrong. Check server logs.')
  }
}
