import { first, all } from './db.js'

export type AuthorityTier = 'auto' | 'confirm' | 'escalate'

interface AuthorityRule {
  tier: AuthorityTier
  threshold: Record<string, unknown> | null
  description: string
}

// Default authority config — overridden by authority_config table
const DEFAULTS: Record<string, AuthorityRule> = {
  get_customer_account:        { tier: 'auto',    threshold: null, description: 'Read-only lookup' },
  get_order_status:            { tier: 'auto',    threshold: null, description: 'Read-only lookup' },
  get_subscription_status:     { tier: 'auto',    threshold: null, description: 'Read-only lookup' },
  get_invoice_history:         { tier: 'auto',    threshold: null, description: 'Read-only lookup' },
  search_knowledge_base:       { tier: 'auto',    threshold: null, description: 'Read-only lookup' },
  send_password_reset:         { tier: 'auto',    threshold: null, description: 'Send reset link to registered email' },
  unlock_account:              { tier: 'auto',    threshold: null, description: 'Unlock locked account' },
  update_profile:              { tier: 'auto',    threshold: null, description: 'Update non-security profile fields' },
  reactivate_account:          { tier: 'auto',    threshold: null, description: 'Reactivate cancelled account' },
  retry_payment:               { tier: 'auto',    threshold: null, description: 'Retry last failed payment' },
  send_payment_update_link:    { tier: 'auto',    threshold: null, description: 'Send secure payment method update link' },
  reactivate_subscription:     { tier: 'auto',    threshold: null, description: 'Reactivate a paused/cancelled subscription' },
  initiate_return:             { tier: 'auto',    threshold: { max_order_age_days: 30 }, description: 'Generate return label for orders within 30 days' },
  apply_goodwill_credit:       { tier: 'auto',    threshold: { max_gbp: 25 }, description: 'Apply credit up to £25 without approval' },
  issue_refund:                { tier: 'confirm', threshold: { auto_under_gbp: 50, confirm_under_gbp: 500 }, description: 'Auto under £50, confirm £50-£500, escalate above £500' },
  reschedule_delivery:         { tier: 'confirm', threshold: null, description: 'Requires customer to confirm new date/address' },
  cancel_order:                { tier: 'confirm', threshold: null, description: 'Requires customer confirmation' },
  reship_item:                 { tier: 'confirm', threshold: null, description: 'Requires customer confirmation before reshipping' },
  change_plan:                 { tier: 'confirm', threshold: null, description: 'Requires customer confirmation of new plan and price' },
  pause_subscription:          { tier: 'confirm', threshold: null, description: 'Requires customer confirmation of pause period' },
  cancel_subscription:         { tier: 'confirm', threshold: null, description: 'Requires customer confirmation; offer retention first' },
  request_customer_confirmation: { tier: 'auto', threshold: null, description: 'Ask customer to confirm a pending action' },
  escalate_to_human:           { tier: 'auto',    threshold: null, description: 'Always allowed — escalation is never blocked' },
}

export function getAuthority(actionName: string): AuthorityRule {
  const dbRule = first<{ tier: string; threshold_json: string; description: string }>(
    `SELECT tier, threshold_json, description FROM authority_config WHERE action_name = ?`, actionName
  )
  if (dbRule) {
    return {
      tier: dbRule.tier as AuthorityTier,
      threshold: dbRule.threshold_json ? JSON.parse(dbRule.threshold_json) : null,
      description: dbRule.description,
    }
  }
  return DEFAULTS[actionName] ?? { tier: 'escalate', threshold: null, description: 'Unknown action — escalate by default' }
}

export function getRefundTier(amountGbp: number): AuthorityTier {
  const rule = getAuthority('issue_refund')
  const t = rule.threshold as { auto_under_gbp: number; confirm_under_gbp: number } | null
  if (!t) return 'confirm'
  if (amountGbp <= t.auto_under_gbp) return 'auto'
  if (amountGbp <= t.confirm_under_gbp) return 'confirm'
  return 'escalate'
}

export function getAllAuthorityConfig(): Record<string, unknown>[] {
  const dbRules = all<{ action_name: string; tier: string; threshold_json: string; description: string; updated_at: string }>(
    `SELECT action_name, tier, threshold_json, description, updated_at FROM authority_config ORDER BY action_name`
  )
  const dbMap = Object.fromEntries(dbRules.map(r => [r.action_name, r]))

  return Object.entries(DEFAULTS).map(([name, def]) => ({
    action_name: name,
    tier: dbMap[name]?.tier ?? def.tier,
    threshold: dbMap[name]?.threshold_json ? JSON.parse(dbMap[name].threshold_json) : def.threshold,
    description: dbMap[name]?.description ?? def.description,
    source: dbMap[name] ? 'db' : 'default',
  }))
}
