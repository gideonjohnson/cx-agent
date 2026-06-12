// Twilio Voice channel — TwiML gather/say loop
// Configure in Twilio Console: set webhook URL to http://YOUR_HOST:4749/webhook/voice
// Optional: set StatusCallback to http://YOUR_HOST:4749/webhook/voice/status

import { first, run, uid } from '../lib/db.js'
import { getConfig } from '../lib/config.js'
import { handleCustomerMessage } from '../agent/resolver.js'
import { logEvent } from '../lib/events.js'

const VOICE_PORT = parseInt(process.env.VOICE_PORT ?? '4749')

function xmlResponse(body: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}

function xml(tag: string, attrs: Record<string, string>, content = ''): string {
  const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')
  return `<${tag}${attrStr ? ' ' + attrStr : ''}>${content}</${tag}>`
}

function say(text: string): string {
  const lang = getConfig('BRAND_LANGUAGE') === 'fr' ? 'fr-FR' : 'en-GB'
  const voice = lang === 'fr-FR' ? 'Polly.Celine' : 'Polly.Amy'
  return xml('Say', { voice, language: lang }, escXml(text))
}

function gatherSpeech(actionUrl: string): string {
  const lang = getConfig('BRAND_LANGUAGE') === 'fr' ? 'fr-FR' : 'en-GB'
  const voice = lang === 'fr-FR' ? 'Polly.Celine' : 'Polly.Amy'
  return xml('Gather', { input: 'speech', action: actionUrl, speechTimeout: 'auto', language: lang, timeout: '8' },
    xml('Say', { voice, language: lang }, 'I\'m listening.')
  )
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function baseUrl(): string {
  return getConfig('VOICE_WEBHOOK_URL') ?? `http://localhost:${VOICE_PORT}`
}

function parseForm(body: string): Record<string, string> {
  const params: Record<string, string> = {}
  for (const pair of body.split('&')) {
    const [k, v] = pair.split('=')
    if (k) params[decodeURIComponent(k)] = decodeURIComponent((v ?? '').replace(/\+/g, ' '))
  }
  return params
}

function appendTranscript(callSid: string, role: string, content: string): void {
  const row = first<{ transcript_json: string | null }>(
    `SELECT transcript_json FROM voice_calls WHERE call_sid = ?`, callSid
  )
  const transcript: { role: string; content: string }[] = row?.transcript_json
    ? JSON.parse(row.transcript_json)
    : []
  transcript.push({ role, content })
  run(`UPDATE voice_calls SET transcript_json = ? WHERE call_sid = ?`, JSON.stringify(transcript), callSid)
}

export function startVoiceServer(): void {
  Bun.serve({
    port: VOICE_PORT,
    async fetch(req) {
      const url = new URL(req.url)
      const path = url.pathname
      const method = req.method

      // ── Inbound call ──────────────────────────────────────────────────────────
      if (method === 'POST' && path === '/webhook/voice') {
        const params = parseForm(await req.text())
        const callSid = params['CallSid'] ?? uid()
        const fromNumber = params['From'] ?? ''
        const toNumber = params['To'] ?? ''

        const customer = fromNumber
          ? first<{ id: string; name: string; email: string }>(
              `SELECT id, name, email FROM customers WHERE phone = ? AND account_status != 'deleted'`,
              fromNumber
            )
          : null

        const convId = uid()
        if (customer) {
          run(`INSERT INTO conversations (id, customer_id, channel, status) VALUES (?, ?, 'voice', 'open')`,
            convId, customer.id)
        }

        run(
          `INSERT INTO voice_calls (id, call_sid, from_number, to_number, customer_id, conversation_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          uid(), callSid, fromNumber, toNumber,
          customer?.id ?? null,
          customer ? convId : null
        )

        logEvent('voice_inbound', callSid, `From: ${fromNumber}`)

        const clientName = escXml(getConfig('CLIENT_NAME') ?? 'us')

        if (!customer) {
          return xmlResponse(
            say(`Thank you for calling ${clientName}. We couldn't find an account linked to your number. Please contact us via email or our website. Goodbye.`) +
            '<Hangup/>'
          )
        }

        const firstName = escXml(customer.name.split(' ')[0])
        const respondUrl = `${baseUrl()}/webhook/voice/respond?call_sid=${encodeURIComponent(callSid)}`

        return xmlResponse(
          say(`Thank you for calling ${clientName}. Hi ${firstName}, how can I help you today?`) +
          gatherSpeech(respondUrl) +
          `<Redirect>${baseUrl()}/webhook/voice/timeout?call_sid=${encodeURIComponent(callSid)}</Redirect>`
        )
      }

      // ── Customer spoke — run through agent ────────────────────────────────────
      if (method === 'POST' && path === '/webhook/voice/respond') {
        const callSid = url.searchParams.get('call_sid') ?? ''
        const params = parseForm(await req.text())
        const speech = params['SpeechResult'] ?? ''
        const confidence = parseFloat(params['Confidence'] ?? '0')
        const respondUrl = `${baseUrl()}/webhook/voice/respond?call_sid=${encodeURIComponent(callSid)}`

        if (!speech || confidence < 0.35) {
          return xmlResponse(
            say("Sorry, I didn't quite catch that. Could you repeat that?") +
            gatherSpeech(respondUrl) +
            `<Redirect>${baseUrl()}/webhook/voice/timeout?call_sid=${encodeURIComponent(callSid)}</Redirect>`
          )
        }

        const voiceCall = first<{ conversation_id: string | null }>(
          `SELECT conversation_id FROM voice_calls WHERE call_sid = ?`, callSid
        )

        if (!voiceCall?.conversation_id) {
          return xmlResponse(
            say("I'm sorry, I've lost context of our call. Please call back or reach us via our website. Goodbye.") +
            '<Hangup/>'
          )
        }

        appendTranscript(callSid, 'customer', speech)

        const conv = first<{ customer_id: string }>(
          `SELECT customer_id FROM conversations WHERE id = ?`, voiceCall.conversation_id
        )
        const customer = conv
          ? first<{ email: string }>(
              `SELECT email FROM customers WHERE id = ?`, conv.customer_id
            )
          : null

        if (!customer) {
          return xmlResponse(say("I'm having trouble locating your account. Goodbye.") + '<Hangup/>')
        }

        try {
          const result = await handleCustomerMessage(customer.email, speech, voiceCall.conversation_id)
          appendTranscript(callSid, 'agent', result.response)

          // Truncate for TTS — very long responses don't work well on voice
          const voiceResponse = result.response.slice(0, 500)

          if (result.escalated) {
            run(`UPDATE voice_calls SET status = 'escalated', ended_at = datetime('now') WHERE call_sid = ?`, callSid)
            return xmlResponse(say(voiceResponse) + '<Hangup/>')
          }

          if (result.resolved) {
            run(`UPDATE voice_calls SET status = 'resolved', ended_at = datetime('now') WHERE call_sid = ?`, callSid)
            const closingUrl = `${baseUrl()}/webhook/voice/respond?call_sid=${encodeURIComponent(callSid)}`
            return xmlResponse(
              say(voiceResponse) +
              say("Is there anything else I can help you with?") +
              gatherSpeech(closingUrl) +
              say("No problem. Have a great day. Goodbye.") +
              '<Hangup/>'
            )
          }

          return xmlResponse(
            say(voiceResponse) +
            gatherSpeech(respondUrl) +
            `<Redirect>${baseUrl()}/webhook/voice/timeout?call_sid=${encodeURIComponent(callSid)}</Redirect>`
          )
        } catch {
          return xmlResponse(
            say("I'm having a technical issue. Please try again or contact us via email. Goodbye.") +
            '<Hangup/>'
          )
        }
      }

      // ── No speech detected after gather ───────────────────────────────────────
      if (method === 'POST' && path === '/webhook/voice/timeout') {
        const callSid = url.searchParams.get('call_sid') ?? ''
        run(`UPDATE voice_calls SET status = 'completed', ended_at = datetime('now') WHERE call_sid = ?`, callSid)
        return xmlResponse(
          say("I haven't heard anything. If you need help, please call back or reach us via our website. Goodbye.") +
          '<Hangup/>'
        )
      }

      // ── Twilio StatusCallback ─────────────────────────────────────────────────
      if (method === 'POST' && path === '/webhook/voice/status') {
        const params = parseForm(await req.text())
        const callSid = params['CallSid'] ?? ''
        const duration = parseInt(params['CallDuration'] ?? '0')
        const callStatus = params['CallStatus'] ?? 'completed'
        run(
          `UPDATE voice_calls SET status = ?, duration_seconds = ?, ended_at = datetime('now')
           WHERE call_sid = ? AND ended_at IS NULL`,
          callStatus, duration, callSid
        )
        return new Response('OK')
      }

      return new Response('Not found', { status: 404 })
    },
  })

  console.log(`[CX Agent] Voice → port ${VOICE_PORT}`)
  console.log(`  Webhook: POST /webhook/voice`)
  console.log(`  StatusCallback: POST /webhook/voice/status`)
  console.log(`  Config key: VOICE_WEBHOOK_URL (set to your public URL)`)
}
