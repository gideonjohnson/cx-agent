import { all, first, run, uid } from '../lib/db.js'
import { sendEmail } from '../lib/email.js'

export const orderTools = [
  {
    name: 'get_order_status',
    description: 'Get detailed order status, tracking, and delivery information for a customer\'s orders.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string', description: 'Specific order ID, or leave empty to get all recent orders' },
      },
      required: [],
    },
  },
  {
    name: 'reschedule_delivery',
    description: 'Reschedule a delivery to a new date or address. CONFIRM tier — ask the customer to confirm the new details first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string' },
        new_date: { type: 'string', description: 'New estimated delivery date (YYYY-MM-DD)' },
        new_address: { type: 'string', description: 'New delivery address if changing' },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancel an order. CONFIRM tier — only execute after customer confirms. Only cancellable if not yet shipped.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['order_id', 'reason'],
    },
  },
  {
    name: 'initiate_return',
    description: 'Generate a return label and initiate the returns process. AUTO tier for orders within 30 days.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string' },
        reason: { type: 'string', description: 'Reason for return' },
        items: { type: 'string', description: 'Which items to return (all or specify)' },
      },
      required: ['order_id', 'reason'],
    },
  },
  {
    name: 'reship_item',
    description: 'Reship a damaged or lost item. CONFIRM tier — confirm the item and address with customer first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string' },
        item_name: { type: 'string', description: 'Which item to reship' },
        reason: { type: 'string', enum: ['damaged', 'lost', 'wrong_item'] },
      },
      required: ['order_id', 'item_name', 'reason'],
    },
  },
]

export function makeOrderHandlers(customerId: string, customerEmail: string, customerName: string) {
  return {
    get_order_status: async (input: Record<string, unknown>) => {
      const orders = input['order_id']
        ? [first(`SELECT * FROM orders WHERE id = ? AND customer_id = ?`, input['order_id'], customerId)]
        : all(`SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5`, customerId)
      return { success: true, verified: true, orders: orders.filter(Boolean) }
    },

    reschedule_delivery: async (input: Record<string, unknown>) => {
      const order = first<{ id: string; status: string }>(
        `SELECT id, status FROM orders WHERE id = ? AND customer_id = ?`, input['order_id'], customerId
      )
      if (!order) return { success: false, verified: false, error: 'Order not found' }
      if (order.status === 'delivered') return { success: false, verified: false, error: 'Order already delivered — cannot reschedule' }

      if (input['new_date']) run(`UPDATE orders SET estimated_delivery = ?, updated_at = datetime('now') WHERE id = ?`, input['new_date'], order.id)
      if (input['new_address']) run(`UPDATE orders SET delivery_address_json = ?, updated_at = datetime('now') WHERE id = ?`, JSON.stringify({ address: input['new_address'] }), order.id)

      const updated = first<{ estimated_delivery: string }>(`SELECT estimated_delivery FROM orders WHERE id = ?`, order.id)
      return { success: true, verified: true, authority_tier: 'confirm', order_id: order.id, new_estimated_delivery: updated?.estimated_delivery }
    },

    cancel_order: async (input: Record<string, unknown>) => {
      const order = first<{ id: string; status: string; total_gbp: number }>(
        `SELECT id, status, total_gbp FROM orders WHERE id = ? AND customer_id = ?`, input['order_id'], customerId
      )
      if (!order) return { success: false, verified: false, error: 'Order not found' }
      if (['shipped', 'delivered'].includes(order.status)) {
        return { success: false, verified: false, error: `Cannot cancel — order is already ${order.status}. Use initiate_return instead.` }
      }

      run(`UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, order.id)
      const updated = first<{ status: string }>(`SELECT status FROM orders WHERE id = ?`, order.id)
      const verified = updated?.status === 'cancelled'

      await sendEmail(customerEmail, `Order Cancelled — Ref: ${order.id.slice(0, 8)}`,
        `Hi ${customerName},\n\nYour order (${order.id.slice(0, 8)}) has been cancelled. A refund of £${order.total_gbp} will be processed within 3-5 business days.\n\nReason: ${input['reason']}`)

      return { success: verified, verified, authority_tier: 'confirm', refund_amount_gbp: order.total_gbp, message: 'Order cancelled and confirmation email sent' }
    },

    initiate_return: async (input: Record<string, unknown>) => {
      const order = first<{ id: string; status: string; total_gbp: number; created_at: string }>(
        `SELECT id, status, total_gbp, created_at FROM orders WHERE id = ? AND customer_id = ?`, input['order_id'], customerId
      )
      if (!order) return { success: false, verified: false, error: 'Order not found' }

      const orderAge = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 86400000)
      if (orderAge > 30) return { success: false, verified: false, error: `Order is ${orderAge} days old — outside 30-day return window. Escalating for manual review.`, needs_escalation: true }

      const returnRef = `RET-${uid().slice(0, 8).toUpperCase()}`
      await sendEmail(customerEmail, `Return Initiated — ${returnRef}`,
        `Hi ${customerName},\n\nYour return has been approved.\n\nReturn reference: ${returnRef}\nReturn label: [LABEL ATTACHED — in production this would be a real label]\n\nPlease pack items securely and drop off at any collection point.\n\nYour refund of £${order.total_gbp} will be processed within 5 business days of us receiving the item.`)

      return { success: true, verified: true, authority_tier: 'auto', return_reference: returnRef, refund_amount_gbp: order.total_gbp }
    },

    reship_item: async (input: Record<string, unknown>) => {
      const order = first<{ id: string }>(`SELECT id FROM orders WHERE id = ? AND customer_id = ?`, input['order_id'], customerId)
      if (!order) return { success: false, verified: false, error: 'Order not found' }

      const newOrderId = uid()
      run(`INSERT INTO orders (id, customer_id, external_id, status, items_json, total_gbp) VALUES (?, ?, ?, ?, ?, ?)`,
        newOrderId, customerId, `RESHIP-${order.id.slice(0, 8)}`, 'processing', JSON.stringify([{ name: input['item_name'], qty: 1 }]), 0)

      const verified = !!first(`SELECT id FROM orders WHERE id = ?`, newOrderId)
      await sendEmail(customerEmail, `Replacement Order Confirmed`,
        `Hi ${customerName},\n\nWe've arranged a replacement for ${input['item_name']} (${input['reason']}). You'll receive tracking details once it's dispatched.\n\nReplacement order: ${newOrderId.slice(0, 8)}`)

      return { success: verified, verified, authority_tier: 'confirm', replacement_order_id: newOrderId.slice(0, 8) }
    },
  }
}
