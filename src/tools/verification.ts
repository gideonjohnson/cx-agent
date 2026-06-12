import { first, run, uid } from '../lib/db.js'
import { sendEmail } from '../lib/email.js'
import { getConfig } from '../lib/config.js'

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export const verificationTools = [
  {
    name: 'send_verification_code',
    description: 'Send a 6-digit verification code to the customer\'s registered email address. Use this before disclosing sensitive account data in web chat when identity has not been verified.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'verify_identity',
    description: 'Verify a code the customer provides. If correct, the conversation is marked as identity-verified and you may proceed with account disclosures.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string', description: '6-digit code the customer provided' },
      },
      required: ['code'],
    },
  },
]

export function makeVerificationHandlers(customerId: string, conversationId: string) {
  return {
    send_verification_code: async () => {
      if (getConfig('REQUIRE_WEB_IDENTITY_VERIFICATION') !== 'on') {
        // Auto-pass if verification not required
        run(`UPDATE conversations SET identity_verified = 1 WHERE id = ?`, conversationId)
        return { success: true, verified: true, authority_tier: 'auto', skipped: true, message: 'Identity verification not required — access granted.' }
      }

      const customer = first<{ email: string; name: string }>(`SELECT email, name FROM customers WHERE id = ?`, customerId)
      if (!customer) return { success: false, verified: false, error: 'Customer not found' }

      // Invalidate any existing codes
      run(`UPDATE verification_codes SET used = 1 WHERE conversation_id = ? AND used = 0`, conversationId)

      const code = generateCode()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      run(
        `INSERT INTO verification_codes (id, conversation_id, code, expires_at) VALUES (?, ?, ?, ?)`,
        uid(), conversationId, code, expiresAt
      )

      await sendEmail(
        customer.email,
        'Your verification code',
        `Hi ${customer.name},\n\nYour verification code is: ${code}\n\nThis code expires in 15 minutes. Do not share it with anyone.\n\nIf you did not request this, please ignore this email.`
      )

      return {
        success: true, verified: false, authority_tier: 'auto',
        message: `Verification code sent to the customer's registered email. Ask them to provide the code.`,
      }
    },

    verify_identity: async (input: Record<string, unknown>) => {
      const { code } = input as { code: string }

      if (getConfig('REQUIRE_WEB_IDENTITY_VERIFICATION') !== 'on') {
        run(`UPDATE conversations SET identity_verified = 1 WHERE id = ?`, conversationId)
        return { success: true, verified: true, authority_tier: 'auto', identity_confirmed: true }
      }

      const record = first<{ id: string; code: string; expires_at: string; used: number }>(
        `SELECT id, code, expires_at, used FROM verification_codes
         WHERE conversation_id = ? AND used = 0 ORDER BY created_at DESC LIMIT 1`,
        conversationId
      )

      if (!record) return { success: false, verified: false, error: 'No active verification code found. Call send_verification_code first.' }
      if (record.used) return { success: false, verified: false, error: 'Code already used.' }
      if (new Date(record.expires_at) < new Date()) return { success: false, verified: false, error: 'Code has expired. Call send_verification_code to issue a new one.' }
      if (record.code !== code.trim()) return { success: false, verified: false, error: 'Incorrect code. Please ask the customer to check the email and try again.' }

      run(`UPDATE verification_codes SET used = 1 WHERE id = ?`, record.id)
      run(`UPDATE conversations SET identity_verified = 1 WHERE id = ?`, conversationId)

      return { success: true, verified: true, authority_tier: 'auto', identity_confirmed: true, message: 'Identity verified successfully.' }
    },
  }
}
