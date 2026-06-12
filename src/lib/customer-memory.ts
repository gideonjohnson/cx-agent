import { first, run, uid } from './db.js'

export interface CustomerPreferences {
  communication_style: string | null  // 'formal' | 'casual' | 'brief' | 'detailed'
  preferred_channel: string | null
  known_context: string | null        // free text about this customer
  language: string | null
  last_issue_category: string | null
  interaction_notes: string | null    // agent observations
}

export function getPreferences(customerId: string): CustomerPreferences | null {
  return first<CustomerPreferences>(
    `SELECT communication_style, preferred_channel, known_context, language,
            last_issue_category, interaction_notes
     FROM customer_preferences WHERE customer_id = ?`,
    customerId
  )
}

export function upsertPreferences(customerId: string, updates: Partial<CustomerPreferences>): void {
  const existing = first<{ id: string }>(
    `SELECT id FROM customer_preferences WHERE customer_id = ?`, customerId
  )

  if (existing) {
    const fields = Object.entries(updates).filter(([, v]) => v != null && v !== undefined)
    if (!fields.length) return
    const setClauses = fields.map(([k]) => `${k} = ?`).join(', ')
    run(
      `UPDATE customer_preferences SET ${setClauses}, updated_at = datetime('now') WHERE customer_id = ?`,
      ...fields.map(([, v]) => v),
      customerId
    )
  } else {
    const id = uid()
    run(
      `INSERT INTO customer_preferences
         (id, customer_id, communication_style, preferred_channel, known_context,
          language, last_issue_category, interaction_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id, customerId,
      updates.communication_style ?? null,
      updates.preferred_channel ?? null,
      updates.known_context ?? null,
      updates.language ?? null,
      updates.last_issue_category ?? null,
      updates.interaction_notes ?? null
    )
  }
}

export function formatPreferencesForPrompt(prefs: CustomerPreferences): string {
  const lines: string[] = []
  if (prefs.communication_style) lines.push(`Communication style: ${prefs.communication_style}`)
  if (prefs.preferred_channel) lines.push(`Preferred channel: ${prefs.preferred_channel}`)
  if (prefs.language) lines.push(`Language preference: ${prefs.language}`)
  if (prefs.last_issue_category) lines.push(`Last issue type: ${prefs.last_issue_category}`)
  if (prefs.known_context) lines.push(`Known context: ${prefs.known_context}`)
  if (prefs.interaction_notes) lines.push(`Notes: ${prefs.interaction_notes}`)
  return lines.length ? `## Customer Memory\n${lines.join('\n')}` : ''
}
