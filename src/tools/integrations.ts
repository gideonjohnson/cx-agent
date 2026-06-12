import { first } from '../lib/db.js'

export const integrationTools = [
  {
    name: 'call_integration',
    description: 'Call a configured external system (e.g. Shopify, WooCommerce, booking system, custom CRM) to retrieve live data. Use for order lookups, stock checks, booking availability, or any data not in the local database. The integration must be configured by the client in Settings → Integrations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Integration name as configured (e.g. "shopify_orders", "booking_system")' },
        params: { type: 'object', description: 'Parameters to pass to the integration endpoint' },
      },
      required: ['name'],
    },
  },
]

export const integrationHandlers = {
  call_integration: async (input: Record<string, unknown>) => {
    const { name, params } = input as { name: string; params?: Record<string, unknown> }

    const integration = first<{
      url: string; method: string; headers_json: string | null
      auth_type: string; auth_value: string | null; auth_header: string | null; active: number
    }>(`SELECT url, method, headers_json, auth_type, auth_value, auth_header, active FROM integrations WHERE name = ?`, name)

    if (!integration) {
      return { success: false, verified: false, error: `Integration "${name}" not found. Available integrations must be configured in Settings → Integrations.` }
    }
    if (!integration.active) {
      return { success: false, verified: false, error: `Integration "${name}" is disabled.` }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (integration.headers_json) {
      try { Object.assign(headers, JSON.parse(integration.headers_json)) } catch {}
    }

    if (integration.auth_type === 'bearer' && integration.auth_value) {
      headers['Authorization'] = `Bearer ${integration.auth_value}`
    } else if (integration.auth_type === 'api_key' && integration.auth_value && integration.auth_header) {
      headers[integration.auth_header] = integration.auth_value
    } else if (integration.auth_type === 'basic' && integration.auth_value) {
      headers['Authorization'] = `Basic ${Buffer.from(integration.auth_value).toString('base64')}`
    }

    let url = integration.url
    const method = integration.method.toUpperCase()

    // Interpolate params into URL template (e.g. /orders/{order_id})
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url = url.replace(`{${k}}`, encodeURIComponent(String(v)))
      }
    }

    try {
      const fetchOpts: RequestInit = { method, headers, signal: AbortSignal.timeout(8000) }
      if (params && method !== 'GET') {
        fetchOpts.body = JSON.stringify(params)
      }

      const res = await fetch(url, fetchOpts)
      const text = await res.text()
      let data: unknown
      try { data = JSON.parse(text) } catch { data = text }

      if (!res.ok) {
        return { success: false, verified: false, http_status: res.status, error: `Integration returned ${res.status}`, response: data }
      }

      return { success: true, verified: true, authority_tier: 'auto', http_status: res.status, data }
    } catch (err) {
      return { success: false, verified: false, error: `Integration call failed: ${String(err).slice(0, 200)}` }
    }
  },
}
