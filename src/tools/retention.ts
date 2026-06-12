import { run, uid, first } from '../lib/db.js'

export const retentionTools = [
  {
    name: 'log_revenue_event',
    description: 'Log a revenue-relevant interaction: retention attempt (customer wants to cancel), upsell opportunity, or win-back. Call this whenever you identify churn risk or an upgrade opportunity and take action on it. Always pair with the actual action (offer pause, mention upgrade, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['retention_attempt', 'upsell_attempt', 'win_back_attempt'],
          description: 'Type of revenue event',
        },
        trigger: { type: 'string', description: 'What the customer said that indicated churn risk or upsell opportunity' },
        action_taken: { type: 'string', description: 'What you offered or did in response' },
        outcome: {
          type: 'string',
          enum: ['pending', 'accepted', 'declined'],
          description: 'Result of the offer — use pending if customer has not yet responded',
        },
        amount_gbp: { type: 'number', description: 'Revenue at stake (subscription value, upgrade delta, etc.) if known' },
      },
      required: ['type', 'trigger', 'action_taken', 'outcome'],
    },
  },
  {
    name: 'update_revenue_outcome',
    description: 'Update the outcome of a previously logged revenue event once the customer responds. Call when a pending retention/upsell offer is accepted or declined.',
    input_schema: {
      type: 'object' as const,
      properties: {
        outcome: { type: 'string', enum: ['accepted', 'declined'] },
        notes: { type: 'string', description: 'Any relevant detail about how the outcome was reached' },
      },
      required: ['outcome'],
    },
  },
]

export function makeRetentionHandlers(customerId: string) {
  return {
    log_revenue_event: async (input: Record<string, unknown>, conversationId: string) => {
      const { type, trigger, action_taken, outcome, amount_gbp } = input as {
        type: string; trigger: string; action_taken: string; outcome: string; amount_gbp?: number
      }
      const id = uid()
      run(
        `INSERT INTO revenue_events (id, conversation_id, customer_id, type, trigger, action_taken, outcome, amount_gbp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id, conversationId, customerId, type, trigger, action_taken, outcome, amount_gbp ?? null
      )
      return { success: true, verified: true, authority_tier: 'auto', event_id: id }
    },

    update_revenue_outcome: async (input: Record<string, unknown>, conversationId: string) => {
      const { outcome, notes } = input as { outcome: string; notes?: string }
      const latest = first<{ id: string }>(
        `SELECT id FROM revenue_events WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`,
        conversationId
      )
      if (!latest) return { success: false, verified: false, error: 'No revenue event found for this conversation' }
      run(`UPDATE revenue_events SET outcome = ? WHERE id = ?`, outcome, latest.id)
      return { success: true, verified: true, authority_tier: 'auto', outcome, notes: notes ?? null }
    },
  }
}
