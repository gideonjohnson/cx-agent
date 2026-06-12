import { first, run, uid } from '../lib/db.js'
import { sendEmail } from '../lib/email.js'

export const subscriptionTools = [
  {
    name: 'get_subscription_status',
    description: 'Get the current subscription plan, status, billing details, and entitlements.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'change_plan',
    description: 'Upgrade or downgrade the subscription plan. CONFIRM tier — confirm new plan and price with customer before executing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        new_plan: { type: 'string', description: 'Name of the new plan' },
        new_amount_gbp: { type: 'number', description: 'New monthly/annual amount' },
        effective_from: { type: 'string', description: 'When to apply: immediate or next_billing' },
      },
      required: ['new_plan', 'new_amount_gbp'],
    },
  },
  {
    name: 'pause_subscription',
    description: 'Pause billing for a set period. CONFIRM tier — confirm pause duration with customer. Good alternative to cancellation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pause_until: { type: 'string', description: 'Date to resume billing (YYYY-MM-DD)' },
        reason: { type: 'string' },
      },
      required: ['pause_until'],
    },
  },
  {
    name: 'cancel_subscription',
    description: 'Cancel the subscription. CONFIRM tier. Always offer a pause or downgrade first as a retention step before cancelling.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string' },
        effective: { type: 'string', enum: ['immediate', 'end_of_period'], description: 'When cancellation takes effect' },
        retention_offered: { type: 'boolean', description: 'Set true if you already offered pause/downgrade and customer still wants to cancel' },
      },
      required: ['reason', 'effective'],
    },
  },
  {
    name: 'reactivate_subscription',
    description: 'Reactivate a paused or recently cancelled subscription. AUTO tier.',
    input_schema: {
      type: 'object' as const,
      properties: {
        plan_override: { type: 'string', description: 'Optionally reactivate on a different plan' },
      },
      required: [],
    },
  },
]

export function makeSubscriptionHandlers(customerId: string, customerEmail: string, customerName: string) {
  return {
    get_subscription_status: async () => {
      const sub = first(
        `SELECT id, plan, amount_gbp, billing_cycle, status, next_billing_at, paused_until, cancelled_at
         FROM subscriptions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`, customerId
      )
      return { success: true, verified: true, subscription: sub ?? null, has_subscription: !!sub }
    },

    change_plan: async (input: Record<string, unknown>) => {
      const { new_plan, new_amount_gbp, effective_from } = input as { new_plan: string; new_amount_gbp: number; effective_from?: string }
      const sub = first<{ id: string; plan: string; amount_gbp: number }>(`SELECT id, plan, amount_gbp FROM subscriptions WHERE customer_id = ? AND status != 'cancelled' ORDER BY created_at DESC LIMIT 1`, customerId)
      if (!sub) return { success: false, verified: false, error: 'No active subscription found' }

      run(`UPDATE subscriptions SET plan = ?, amount_gbp = ?, updated_at = datetime('now') WHERE id = ?`, new_plan, new_amount_gbp, sub.id)
      const updated = first<{ plan: string; amount_gbp: number }>(`SELECT plan, amount_gbp FROM subscriptions WHERE id = ?`, sub.id)
      const verified = updated?.plan === new_plan && updated?.amount_gbp === new_amount_gbp

      if (verified) {
        const direction = new_amount_gbp > sub.amount_gbp ? 'Upgrade' : 'Downgrade'
        await sendEmail(customerEmail, `Plan ${direction} Confirmed`,
          `Hi ${customerName},\n\nYour plan has been changed from ${sub.plan} to ${new_plan}.\n\nNew billing: £${new_amount_gbp}/month\nEffective: ${effective_from === 'immediate' ? 'immediately' : 'from your next billing date'}\n\nThank you for staying with us.`)
      }

      return { success: verified, verified, authority_tier: 'confirm', previous_plan: sub.plan, new_plan, new_amount_gbp }
    },

    pause_subscription: async (input: Record<string, unknown>) => {
      const { pause_until, reason } = input as { pause_until: string; reason?: string }
      const sub = first<{ id: string; plan: string }>(`SELECT id, plan FROM subscriptions WHERE customer_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`, customerId)
      if (!sub) return { success: false, verified: false, error: 'No active subscription to pause' }

      run(`UPDATE subscriptions SET status = 'paused', paused_until = ?, updated_at = datetime('now') WHERE id = ?`, pause_until, sub.id)
      const updated = first<{ status: string; paused_until: string }>(`SELECT status, paused_until FROM subscriptions WHERE id = ?`, sub.id)
      const verified = updated?.status === 'paused'

      if (verified) {
        await sendEmail(customerEmail, 'Subscription Paused',
          `Hi ${customerName},\n\nYour ${sub.plan} subscription has been paused.\n\nResumes: ${pause_until}\nReason: ${reason ?? 'at customer request'}\n\nNo charges will be made during the pause period. You can reactivate early at any time.`)
      }

      return { success: verified, verified, authority_tier: 'confirm', paused_until: pause_until }
    },

    cancel_subscription: async (input: Record<string, unknown>) => {
      const { reason, effective, retention_offered } = input as { reason: string; effective: string; retention_offered?: boolean }

      if (!retention_offered) {
        return {
          success: false, verified: false, authority_tier: 'confirm',
          retention_prompt: true,
          message: 'Before cancelling, offer the customer a pause (up to 3 months) or a downgrade to a lower plan. Only cancel if they explicitly decline.',
        }
      }

      const sub = first<{ id: string; plan: string; next_billing_at: string }>(
        `SELECT id, plan, next_billing_at FROM subscriptions WHERE customer_id = ? AND status NOT IN ('cancelled') ORDER BY created_at DESC LIMIT 1`, customerId
      )
      if (!sub) return { success: false, verified: false, error: 'No active subscription found' }

      const cancelDate = effective === 'immediate' ? new Date().toISOString() : (sub.next_billing_at ?? new Date().toISOString())
      run(`UPDATE subscriptions SET status = 'cancelled', cancelled_at = ?, updated_at = datetime('now') WHERE id = ?`, cancelDate, sub.id)

      const updated = first<{ status: string }>(`SELECT status FROM subscriptions WHERE id = ?`, sub.id)
      const verified = updated?.status === 'cancelled'

      if (verified) {
        await sendEmail(customerEmail, 'Subscription Cancellation Confirmed',
          `Hi ${customerName},\n\nYour ${sub.plan} subscription has been cancelled.\n\nEffective: ${effective === 'immediate' ? 'immediately' : `end of current period (${sub.next_billing_at?.slice(0, 10)})`}\nReason recorded: ${reason}\n\nYou can reactivate at any time. We're sorry to see you go.`)
      }

      return { success: verified, verified, authority_tier: 'confirm', cancelled_at: cancelDate, plan: sub.plan }
    },

    reactivate_subscription: async (input: Record<string, unknown>) => {
      const sub = first<{ id: string; plan: string; amount_gbp: number }>(
        `SELECT id, plan, amount_gbp FROM subscriptions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`, customerId
      )
      if (!sub) return { success: false, verified: false, error: 'No subscription record found to reactivate' }

      const newPlan = (input['plan_override'] as string) ?? sub.plan
      run(`UPDATE subscriptions SET status = 'active', paused_until = NULL, cancelled_at = NULL, plan = ?, updated_at = datetime('now') WHERE id = ?`, newPlan, sub.id)

      const updated = first<{ status: string }>(`SELECT status FROM subscriptions WHERE id = ?`, sub.id)
      const verified = updated?.status === 'active'

      if (verified) {
        await sendEmail(customerEmail, 'Subscription Reactivated',
          `Hi ${customerName},\n\nGreat news — your ${newPlan} subscription has been reactivated. Welcome back!\n\nYour next billing date will be set from today.`)
      }

      return { success: verified, verified, authority_tier: 'auto', plan: newPlan }
    },
  }
}
