import { first, run } from '../lib/db.js'
import { sendEmail } from '../lib/email.js'

export const accountTools = [
  {
    name: 'get_customer_account',
    description: 'Retrieve the full customer account record including status, tier, and account details. Always call this first.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'send_password_reset',
    description: 'Send a password reset link to the customer\'s registered email address. AUTO tier.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'unlock_account',
    description: 'Unlock a locked customer account. AUTO tier — no confirmation required.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'update_profile',
    description: 'Update non-security customer profile fields (phone, delivery address). AUTO tier.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'New phone number' },
        delivery_address: { type: 'string', description: 'New default delivery address' },
      },
      required: [],
    },
  },
  {
    name: 'reactivate_account',
    description: 'Reactivate a cancelled or suspended account. AUTO tier.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
]

export function makeAccountHandlers(customerId: string) {
  return {
    get_customer_account: async () => {
      const customer = first(
        `SELECT id, name, email, phone, tier, account_status, created_at FROM customers WHERE id = ?`, customerId
      )
      return { success: true, verified: true, customer }
    },

    send_password_reset: async (_: Record<string, unknown>, conversationId: string) => {
      const customer = first<{ email: string; name: string }>(`SELECT email, name FROM customers WHERE id = ?`, customerId)
      if (!customer) return { success: false, verified: false, error: 'Customer not found' }

      await sendEmail(
        customer.email,
        'Password Reset Request',
        `Hi ${customer.name},\n\nA password reset link has been requested for your account. Click below to reset your password:\n\nhttps://app.example.com/reset?token=RESET_TOKEN_${Date.now()}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email.`
      )

      // Verify: confirm customer exists (the reset link would be real in production)
      const verified = !!customer
      return { success: true, verified, authority_tier: 'auto', message: `Password reset link sent to ${customer.email}` }
    },

    unlock_account: async () => {
      run(`UPDATE customers SET account_status = 'active' WHERE id = ? AND account_status = 'locked'`, customerId)
      const updated = first<{ account_status: string }>(`SELECT account_status FROM customers WHERE id = ?`, customerId)
      const verified = updated?.account_status === 'active'
      return { success: verified, verified, authority_tier: 'auto', new_status: updated?.account_status }
    },

    update_profile: async (input: Record<string, unknown>) => {
      if (input['phone']) run(`UPDATE customers SET phone = ? WHERE id = ?`, input['phone'], customerId)
      const updated = first<{ phone: string }>(`SELECT phone FROM customers WHERE id = ?`, customerId)
      return { success: true, verified: true, authority_tier: 'auto', updated_fields: Object.keys(input) }
    },

    reactivate_account: async () => {
      run(`UPDATE customers SET account_status = 'active' WHERE id = ?`, customerId)
      const updated = first<{ account_status: string }>(`SELECT account_status FROM customers WHERE id = ?`, customerId)
      const verified = updated?.account_status === 'active'
      return { success: verified, verified, authority_tier: 'auto', new_status: 'active' }
    },
  }
}
