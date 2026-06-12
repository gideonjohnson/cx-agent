import { all, first, run, uid } from '../lib/db.js'
import { logEvent } from '../lib/events.js'
import { getMetrics } from '../analytics/metrics.js'
import { getAllAuthorityConfig } from '../lib/authority.js'
import { getConfig, setConfig, validateAnthropicKey } from '../lib/config.js'
import { resetClient } from '../lib/client.js'
import { dashboardHtml } from './ui.js'
import { getSetupHtml } from './setup.js'
import { getSettingsHtml } from './settings.js'

const PORT = parseInt(process.env.DASHBOARD_PORT ?? '4747')

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

function isConfigured(): boolean {
  return Boolean(getConfig('CLIENT_NAME'))
}

function getState() {
  const metrics = getMetrics(30)

  const openEscalations = all(
    `SELECT e.*, c.name as customer_name, c.email as customer_email, c.tier as customer_tier
     FROM escalations e
     LEFT JOIN conversations conv ON conv.id = e.conversation_id
     LEFT JOIN customers c ON c.id = conv.customer_id
     WHERE e.resolved_at IS NULL ORDER BY e.created_at DESC LIMIT 50`
  )

  const activeConversations = all(
    `SELECT conv.id, conv.status, conv.turn_count, conv.started_at, conv.last_activity_at,
            conv.escalated, c.name as customer_name, c.email as customer_email, c.tier as customer_tier
     FROM conversations conv
     JOIN customers c ON c.id = conv.customer_id
     WHERE conv.status = 'open' ORDER BY conv.last_activity_at DESC LIMIT 30`
  )

  const recentConversations = all(
    `SELECT conv.id, conv.status, conv.turn_count, conv.started_at, conv.resolved_at,
            conv.resolution_method, conv.escalated, c.name as customer_name, c.tier as customer_tier
     FROM conversations conv
     JOIN customers c ON c.id = conv.customer_id
     ORDER BY conv.started_at DESC LIMIT 40`
  )

  const recentEvents = all(`SELECT * FROM events ORDER BY created_at DESC LIMIT 40`)
  const authorityConfig = getAllAuthorityConfig()
  const knowledgeBase = all(`SELECT id, category, title, content, source, active, usage_count, created_at FROM knowledge_base ORDER BY category, title`)
  const customers = all(`SELECT id, name, email, tier, account_status FROM customers WHERE account_status != 'deleted' ORDER BY name`)

  const inbox = all(`
    SELECT m.id, m.channel, m.sender_id, m.sender_name, m.subject, m.body, m.status,
           m.agent_reply, m.agent_reply_sent, m.created_at, m.handled_at,
           c.name as customer_name
    FROM inbound_messages m
    LEFT JOIN customers c ON c.id = m.customer_id
    ORDER BY m.created_at DESC LIMIT 30
  `)

  const pendingApprovals = all(`
    SELECT m.id, m.channel, m.sender_id, m.sender_name, m.subject, m.body,
           m.agent_reply, m.reply_type, m.external_id, m.created_at, c.name as customer_name
    FROM inbound_messages m
    LEFT JOIN customers c ON c.id = m.customer_id
    WHERE m.status = 'awaiting_approval'
    ORDER BY m.created_at ASC
  `)

  const channelPort = (parseInt(process.env.DASHBOARD_PORT ?? '4747')) + 1
  const channelStatus = {
    email: {
      configured: Boolean(getConfig('IMAP_HOST') ?? getConfig('SMTP_HOST')),
      user: getConfig('IMAP_USER') ?? getConfig('SMTP_USER') ?? null,
    },
    sms: {
      configured: Boolean(getConfig('TWILIO_ACCOUNT_SID')),
      phone: getConfig('TWILIO_PHONE_NUMBER') ?? null,
    },
    facebook: { configured: Boolean(getConfig('FB_PAGE_ACCESS_TOKEN')) },
    instagram: { configured: Boolean(getConfig('FB_PAGE_ACCESS_TOKEN')) },
    web: { configured: true, port: channelPort },
  }

  return {
    metrics,
    openEscalations,
    activeConversations,
    recentConversations,
    recentEvents,
    authorityConfig,
    knowledgeBase,
    customers,
    inbox,
    pendingApprovals,
    channelStatus,
    replyMode: getConfig('REPLY_MODE') ?? 'approve_social',
    clientName: getConfig('CLIENT_NAME') ?? 'CX Agent',
    chatPort: channelPort,
    config: {
      BRAND_TONE:                          getConfig('BRAND_TONE') ?? 'professional',
      BRAND_EMOJI_POLICY:                  getConfig('BRAND_EMOJI_POLICY') ?? 'none',
      BRAND_LANGUAGE:                      getConfig('BRAND_LANGUAGE') ?? 'en',
      ESCALATION_SLA_HOURS:                getConfig('ESCALATION_SLA_HOURS') ?? '2',
      REQUIRE_WEB_IDENTITY_VERIFICATION:   getConfig('REQUIRE_WEB_IDENTITY_VERIFICATION') ?? 'off',
    },
    integrations: all(`SELECT id, name, description, url, method, auth_type, active FROM integrations ORDER BY name`),
    learningQueue: all(`
      SELECT lq.id, lq.customer_message, lq.agent_response, lq.improvement_type, lq.trigger, lq.status, lq.created_at,
             c.name as customer_name
      FROM learning_queue lq
      LEFT JOIN conversations conv ON conv.id = lq.conversation_id
      LEFT JOIN customers c ON c.id = conv.customer_id
      WHERE lq.status = 'pending' ORDER BY lq.created_at DESC LIMIT 20
    `),
  }
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    if (method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': 'Content-Type' } })
    }

    // ── Setup routes ──────────────────────────────────────────────────────────

    if (path === '/setup') {
      return new Response(getSetupHtml(), { headers: { 'Content-Type': 'text/html' } })
    }

    if (path === '/api/setup/status' && method === 'GET') {
      return json({
        configured: isConfigured(),
        client_name: getConfig('CLIENT_NAME') ?? null,
        client_email: getConfig('CLIENT_EMAIL') ?? null,
        has_api_key: Boolean(getConfig('ANTHROPIC_API_KEY')),
        smtp_user: getConfig('SMTP_USER') ?? null,
        has_smtp: Boolean(getConfig('SMTP_USER') && getConfig('SMTP_PASS')),
      })
    }

    if (path === '/api/setup/config' && method === 'POST') {
      const body = await req.json().catch(() => ({})) as Record<string, string>
      const key = String(body.key ?? '')
      const value = String(body.value ?? '')
      const allowed = [
        'CLIENT_NAME', 'CLIENT_EMAIL', 'ANTHROPIC_API_KEY',
        'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'DASHBOARD_PORT',
        'IMAP_HOST', 'IMAP_PORT', 'IMAP_USER', 'IMAP_PASS', 'IMAP_TLS',
        'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
        'FB_PAGE_ACCESS_TOKEN', 'FB_VERIFY_TOKEN', 'FB_PAGE_ID',
        'REPLY_MODE', 'BRAND_TONE', 'BRAND_EMOJI_POLICY', 'BRAND_LANGUAGE',
        'ESCALATION_SLA_HOURS', 'REQUIRE_WEB_IDENTITY_VERIFICATION',
      ]
      if (!allowed.includes(key)) return json({ error: 'Unknown config key' }, 400)
      if (!value) return json({ error: 'Value required' }, 400)
      setConfig(key, value)
      if (key === 'ANTHROPIC_API_KEY') resetClient()
      return json({ success: true })
    }

    if (path === '/api/setup/skip' && method === 'POST') {
      setConfig('CLIENT_NAME', 'My Business')
      return json({ success: true })
    }

    if (path === '/api/setup/validate-key' && method === 'POST') {
      const body = await req.json().catch(() => ({})) as Record<string, string>
      const key = String(body.key ?? '')
      if (!key) return json({ valid: false, error: 'No key provided' })
      const result = await validateAnthropicKey(key)
      return json(result)
    }

    // ── Settings page ─────────────────────────────────────────────────────────

    if (path === '/settings') {
      return new Response(getSettingsHtml(), { headers: { 'Content-Type': 'text/html' } })
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    if (path === '/' || path === '/dashboard') {
      if (!isConfigured()) {
        return new Response(null, { status: 302, headers: { Location: '/setup' } })
      }
      return new Response(dashboardHtml(), { headers: { 'Content-Type': 'text/html' } })
    }

    if (path === '/api/state' && method === 'GET') return json(getState())

    // ── Conversations ─────────────────────────────────────────────────────────

    if (path.match(/^\/api\/conversations\/[\w]+$/) && method === 'GET') {
      const convId = path.split('/')[3]
      const conversation = first(`SELECT conv.*, c.name as customer_name, c.email as customer_email, c.tier as customer_tier
        FROM conversations conv JOIN customers c ON c.id = conv.customer_id WHERE conv.id = ?`, convId)
      if (!conversation) return json({ error: 'Not found' }, 404)

      const messages = all(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`, convId)
      const actions = all(`SELECT * FROM actions_log WHERE conversation_id = ? ORDER BY created_at ASC`, convId)
      const escalation = first(`SELECT * FROM escalations WHERE conversation_id = ?`, convId)

      return json({ conversation, messages, actions, escalation })
    }

    // ── Escalations ───────────────────────────────────────────────────────────

    if (path.match(/^\/api\/escalations\/[\w]+\/resolve$/) && method === 'POST') {
      const eid = path.split('/')[3]
      const body = await req.json().catch(() => ({})) as Record<string, string>
      run(`UPDATE escalations SET resolved_at = datetime('now'), resolution_notes = ? WHERE id = ?`,
        body['notes'] ?? 'Resolved via dashboard', eid)

      const esc = first<{ conversation_id: string }>(`SELECT conversation_id FROM escalations WHERE id = ?`, eid)
      if (esc) {
        run(`UPDATE conversations SET status = 'resolved', resolved_at = datetime('now'), resolution_method = 'human_resolved' WHERE id = ?`, esc.conversation_id)
      }

      logEvent('escalation_resolved', eid, body['notes'] ?? 'Resolved via dashboard')
      return json({ escalation_id: eid, status: 'resolved' })
    }

    if (path.match(/^\/api\/escalations\/[\w]+\/assign$/) && method === 'POST') {
      const eid = path.split('/')[3]
      const body = await req.json().catch(() => ({})) as Record<string, string>
      run(`UPDATE escalations SET assigned_to = ? WHERE id = ?`, body['agent'], eid)
      return json({ status: 'assigned' })
    }

    // ── CSAT ──────────────────────────────────────────────────────────────────

    if (path.match(/^\/api\/conversations\/[\w]+\/csat$/) && method === 'POST') {
      const convId = path.split('/')[3]
      const body = await req.json() as { score: number; comment?: string }
      run(`INSERT INTO csat_scores (id, conversation_id, score, comment) VALUES (?, ?, ?, ?)`,
        uid(), convId, body.score, body.comment ?? null)
      logEvent('csat_received', convId, `Score: ${body.score}`)

      // Low CSAT → flag last agent turn for learning review
      if (body.score <= 2) {
        const lastTurn = first<{ content: string }>(
          `SELECT content FROM messages WHERE conversation_id = ? AND role = 'agent' ORDER BY created_at DESC LIMIT 1`, convId
        )
        const lastCustomer = first<{ content: string }>(
          `SELECT content FROM messages WHERE conversation_id = ? AND role = 'customer' ORDER BY created_at DESC LIMIT 1`, convId
        )
        if (lastTurn && lastCustomer) {
          run(
            `INSERT INTO learning_queue (id, conversation_id, customer_message, agent_response, improvement_type, trigger)
             VALUES (?, ?, ?, ?, 'phrasing', ?)`,
            uid(), convId, lastCustomer.content, lastTurn.content, `low_csat_${body.score}`
          )
        }
      }
      return json({ status: 'recorded' })
    }

    // ── Knowledge base CRUD ───────────────────────────────────────────────────

    if (path === '/api/kb' && method === 'GET') {
      return json(all(`SELECT id, category, title, content, source, active, usage_count, created_at FROM knowledge_base ORDER BY category, title`))
    }

    if (path === '/api/kb' && method === 'POST') {
      const body = await req.json() as { category: string; title: string; content: string; source?: string }
      if (!body.category || !body.title || !body.content) return json({ error: 'category, title, content required' }, 400)
      const id = uid()
      run(`INSERT INTO knowledge_base (id, category, title, content, source, active) VALUES (?, ?, ?, ?, ?, 1)`,
        id, body.category.trim(), body.title.trim(), body.content.trim(), body.source?.trim() ?? 'manual')
      logEvent('kb_created', body.title, `Category: ${body.category}`)
      return json({ id, status: 'created' })
    }

    if (path.match(/^\/api\/kb\/[\w]+$/) && method === 'PUT') {
      const id = path.split('/')[3]
      const body = await req.json() as { category?: string; title?: string; content?: string; source?: string; active?: boolean }
      const entry = first(`SELECT id FROM knowledge_base WHERE id = ?`, id)
      if (!entry) return json({ error: 'Not found' }, 404)
      run(`UPDATE knowledge_base SET
             category = COALESCE(?, category),
             title    = COALESCE(?, title),
             content  = COALESCE(?, content),
             source   = COALESCE(?, source),
             active   = COALESCE(?, active)
           WHERE id = ?`,
        body.category ?? null, body.title ?? null, body.content ?? null,
        body.source ?? null, body.active != null ? (body.active ? 1 : 0) : null, id)
      logEvent('kb_updated', id, body.title ?? 'entry updated')
      return json({ id, status: 'updated' })
    }

    if (path.match(/^\/api\/kb\/[\w]+$/) && method === 'DELETE') {
      const id = path.split('/')[3]
      const entry = first<{ title: string }>(`SELECT title FROM knowledge_base WHERE id = ?`, id)
      if (!entry) return json({ error: 'Not found' }, 404)
      run(`DELETE FROM knowledge_base WHERE id = ?`, id)
      logEvent('kb_deleted', id, entry.title)
      return json({ id, status: 'deleted' })
    }

    if (path === '/api/kb/import' && method === 'POST') {
      const body = await req.json().catch(() => ({})) as { entries?: unknown[]; raw?: string; category?: string }
      const created: string[] = []
      const errors: string[] = []

      // Structured import: array of { category, title, content, source? }
      if (Array.isArray(body.entries)) {
        for (const e of body.entries as Record<string, string>[]) {
          if (!e.category || !e.title || !e.content) { errors.push(`Skipped: missing fields on "${e.title ?? 'untitled'}"`) ; continue }
          const id = uid()
          run(`INSERT INTO knowledge_base (id, category, title, content, source, active) VALUES (?, ?, ?, ?, ?, 1)`,
            id, e.category.trim(), e.title.trim(), e.content.trim(), e.source?.trim() ?? 'import')
          created.push(id)
        }
      }

      // Plain-text import: --- separator blocks
      // Format: each entry separated by "---", first line = title, second = category:X, rest = content
      if (body.raw && typeof body.raw === 'string') {
        const defaultCategory = (body.category ?? 'general').trim()
        const blocks = body.raw.split(/\n\s*---\s*\n/).map(b => b.trim()).filter(Boolean)
        for (const block of blocks) {
          const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
          if (lines.length < 2) continue
          const title = lines[0].replace(/^#+\s*/, '').trim()
          let category = defaultCategory
          let contentStart = 1
          if (lines[1]?.toLowerCase().startsWith('category:')) {
            category = lines[1].slice(9).trim() || defaultCategory
            contentStart = 2
          }
          const content = lines.slice(contentStart).join('\n').trim()
          if (!title || !content) continue
          const id = uid()
          run(`INSERT INTO knowledge_base (id, category, title, content, source, active) VALUES (?, ?, ?, ?, ?, 1)`,
            id, category, title, content, 'text_import')
          created.push(id)
        }
      }

      if (created.length === 0 && errors.length === 0) {
        return json({ error: 'No valid entries found. Use entries[] array or raw text with --- separators.' }, 400)
      }
      logEvent('kb_imported', `${created.length} entries`, `via bulk import`)
      return json({ created: created.length, errors, ids: created })
    }

    // ── Authority config ──────────────────────────────────────────────────────

    if (path.match(/^\/api\/authority\/[\w]+$/) && method === 'PATCH') {
      const actionName = path.split('/')[3]
      const body = await req.json() as { tier: string; threshold_json?: Record<string, unknown>; description?: string }

      const existing = first(`SELECT id FROM authority_config WHERE action_name = ?`, actionName)
      if (existing) {
        run(`UPDATE authority_config SET tier = ?, threshold_json = ?, description = ?, updated_at = datetime('now') WHERE action_name = ?`,
          body.tier, body.threshold_json ? JSON.stringify(body.threshold_json) : null, body.description ?? null, actionName)
      } else {
        run(`INSERT INTO authority_config (id, action_name, tier, threshold_json, description) VALUES (?, ?, ?, ?, ?)`,
          uid(), actionName, body.tier, body.threshold_json ? JSON.stringify(body.threshold_json) : null, body.description ?? null)
      }

      logEvent('authority_updated', actionName, `Tier set to ${body.tier}`)
      return json({ status: 'updated', action_name: actionName, tier: body.tier })
    }

    // ── Customer CRUD ─────────────────────────────────────────────────────────

    if (path === '/api/customers' && method === 'GET') {
      const customers = all(`
        SELECT c.*,
          (SELECT COUNT(*) FROM conversations WHERE customer_id = c.id) as conversation_count,
          (SELECT COUNT(*) FROM conversations WHERE customer_id = c.id AND status = 'open') as open_conversations
        FROM customers c
        WHERE c.account_status != 'deleted'
        ORDER BY c.created_at DESC
      `)
      return json(customers)
    }

    if (path === '/api/customers' && method === 'POST') {
      const body = await req.json() as { name: string; email: string; phone?: string; tier?: string }
      if (!body.name || !body.email) return json({ error: 'name and email required' }, 400)
      const existing = first(`SELECT id FROM customers WHERE lower(email) = lower(?)`, body.email)
      if (existing) return json({ error: 'A customer with that email already exists' }, 409)
      const id = uid()
      run(`INSERT INTO customers (id, name, email, phone, tier, account_status) VALUES (?, ?, ?, ?, ?, 'active')`,
        id, body.name.trim(), body.email.trim().toLowerCase(), body.phone?.trim() ?? null, body.tier ?? 'standard')
      logEvent('customer_created', body.name, `${body.email} — tier: ${body.tier ?? 'standard'}`)
      return json({ id, status: 'created' })
    }

    if (path.match(/^\/api\/customers\/[\w]+$/) && method === 'PUT') {
      const id = path.split('/')[3]
      const body = await req.json() as { name?: string; phone?: string; tier?: string; account_status?: string }
      const existing = first(`SELECT id FROM customers WHERE id = ?`, id)
      if (!existing) return json({ error: 'Not found' }, 404)
      run(`UPDATE customers SET
             name           = COALESCE(?, name),
             phone          = COALESCE(?, phone),
             tier           = COALESCE(?, tier),
             account_status = COALESCE(?, account_status)
           WHERE id = ?`,
        body.name ?? null, body.phone ?? null, body.tier ?? null, body.account_status ?? null, id)
      logEvent('customer_updated', id, `tier: ${body.tier ?? '—'}, status: ${body.account_status ?? '—'}`)
      return json({ id, status: 'updated' })
    }

    if (path.match(/^\/api\/customers\/[\w]+$/) && method === 'DELETE') {
      const id = path.split('/')[3]
      const c = first<{ name: string }>(`SELECT name FROM customers WHERE id = ?`, id)
      if (!c) return json({ error: 'Not found' }, 404)
      run(`UPDATE customers SET account_status = 'deleted' WHERE id = ?`, id)
      logEvent('customer_deleted', id, c.name)
      return json({ id, status: 'deleted' })
    }

    if (path.match(/^\/api\/customers\/[\w]+\/conversations$/) && method === 'GET') {
      const id = path.split('/')[3]
      const convs = all(`
        SELECT id, status, channel, turn_count, escalated, started_at, resolved_at, resolution_method
        FROM conversations WHERE customer_id = ? ORDER BY started_at DESC LIMIT 20
      `, id)
      return json(convs)
    }

    // ── Approval queue ────────────────────────────────────────────────────────

    if (path.match(/^\/api\/inbox\/[\w-]+\/approve$/) && method === 'POST') {
      const id = path.split('/')[3]
      const msg = first<{ channel: string; sender_id: string; reply_type: string; external_id: string | null; subject: string | null; agent_reply: string | null }>(
        `SELECT channel, sender_id, reply_type, external_id, subject, agent_reply FROM inbound_messages WHERE id = ?`, id
      )
      if (!msg) return json({ error: 'Not found' }, 404)
      if (!msg.agent_reply) return json({ error: 'No draft reply exists' }, 400)

      const body = await req.json().catch(() => ({})) as { reply?: string }
      const text = body.reply?.trim() || msg.agent_reply

      const { sendReply } = await import('../lib/channel-send.js')
      await sendReply({ channel: msg.channel, senderId: msg.sender_id, replyType: msg.reply_type, externalId: msg.external_id, subject: msg.subject, text })

      run(`UPDATE inbound_messages SET agent_reply = ?, agent_reply_sent = 1, status = 'handled', handled_at = datetime('now') WHERE id = ?`, text, id)
      logEvent('approval_sent', id, `${msg.channel} → ${msg.sender_id}`)
      return json({ status: 'sent' })
    }

    if (path.match(/^\/api\/inbox\/[\w-]+\/discard$/) && method === 'POST') {
      const id = path.split('/')[3]
      const msg = first<{ sender_id: string }>(`SELECT sender_id FROM inbound_messages WHERE id = ?`, id)
      if (!msg) return json({ error: 'Not found' }, 404)
      run(`UPDATE inbound_messages SET status = 'discarded', handled_at = datetime('now') WHERE id = ?`, id)
      logEvent('approval_discarded', id, `discarded reply to ${msg.sender_id}`)
      return json({ status: 'discarded' })
    }

    // ── Channel connection tests ───────────────────────────────────────────────

    if (path === '/api/channels/test/email' && method === 'POST') {
      const host = getConfig('IMAP_HOST') ?? getConfig('SMTP_HOST')?.replace('smtp.', 'imap.')
      const user = getConfig('IMAP_USER') ?? getConfig('SMTP_USER')
      const pass = getConfig('IMAP_PASS') ?? getConfig('SMTP_PASS')
      if (!host || !user || !pass) return json({ ok: false, error: 'IMAP credentials not configured. Add them in Settings.' })

      try {
        const { ImapFlow } = await import('imapflow')
        const client = new ImapFlow({ host, port: parseInt(getConfig('IMAP_PORT') ?? '993'), secure: getConfig('IMAP_TLS') !== 'false', auth: { user, pass }, logger: false })
        await client.connect()
        const lock = await client.getMailboxLock('INBOX')
        const result = await client.search({ seen: false }, { uid: true })
        lock.release()
        await client.logout()
        const unseen = Array.isArray(result) ? result.length : 0
        return json({ ok: true, message: `Connected to ${host}. ${unseen} unseen message${unseen !== 1 ? 's' : ''} in inbox.` })
      } catch (e) {
        return json({ ok: false, error: String(e).split('\n')[0].slice(0, 200) })
      }
    }

    if (path === '/api/channels/test/sms' && method === 'POST') {
      const sid  = getConfig('TWILIO_ACCOUNT_SID')
      const auth = getConfig('TWILIO_AUTH_TOKEN')
      if (!sid || !auth) return json({ ok: false, error: 'Twilio credentials not configured.' })
      try {
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
          headers: { Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}` },
        })
        if (!r.ok) return json({ ok: false, error: `Twilio returned ${r.status} — check your credentials.` })
        const d = await r.json() as Record<string, unknown>
        return json({ ok: true, message: `Connected — Account: ${d['friendly_name'] ?? sid}` })
      } catch (e) {
        return json({ ok: false, error: String(e).slice(0, 200) })
      }
    }

    if (path === '/api/channels/test/facebook' && method === 'POST') {
      const token = getConfig('FB_PAGE_ACCESS_TOKEN')
      if (!token) return json({ ok: false, error: 'Facebook Page Access Token not configured.' })
      try {
        const r = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`)
        const d = await r.json() as Record<string, unknown>
        if (d['error']) return json({ ok: false, error: String((d['error'] as any).message ?? d['error']) })
        if (!r.ok) return json({ ok: false, error: `Facebook returned ${r.status}` })
        return json({ ok: true, message: `Connected — Page: ${d['name'] ?? d['id']}` })
      } catch (e) {
        return json({ ok: false, error: String(e).slice(0, 200) })
      }
    }

    // ── Unified inbox ─────────────────────────────────────────────────────────

    if (path === '/api/inbox' && method === 'GET') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
      const channel = url.searchParams.get('channel')
      const status = url.searchParams.get('status')

      let sql = `SELECT m.id, m.channel, m.sender_id, m.sender_name, m.subject, m.body, m.status,
                        m.agent_reply, m.agent_reply_sent, m.created_at, m.handled_at, c.name as customer_name
                 FROM inbound_messages m LEFT JOIN customers c ON c.id = m.customer_id`
      const params: unknown[] = []
      const where: string[] = []
      if (channel) { where.push(`m.channel = ?`); params.push(channel) }
      if (status)  { where.push(`m.status = ?`);  params.push(status) }
      if (where.length) sql += ` WHERE ${where.join(' AND ')}`
      sql += ` ORDER BY m.created_at DESC LIMIT ?`
      params.push(limit)
      return json(all(sql, ...params))
    }

    // ── Channel status ────────────────────────────────────────────────────────

    if (path === '/api/channels/status' && method === 'GET') {
      const channelPort = (parseInt(process.env.DASHBOARD_PORT ?? '4747')) + 1
      return json({
        email:     { configured: Boolean(getConfig('IMAP_HOST') ?? getConfig('SMTP_HOST')), user: getConfig('IMAP_USER') ?? getConfig('SMTP_USER') ?? null },
        sms:       { configured: Boolean(getConfig('TWILIO_ACCOUNT_SID')), phone: getConfig('TWILIO_PHONE_NUMBER') ?? null },
        facebook:  { configured: Boolean(getConfig('FB_PAGE_ACCESS_TOKEN')) },
        instagram: { configured: Boolean(getConfig('FB_PAGE_ACCESS_TOKEN')) },
        web:       { configured: true, port: channelPort },
      })
    }

    // ── Integrations CRUD ────────────────────────────────────────────────────

    if (path === '/api/integrations' && method === 'GET') {
      return json(all(`SELECT id, name, description, url, method, auth_type, auth_header, active, created_at FROM integrations ORDER BY name`))
    }

    if (path === '/api/integrations' && method === 'POST') {
      const body = await req.json() as { name: string; description?: string; url: string; method?: string; headers_json?: string; auth_type?: string; auth_value?: string; auth_header?: string }
      if (!body.name || !body.url) return json({ error: 'name and url required' }, 400)
      const id = uid()
      run(`INSERT INTO integrations (id, name, description, url, method, headers_json, auth_type, auth_value, auth_header) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, body.name.trim(), body.description?.trim() ?? null, body.url.trim(),
        (body.method ?? 'GET').toUpperCase(), body.headers_json ?? null,
        body.auth_type ?? 'none', body.auth_value ?? null, body.auth_header ?? null)
      logEvent('integration_created', body.name, body.url)
      return json({ id, status: 'created' })
    }

    if (path.match(/^\/api\/integrations\/[\w-]+$/) && method === 'PUT') {
      const id = path.split('/')[3]
      const body = await req.json() as Record<string, unknown>
      const existing = first(`SELECT id FROM integrations WHERE id = ?`, id)
      if (!existing) return json({ error: 'Not found' }, 404)
      run(`UPDATE integrations SET
             name        = COALESCE(?, name),
             description = COALESCE(?, description),
             url         = COALESCE(?, url),
             method      = COALESCE(?, method),
             headers_json = COALESCE(?, headers_json),
             auth_type   = COALESCE(?, auth_type),
             auth_value  = COALESCE(?, auth_value),
             auth_header = COALESCE(?, auth_header),
             active      = COALESCE(?, active)
           WHERE id = ?`,
        body.name ?? null, body.description ?? null, body.url ?? null,
        body.method ?? null, body.headers_json ?? null, body.auth_type ?? null,
        body.auth_value ?? null, body.auth_header ?? null,
        body.active != null ? (body.active ? 1 : 0) : null, id)
      return json({ id, status: 'updated' })
    }

    if (path.match(/^\/api\/integrations\/[\w-]+$/) && method === 'DELETE') {
      const id = path.split('/')[3]
      const row = first<{ name: string }>(`SELECT name FROM integrations WHERE id = ?`, id)
      if (!row) return json({ error: 'Not found' }, 404)
      run(`DELETE FROM integrations WHERE id = ?`, id)
      logEvent('integration_deleted', id, row.name)
      return json({ status: 'deleted' })
    }

    if (path.match(/^\/api\/integrations\/[\w-]+\/test$/) && method === 'POST') {
      const id = path.split('/')[3]
      const intg = first<{ url: string; method: string; headers_json: string | null; auth_type: string; auth_value: string | null; auth_header: string | null }>(
        `SELECT url, method, headers_json, auth_type, auth_value, auth_header FROM integrations WHERE id = ?`, id
      )
      if (!intg) return json({ ok: false, error: 'Not found' })
      try {
        const headers: Record<string, string> = {}
        if (intg.headers_json) try { Object.assign(headers, JSON.parse(intg.headers_json)) } catch {}
        if (intg.auth_type === 'bearer' && intg.auth_value) headers['Authorization'] = `Bearer ${intg.auth_value}`
        else if (intg.auth_type === 'api_key' && intg.auth_value && intg.auth_header) headers[intg.auth_header] = intg.auth_value
        else if (intg.auth_type === 'basic' && intg.auth_value) headers['Authorization'] = `Basic ${Buffer.from(intg.auth_value).toString('base64')}`
        const r = await fetch(intg.url, { method: intg.method, headers, signal: AbortSignal.timeout(5000) })
        return json({ ok: r.ok, status: r.status, message: r.ok ? `Connected — HTTP ${r.status}` : `HTTP ${r.status}` })
      } catch (e) { return json({ ok: false, error: String(e).slice(0, 200) }) }
    }

    // ── Learning queue ────────────────────────────────────────────────────────

    if (path === '/api/learning-queue' && method === 'GET') {
      const status = url.searchParams.get('status') ?? 'pending'
      return json(all(`
        SELECT lq.*, c.name as customer_name
        FROM learning_queue lq
        LEFT JOIN conversations conv ON conv.id = lq.conversation_id
        LEFT JOIN customers c ON c.id = conv.customer_id
        WHERE lq.status = ? ORDER BY lq.created_at DESC LIMIT 50
      `, status))
    }

    if (path.match(/^\/api\/learning-queue\/[\w-]+\/approve$/) && method === 'POST') {
      const id = path.split('/')[3]
      const body = await req.json().catch(() => ({})) as { correction?: string; create_kb?: boolean; kb_category?: string; kb_title?: string }
      const item = first<{ agent_response: string; improvement_type: string; conversation_id: string }>(
        `SELECT agent_response, improvement_type, conversation_id FROM learning_queue WHERE id = ?`, id
      )
      if (!item) return json({ error: 'Not found' }, 404)
      run(`UPDATE learning_queue SET status = 'approved', suggested_correction = ? WHERE id = ?`, body.correction ?? null, id)
      // If substance improvement + correction provided → auto-create KB entry
      if (item.improvement_type === 'substance' && body.create_kb && body.correction && body.kb_title) {
        const kbId = uid()
        run(`INSERT INTO knowledge_base (id, category, title, content, source, active) VALUES (?, ?, ?, ?, 'learning_queue', 1)`,
          kbId, body.kb_category ?? 'general', body.kb_title, body.correction)
        logEvent('learning_approved_kb', id, `KB entry created: ${body.kb_title}`)
      }
      logEvent('learning_approved', id, body.correction ? 'with correction' : 'no correction')
      return json({ status: 'approved' })
    }

    if (path.match(/^\/api\/learning-queue\/[\w-]+\/reject$/) && method === 'POST') {
      const id = path.split('/')[3]
      run(`UPDATE learning_queue SET status = 'rejected' WHERE id = ?`, id)
      logEvent('learning_rejected', id, '')
      return json({ status: 'rejected' })
    }

    // ── Metrics ───────────────────────────────────────────────────────────────

    if (path === '/api/metrics' && method === 'GET') {
      const days = parseInt(url.searchParams.get('days') ?? '30')
      return json(getMetrics(days))
    }

    return json({ error: 'Not found' }, 404)
  },
})

console.log(`[CX Agent] Dashboard → http://localhost:${PORT}`)
