import Anthropic from '@anthropic-ai/sdk'
import { first, run, all } from './db.js'

export function getConfig(key: string): string | undefined {
  if (process.env[key]) return process.env[key]
  const row = first<{ value: string }>(`SELECT value FROM config WHERE key = ?`, key)
  return row?.value ?? undefined
}

export function setConfig(key: string, value: string): void {
  run(
    `INSERT INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    key, value
  )
  process.env[key] = value
}

export function loadConfigIntoEnv(): void {
  const rows = all<{ key: string; value: string }>(`SELECT key, value FROM config`)
  for (const row of rows) {
    if (!process.env[row.key]) {
      process.env[row.key] = row.value
    }
  }
  if (rows.length > 0) {
    console.log(`[config] Loaded ${rows.length} key(s) from DB`)
  }
}

export async function validateAnthropicKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = new Anthropic({ apiKey: key })
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    return { valid: true }
  } catch (e: any) {
    const status = e?.status ?? 0
    if (status === 401) return { valid: false, error: 'Invalid API key — authentication failed' }
    if (status === 403) return { valid: false, error: 'Key lacks permission for this model' }
    if (status === 429 || status === 500 || status === 529 || status === 503) return { valid: true }
    return { valid: false, error: String(e?.message ?? e) }
  }
}
