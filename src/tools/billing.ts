import { first, run, uid, all } from '../lib/db.js'
import { sendEmail } from '../lib/email.js'
import { getRefundTier } from '../lib/authority.js'

export const billingTools = [
  {
    name: 'get_invoice_history',
    description: 'Get recent invoices and payment history for the customer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Number of invoices to return (default 5)' },
      },
      required: [],
    },
  },
  {
    name: 'issue_refund',
    description: 'Issue a refund to the customer. AUTO under £50, CONFIRM £50–£500, ESCALATE above £500. Always verify the invoice exists before calling.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoice_id: { type: 'string', description: 'Invoice to refund' },
        amount_gbp: { type: 'number', description: 'Refund amount in GBP' },
        reason: { type: 'string', description: 'Reason for refund' },
      },
      required: ['invoice_id', 'amount_gbp', 'reason'],
    },
  },
  {
    name: 'apply_goodwill_credit',
    description: 'Apply a goodwill credit to the customer\'s account. AUTO up to £25. Use for service failures, delays, or as a gesture.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount_gbp: { type: 'number', description: 'Credit amount in GBP (max £25 auto, above requires escalation)' },
        reason: { type: 'string' },
      },
      required: ['amount_gbp', 'reason'],
    },
  },
  {
    name: 'retry_payment',
    description: 'Retry the last failed payment on the customer\'s account. AUTO tier.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'send_payment_update_link',
    description: 'Send a secure link for the customer to update their payment method. AUTO tier.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
]

export function makeBillingHandlers(customerId: string, customerEmail: string, customerName: string) {
  return {
    get_invoice_history: async (input: Record<string, unknown>) => {
      const invoices = all(
        `SELECT id, amount_gbp, description, status, due_at, paid_at, refunded_at, refund_amount_gbp, created_at
         FROM invoices WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?`,
        customerId, input['limit'] ?? 5
      )
      return { success: true, verified: true, invoices }
    },

    issue_refund: async (input: Record<string, unknown>) => {
      const { invoice_id, amount_gbp, reason } = input as { invoice_id: string; amount_gbp: number; reason: string }
      const tier = getRefundTier(amount_gbp)

      if (tier === 'escalate') {
        return {
          success: false, verified: false, authority_tier: 'escalate',
          error: `Refund of £${amount_gbp} exceeds the £500 auto-approval limit. This requires escalation to a senior agent.`,
          needs_escalation: true,
        }
      }

      const invoice = first<{ id: string; amount_gbp: number; status: string }>(
        `SELECT id, amount_gbp, status FROM invoices WHERE id = ? AND customer_id = ?`, invoice_id, customerId
      )
      if (!invoice) return { success: false, verified: false, error: 'Invoice not found on this account' }
      if (invoice.status === 'refunded') return { success: false, verified: false, error: 'Invoice has already been refunded' }
      if (amount_gbp > invoice.amount_gbp) return { success: false, verified: false, error: `Refund amount (£${amount_gbp}) exceeds invoice total (£${invoice.amount_gbp})` }

      run(`UPDATE invoices SET status = 'refunded', refunded_at = datetime('now'), refund_amount_gbp = ? WHERE id = ?`,
        amount_gbp, invoice_id)

      const updated = first<{ status: string; refund_amount_gbp: number }>(`SELECT status, refund_amount_gbp FROM invoices WHERE id = ?`, invoice_id)
      const verified = updated?.status === 'refunded' && updated?.refund_amount_gbp === amount_gbp

      if (verified) {
        await sendEmail(customerEmail, `Refund Confirmed — £${amount_gbp}`,
          `Hi ${customerName},\n\nA refund of £${amount_gbp} has been processed for invoice ${invoice_id.slice(0, 8)}.\n\nReason: ${reason}\n\nPlease allow 3-5 business days for the funds to appear in your account.`)
      }

      return {
        success: verified, verified, authority_tier: tier,
        refund_amount_gbp: amount_gbp, invoice_id, estimated_arrival: '3-5 business days',
        message: verified ? `Refund of £${amount_gbp} processed and confirmation sent` : 'Refund update failed — please retry',
      }
    },

    apply_goodwill_credit: async (input: Record<string, unknown>) => {
      const { amount_gbp, reason } = input as { amount_gbp: number; reason: string }

      if (amount_gbp > 25) {
        return { success: false, verified: false, authority_tier: 'escalate', error: `Goodwill credit of £${amount_gbp} exceeds £25 auto-approval. Escalate for approval.`, needs_escalation: true }
      }

      const creditId = uid()
      run(`INSERT INTO invoices (id, customer_id, amount_gbp, description, status, paid_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        creditId, customerId, -amount_gbp, `Goodwill credit: ${reason}`, 'paid')

      const verified = !!first(`SELECT id FROM invoices WHERE id = ?`, creditId)
      await sendEmail(customerEmail, `Account Credit Applied — £${amount_gbp}`,
        `Hi ${customerName},\n\nWe've applied a goodwill credit of £${amount_gbp} to your account.\n\nReason: ${reason}\n\nThis credit will be applied to your next invoice automatically.`)

      return { success: verified, verified, authority_tier: 'auto', credit_amount_gbp: amount_gbp, credit_id: creditId }
    },

    retry_payment: async () => {
      const failedInvoice = first<{ id: string; amount_gbp: number }>(
        `SELECT id, amount_gbp FROM invoices WHERE customer_id = ? AND status = 'overdue' ORDER BY due_at ASC LIMIT 1`, customerId
      )
      if (!failedInvoice) return { success: false, verified: false, error: 'No overdue invoices found' }

      run(`UPDATE invoices SET status = 'pending' WHERE id = ?`, failedInvoice.id)
      const updated = first<{ status: string }>(`SELECT status FROM invoices WHERE id = ?`, failedInvoice.id)
      return {
        success: true, verified: updated?.status === 'pending', authority_tier: 'auto',
        invoice_id: failedInvoice.id, amount_gbp: failedInvoice.amount_gbp,
        message: 'Payment retry initiated — customer will receive email confirmation within 24 hours',
      }
    },

    send_payment_update_link: async () => {
      const token = uid()
      await sendEmail(customerEmail, 'Update Your Payment Method',
        `Hi ${customerName},\n\nClick below to securely update your payment method:\n\nhttps://app.example.com/payment/update?token=${token}\n\nThis link expires in 24 hours and can only be used once.`)
      return { success: true, verified: true, authority_tier: 'auto', message: `Secure payment update link sent to ${customerEmail}` }
    },
  }
}
