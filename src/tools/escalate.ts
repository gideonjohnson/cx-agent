import { run, uid, all, first } from '../lib/db.js'
import { sendEmail } from '../lib/email.js'
import { assembleContext, formatContextForPrompt } from '../lib/context.js'

export const escalateTools = [
  {
    name: 'request_customer_confirmation',
    description: 'Store a pending confirmation for a CONFIRM-tier action. Call this before executing any confirm-tier action. The customer\'s next message will confirm or cancel it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', description: 'The action awaiting confirmation' },
        details: { type: 'object', description: 'The specific parameters of the action to execute if confirmed' },
        summary_for_customer: { type: 'string', description: 'Clear one-sentence summary of what will happen if they confirm' },
      },
      required: ['action', 'details', 'summary_for_customer'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Escalate the conversation to a human agent. Use when: action exceeds authority, confidence is below 70%, customer is frustrated/distressed, or the issue is complex and unresolved after 3 attempts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        trigger: { type: 'string', enum: ['low_confidence', 'out_of_authority', 'frustration', 'complexity', 'vulnerability'] },
        summary: { type: 'string', description: 'Clear summary of the issue, what was attempted, and why you are escalating' },
        emotional_state: { type: 'string', description: 'Your read on the customer\'s emotional state' },
        priority: { type: 'string', enum: ['normal', 'urgent', 'critical'], default: 'normal' },
      },
      required: ['trigger', 'summary'],
    },
  },
]

export function makeEscalateHandlers(conversationId: string) {
  return {
    request_customer_confirmation: async (input: Record<string, unknown>) => {
      const { action, details, summary_for_customer } = input as { action: string; details: Record<string, unknown>; summary_for_customer: string }

      run(`UPDATE conversations SET pending_confirmation_json = ? WHERE id = ?`,
        JSON.stringify({ action, details, summary_for_customer, requested_at: new Date().toISOString() }),
        conversationId
      )

      return {
        success: true, verified: true, authority_tier: 'auto',
        pending_action: action,
        message: `Confirmation stored. Tell the customer: "${summary_for_customer}" and ask them to confirm.`,
      }
    },

    escalate_to_human: async (input: Record<string, unknown>) => {
      const { trigger, summary, emotional_state, priority } = input as {
        trigger: string; summary: string; emotional_state?: string; priority?: string
      }

      const ctx = await assembleContext(conversationId)
      const contextText = formatContextForPrompt(ctx)

      const actions = all<{ action_name: string; success: number; created_at: string }>(
        `SELECT action_name, success, created_at FROM actions_log WHERE conversation_id = ? ORDER BY created_at ASC`, conversationId
      )

      const fullContext = {
        customer: ctx.customer,
        trigger,
        summary,
        emotional_state: emotional_state ?? 'not assessed',
        priority: priority ?? 'normal',
        actions_attempted: actions,
        prior_contacts: ctx.priorContacts,
        context_snapshot: contextText,
        escalated_at: new Date().toISOString(),
      }

      const escId = uid()
      run(`INSERT INTO escalations (id, conversation_id, trigger, summary, full_context_json) VALUES (?, ?, ?, ?, ?)`,
        escId, conversationId, trigger, summary, JSON.stringify(fullContext))
      run(`UPDATE conversations SET status = 'escalated', escalated = 1 WHERE id = ?`, conversationId)
      run(`UPDATE conversations SET pending_confirmation_json = NULL WHERE id = ?`, conversationId)

      const clientEmail = process.env.CLIENT_EMAIL
      if (clientEmail) {
        const urgencyLabel = priority === 'critical' ? '🔴 CRITICAL' : priority === 'urgent' ? '🟠 URGENT' : '🟡'
        await sendEmail(
          clientEmail,
          `${urgencyLabel} Escalation: ${trigger} — ${ctx.customer?.['name'] ?? 'Customer'}`,
          `ESCALATION REFERENCE: ESC-${escId.slice(0, 8)}\n\nCustomer: ${ctx.customer?.['name']} (${ctx.customer?.['tier']}) — ${ctx.customer?.['email']}\nTrigger: ${trigger}\nPriority: ${priority ?? 'normal'}\nEmotional state: ${emotional_state ?? 'not assessed'}\n\nSummary:\n${summary}\n\nActions attempted:\n${actions.map(a => `- ${a.action_name}: ${a.success ? 'succeeded' : 'failed'}`).join('\n') || 'None'}\n\nPrior contacts: ${ctx.priorContacts}\n\nFull conversation is available in the dashboard.`
        ).catch(() => {})
      }

      return {
        success: true, verified: true, authority_tier: 'auto',
        escalation_id: `ESC-${escId.slice(0, 8)}`,
        message: `Escalation created and human agent notified. Reference: ESC-${escId.slice(0, 8)}`,
      }
    },
  }
}
