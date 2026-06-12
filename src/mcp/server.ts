#!/usr/bin/env bun
// CX Agent MCP Server — stdio JSON-RPC transport (MCP spec 2024-11-05)
// Usage: bun run src/mcp/server.ts
// Configure in your MCP client: { "command": "bun", "args": ["run", "/path/to/cx-agent/src/mcp/server.ts"] }

import { loadConfigIntoEnv } from '../lib/config.js'
loadConfigIntoEnv()

import { all, first } from '../lib/db.js'
import { getMetrics } from '../analytics/metrics.js'

const SERVER_INFO = { name: 'cx-agent', version: '1.3.0' }
const PROTOCOL_VERSION = '2024-11-05'

const TOOLS = [
  {
    name: 'cx_search_knowledge_base',
    description: 'Search the CX knowledge base for policies, FAQs, and procedures. Use before stating any policy to a customer.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms (e.g. "return policy", "cancellation fee")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'cx_get_metrics',
    description: 'Get CX performance metrics: resolution rate, CSAT, escalation rate, conversation volume.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Lookback period in days (default: 30)' },
      },
    },
  },
  {
    name: 'cx_check_customer',
    description: 'Look up a customer account by email address.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Customer email address' },
      },
      required: ['email'],
    },
  },
  {
    name: 'cx_list_escalations',
    description: 'List currently open escalations that need human attention.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default: 10)' },
      },
    },
  },
  {
    name: 'cx_get_insights',
    description: 'Get the latest AI-generated insight report from conversation analytics.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

function callTool(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case 'cx_search_knowledge_base': {
      const query = String(args['query'] ?? '').toLowerCase()
      const results = all<{ category: string; title: string; content: string }>(
        `SELECT category, title, content FROM knowledge_base
         WHERE active = 1
           AND (lower(title) LIKE ? OR lower(content) LIKE ?)
         ORDER BY usage_count DESC LIMIT 5`,
        `%${query}%`, `%${query}%`
      )
      return {
        found: results.length,
        results: results.map(r => ({ category: r.category, title: r.title, content: r.content })),
      }
    }

    case 'cx_get_metrics': {
      const days = Math.max(1, Math.min(365, Number(args['days'] ?? 30)))
      const m = getMetrics(days)
      return {
        period_days: days,
        resolution_rate_pct: m.resolution.resolution_rate_pct,
        escalation_rate_pct: m.escalations.escalation_rate_pct,
        avg_csat: m.sentiment.avg_csat,
        csat_ratings: m.sentiment.csat_count,
        fcr_rate_pct: m.resolution.fcr_rate_pct,
        volume: { today: m.volume.today, this_week: m.volume.this_week },
        top_actions: m.actions.by_type.slice(0, 5).map(a => a.action_name),
      }
    }

    case 'cx_check_customer': {
      const email = String(args['email'] ?? '')
      const customer = first<Record<string, unknown>>(
        `SELECT id, name, email, phone, tier, account_status, created_at FROM customers WHERE lower(email) = lower(?) AND account_status != 'deleted'`,
        email
      )
      if (!customer) return { found: false }
      const openConvs = first<{ count: number }>(
        `SELECT COUNT(*) as count FROM conversations WHERE customer_id = ? AND status = 'open'`,
        customer['id']
      )
      const subscription = first<{ plan: string; status: string }>(
        `SELECT plan, status FROM subscriptions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`,
        customer['id']
      )
      return {
        found: true,
        customer: {
          name: customer['name'],
          email: customer['email'],
          tier: customer['tier'],
          status: customer['account_status'],
          open_conversations: openConvs?.count ?? 0,
          subscription: subscription ?? null,
        },
      }
    }

    case 'cx_list_escalations': {
      const limit = Math.max(1, Math.min(50, Number(args['limit'] ?? 10)))
      const escalations = all<Record<string, unknown>>(
        `SELECT e.id, e.trigger, e.summary, e.created_at, e.assigned_to,
                c.name as customer_name, c.tier as customer_tier
         FROM escalations e
         LEFT JOIN conversations conv ON conv.id = e.conversation_id
         LEFT JOIN customers c ON c.id = conv.customer_id
         WHERE e.resolved_at IS NULL
         ORDER BY e.created_at ASC LIMIT ?`,
        limit
      )
      return { open_count: escalations.length, escalations }
    }

    case 'cx_get_insights': {
      const row = first<Record<string, unknown>>(
        `SELECT * FROM insight_reports ORDER BY created_at DESC LIMIT 1`
      )
      if (!row) return { available: false, message: 'No insight reports generated yet. They are created weekly.' }
      const tryParse = (s: unknown) => { try { return JSON.parse(String(s)) } catch { return [] } }
      return {
        available: true,
        period_start: row['period_start'],
        period_end: row['period_end'],
        generated_at: row['created_at'],
        top_issues: tryParse(row['top_issues_json']),
        complaint_clusters: tryParse(row['complaint_clusters_json']),
        competitor_mentions: tryParse(row['competitor_mentions_json']),
        pricing_signals: tryParse(row['pricing_signals_json']),
        product_signals: tryParse(row['product_signals_json']),
        summary: row['summary'],
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

function respond(id: unknown, result: unknown): void {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n')
}

function respondError(id: unknown, code: number, message: string): void {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n')
}

let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk: string) => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let msg: { jsonrpc: string; id: unknown; method: string; params: Record<string, unknown> }
    try {
      msg = JSON.parse(trimmed)
    } catch {
      respondError(null, -32700, 'Parse error')
      continue
    }

    const { id, method, params = {} } = msg

    switch (method) {
      case 'initialize':
        respond(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        })
        break

      case 'notifications/initialized':
        // No response needed for notifications
        break

      case 'tools/list':
        respond(id, { tools: TOOLS })
        break

      case 'tools/call': {
        const toolName = String(params['name'] ?? '')
        const toolArgs = (params['arguments'] ?? {}) as Record<string, unknown>
        try {
          const result = callTool(toolName, toolArgs)
          respond(id, {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: false,
          })
        } catch (err) {
          respond(id, {
            content: [{ type: 'text', text: String(err) }],
            isError: true,
          })
        }
        break
      }

      default:
        respondError(id, -32601, `Method not found: ${method}`)
    }
  }
})

process.stdin.on('end', () => process.exit(0))

// Log to stderr so it doesn't corrupt the JSON-RPC stream
process.stderr.write('[CX Agent MCP] Ready — 5 tools available\n')
