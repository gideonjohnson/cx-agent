import { all, first } from './db.js'

export interface CustomerContext {
  customer: Record<string, unknown> | null
  orders: Record<string, unknown>[]
  subscription: Record<string, unknown> | null
  recentInvoices: Record<string, unknown>[]
  priorContacts: number
  pendingConfirmation: Record<string, unknown> | null
  identityVerified: boolean
  channel: string
}

export async function assembleContext(conversationId: string): Promise<CustomerContext> {
  const conv = first<Record<string, string | number>>(
    `SELECT * FROM conversations WHERE id = ?`, conversationId
  )
  if (!conv) return { customer: null, orders: [], subscription: null, recentInvoices: [], priorContacts: 0, pendingConfirmation: null, identityVerified: false, channel: 'web' }

  const customerId = conv['customer_id']

  const customer = first<Record<string, unknown>>(
    `SELECT id, name, email, phone, tier, account_status, created_at FROM customers WHERE id = ?`, customerId
  )

  const orders = all<Record<string, unknown>>(
    `SELECT id, external_id, status, items_json, total_gbp, delivery_address_json, tracking_number, carrier, estimated_delivery, created_at
     FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5`, customerId
  )

  const subscription = first<Record<string, unknown>>(
    `SELECT id, plan, amount_gbp, billing_cycle, status, next_billing_at, paused_until, cancelled_at
     FROM subscriptions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`, customerId
  )

  const recentInvoices = all<Record<string, unknown>>(
    `SELECT id, amount_gbp, description, status, due_at, paid_at, refunded_at, refund_amount_gbp, created_at
     FROM invoices WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5`, customerId
  )

  const priorContacts = (first<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE customer_id = ? AND id != ?`, customerId, conversationId
  ))?.count ?? 0

  const pendingConfirmation = conv['pending_confirmation_json']
    ? JSON.parse(conv['pending_confirmation_json'] as string)
    : null

  return {
    customer, orders, subscription, recentInvoices, priorContacts, pendingConfirmation,
    identityVerified: Boolean(conv['identity_verified']),
    channel: String(conv['channel'] ?? 'web'),
  }
}

export function formatContextForPrompt(ctx: CustomerContext): string {
  const c = ctx.customer
  if (!c) return 'No customer record found.'

  const lines: string[] = [
    `## Customer`,
    `Name: ${c['name']} | Tier: ${c['tier']} | Status: ${c['account_status']}`,
    `Email: ${c['email']} | Phone: ${c['phone'] ?? 'not provided'}`,
    `Prior contacts: ${ctx.priorContacts} previous conversation(s)`,
  ]

  if (ctx.orders.length) {
    lines.push(`\n## Active Orders`)
    for (const o of ctx.orders) {
      const items = JSON.parse(String(o['items_json'] || '[]'))
      lines.push(`Order ${o['external_id'] ?? o['id']}: ${items.map((i: Record<string, string>) => `${i['qty']}× ${i['name']}`).join(', ')} — Status: ${o['status']} — Total: £${o['total_gbp']}`)
      if (o['tracking_number']) lines.push(`  Tracking: ${o['carrier']} ${o['tracking_number']} | Est. delivery: ${o['estimated_delivery'] ?? 'TBC'}`)
    }
  }

  if (ctx.subscription) {
    const s = ctx.subscription
    lines.push(`\n## Subscription`)
    lines.push(`${s['plan']} — £${s['amount_gbp']}/${s['billing_cycle']} — Status: ${s['status']}`)
    if (s['next_billing_at']) lines.push(`Next billing: ${s['next_billing_at']}`)
    if (s['paused_until']) lines.push(`Paused until: ${s['paused_until']}`)
  }

  if (ctx.recentInvoices.length) {
    lines.push(`\n## Recent Invoices`)
    for (const inv of ctx.recentInvoices) {
      let line = `${inv['id']}: £${inv['amount_gbp']} — ${inv['status']}`
      if (inv['description']) line += ` (${inv['description']})`
      if (inv['refunded_at']) line += ` [REFUNDED £${inv['refund_amount_gbp']}]`
      lines.push(line)
    }
  }

  lines.push(`\n## Session`)
  lines.push(`Channel: ${ctx.channel} | Identity verified: ${ctx.identityVerified ? 'YES' : 'NO — verify before disclosing account data'}`)

  if (ctx.pendingConfirmation) {
    lines.push(`\n## PENDING CONFIRMATION`)
    lines.push(`Customer was asked to confirm: ${JSON.stringify(ctx.pendingConfirmation)}`)
    lines.push(`If the customer's message is a yes/confirm → execute the action. If no/cancel → clear it.`)
  }

  return lines.join('\n')
}
