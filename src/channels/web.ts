import { first, run, all } from '../lib/db.js'
import { getConfig } from '../lib/config.js'
import { logEvent } from '../lib/events.js'
import { processInbound, type Channel, type MediaAttachment } from '../agent/channel-handler.js'
import { sendReply } from '../lib/channel-send.js'
import { getChatHtml, getWidgetJs } from './chat-page.js'

const PORT = parseInt(process.env.DASHBOARD_PORT ?? '4747') + 1

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const { pathname: path, method } = { pathname: url.pathname, method: req.method }

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    // ── Website chat widget ─────────────────────────────────────────────────

    if (path === '/chat' && method === 'GET') {
      return new Response(getChatHtml(getConfig('CLIENT_NAME') ?? 'Support'), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    if (path === '/widget.js' && method === 'GET') {
      return new Response(getWidgetJs(PORT), {
        headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Auto-accept any email — create contact if new
    if (path === '/api/verify' && method === 'POST') {
      const body = await req.json().catch(() => null)
      const email = String(body?.email ?? '').trim().toLowerCase()
      if (!email || !email.includes('@')) return json({ found: false, error: 'Valid email required' }, 400)

      const existing = first<{ name: string }>(
        `SELECT name FROM customers WHERE lower(email) = ? AND account_status != 'deleted'`, email
      )
      const name = existing?.name ?? email.split('@')[0]
      return json({ found: true, name })
    }

    if (path === '/api/chat' && method === 'POST') {
      const body = await req.json().catch(() => null)
      if (!body?.email || !body?.message) return json({ error: 'email and message required' }, 400)
      const { email, message, conversation_id } = body as { email: string; message: string; conversation_id?: string }

      if (conversation_id) {
        const conv = first<{ status: string }>(`SELECT status FROM conversations WHERE id = ?`, conversation_id)
        if (conv?.status === 'escalated') {
          return json({ error: 'Escalated to a human agent', escalated: true }, 409)
        }
      }

      const result = await processInbound({
        channel: 'web',
        senderId: email,
        senderName: null,
        body: message,
        metadata: conversation_id ? { threadId: conversation_id } : undefined,
      })

      return json({ ...result, conversation_id: result.conversationId })
    }

    // ── Twilio SMS webhook ──────────────────────────────────────────────────

    if (path === '/webhook/sms' && method === 'POST') {
      const form = new URLSearchParams(await req.text().catch(() => ''))
      const from = form.get('From') ?? ''
      const body = form.get('Body') ?? ''

      const twiml = () =>
        new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
          headers: { 'Content-Type': 'text/xml' },
        })

      if (!from || !body) return twiml()

      try {
        const result = await processInbound({
          channel: 'sms',
          senderId: from,
          senderName: null,
          body,
          metadata: { externalId: form.get('MessageSid') ?? undefined },
        })

        if (result.autoSend && result.response) {
          await sendReply({ channel: 'sms', senderId: from, replyType: 'direct', externalId: null, subject: null, text: result.response })
          run(`UPDATE inbound_messages SET agent_reply_sent = 1 WHERE id = ?`, result.messageId)
        }
      } catch (e) {
        logEvent('sms_error', from, String(e).slice(0, 200))
      }

      return twiml()
    }

    // ── Facebook / Instagram webhook ────────────────────────────────────────

    if (path === '/webhook/facebook' && method === 'GET') {
      const mode      = url.searchParams.get('hub.mode')
      const token     = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')
      const verifyToken = getConfig('FB_VERIFY_TOKEN')
      if (mode === 'subscribe' && verifyToken && token === verifyToken && challenge) {
        return new Response(challenge)
      }
      return new Response('Forbidden', { status: 403 })
    }

    if (path === '/webhook/facebook' && method === 'POST') {
      const body = await req.json().catch(() => null)
      if (!body) return new Response('EVENT_RECEIVED')

      const channel: Channel = body.object === 'instagram' ? 'instagram' : 'facebook'

      if (body.object === 'page' || body.object === 'instagram') {
        for (const entry of (body.entry ?? [])) {

          // DMs
          for (const msg of (entry.messaging ?? [])) {
            const senderId = msg.sender?.id
            const text = msg.message?.text
            if (!senderId || !text) continue

            // Meta 24h messaging window: can only initiate replies within 24h of last inbound
            const lastInbound = first<{ created_at: string }>(
              `SELECT created_at FROM inbound_messages WHERE sender_id = ? AND channel = ? ORDER BY created_at DESC LIMIT 1`,
              senderId, channel
            )
            const withinWindow = !lastInbound || (Date.now() - new Date(lastInbound.created_at).getTime() < 24 * 60 * 60 * 1000)

            // Extract image attachments from Facebook message
            const fbAttachments: MediaAttachment[] = []
            for (const att of (msg.message?.attachments ?? [])) {
              if ((att.type === 'image' || att.type === 'file') && att.payload?.url) {
                fbAttachments.push({ type: 'image', source: { type: 'url', url: att.payload.url } })
              }
            }
            const msgBody = text || (fbAttachments.length ? '[Customer sent an image]' : '')
            if (!msgBody) continue

            try {
              const result = await processInbound({
                channel, senderId, senderName: null, body: msgBody,
                replyType: 'direct',
                attachments: fbAttachments.length ? fbAttachments : undefined,
                metadata: { externalId: msg.message?.mid, threadId: senderId },
              })
              // Only auto-send DM replies within the 24h window
              if (result.autoSend && result.response && withinWindow) {
                await sendReply({ channel, senderId, replyType: 'direct', externalId: null, subject: null, text: result.response })
                run(`UPDATE inbound_messages SET agent_reply_sent = 1 WHERE id = ?`, result.messageId)
              } else if (!withinWindow && result.response) {
                // Outside window — mark for human review, can't send template-less message
                run(`UPDATE inbound_messages SET status = 'awaiting_approval', agent_reply = ? WHERE id = ?`,
                  result.response + '\n\n[NOTE: Outside Meta 24h window — human must initiate new thread]',
                  result.messageId
                )
                logEvent('meta_window_expired', senderId, `Outside 24h reply window for ${channel}`)
              }
            } catch (e) { logEvent('facebook_error', senderId, String(e).slice(0, 200)) }
          }

          // Post comments
          for (const change of (entry.changes ?? [])) {
            if (change.field !== 'feed' && change.field !== 'comments') continue
            const v = change.value
            if (v?.item !== 'comment' || !v?.message) continue
            const senderId  = v.from?.id ?? 'unknown'
            const commentId = v.comment_id
            try {
              const result = await processInbound({
                channel, senderId, senderName: v.from?.name ?? null, body: v.message,
                replyType: 'fb_comment',
                metadata: { externalId: commentId, postId: v.post_id },
              })
              if (result.autoSend && result.response && commentId) {
                await sendReply({ channel, senderId, replyType: 'fb_comment', externalId: commentId, subject: null, text: result.response })
                run(`UPDATE inbound_messages SET agent_reply_sent = 1 WHERE id = ?`, result.messageId)
              }
            } catch (e) { logEvent('facebook_error', senderId, String(e).slice(0, 200)) }
          }
        }
      }

      return new Response('EVENT_RECEIVED')
    }

    if (path === '/api/health') return json({ status: 'ok', port: PORT, time: new Date().toISOString() })

    return json({ error: 'Not found' }, 404)
  },
})

console.log(`[CX Agent] Channel API → http://localhost:${PORT}`)
console.log(`  Website widget : GET /widget.js  (embed on client's website)`)
console.log(`  SMS webhook    : POST /webhook/sms  (configure at console.twilio.com)`)
console.log(`  Facebook/IG    : POST /webhook/facebook  (configure at developers.facebook.com)`)
