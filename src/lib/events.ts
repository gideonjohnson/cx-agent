import { run, all, uid } from './db.js'

export function logEvent(type: string, subject: string, description: string): void {
  run('INSERT INTO events (id, type, subject, description) VALUES (?, ?, ?, ?)',
    uid(), type, subject, description)
}

export function getRecentEvents(limit = 20): string {
  const rows = all<{ type: string; subject: string; description: string; created_at: string }>(
    'SELECT type, subject, description, created_at FROM events ORDER BY created_at DESC LIMIT ?', limit
  )
  if (!rows.length) return 'No recent events.'
  return rows.map(e => `[${e.created_at}] ${e.type} — ${e.subject}: ${e.description}`).join('\n')
}
