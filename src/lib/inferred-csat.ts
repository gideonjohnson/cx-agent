import { anthropic } from './client.js'
import { all, first, run } from './db.js'

export async function scoreConversationAI(convId: string): Promise<{ score: number; reason: string } | null> {
  const conv = first<{ ai_csat_score: number | null; status: string }>(
    `SELECT ai_csat_score, status FROM conversations WHERE id = ?`, convId
  )
  if (!conv || conv.ai_csat_score != null) return null

  const messages = all<{ role: string; content: string }>(
    `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`, convId
  )
  if (messages.length < 2) return null

  const transcript = messages
    .map(m => `${m.role === 'customer' ? 'CUSTOMER' : 'AGENT'}: ${m.content}`)
    .join('\n\n')

  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You are a CX quality analyst. Score this customer service conversation 1–10.

Scoring criteria:
- Did the agent fully resolve the root cause? (most important)
- Was the resolution fast and clear?
- Was the tone appropriate?
- Did the agent retrieve all needed data without asking avoidable questions?
- Was escalation appropriate or avoidable?

Respond with ONLY a JSON object: {"score": <integer 1-10>, "reason": "<one sentence>"}`,
      messages: [{ role: 'user', content: `Transcript:\n\n${transcript.slice(0, 6000)}` }],
    })

    const text = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    let score = 7
    let reason = 'Auto-scored'
    try {
      const parsed = JSON.parse(text) as { score: number; reason: string }
      score = Math.max(1, Math.min(10, Math.round(Number(parsed.score))))
      reason = String(parsed.reason ?? 'Auto-scored').slice(0, 300)
    } catch {
      const m = text.match(/"score"\s*:\s*(\d+)/)
      if (m) score = Math.max(1, Math.min(10, parseInt(m[1])))
    }

    run(`UPDATE conversations SET ai_csat_score = ?, ai_csat_reason = ? WHERE id = ?`, score, reason, convId)
    return { score, reason }
  } catch {
    return null
  }
}

export async function scoreRecentUnscored(limit = 20): Promise<number> {
  const unscored = all<{ id: string }>(
    `SELECT id FROM conversations
     WHERE status IN ('resolved', 'escalated')
       AND ai_csat_score IS NULL
     ORDER BY resolved_at DESC LIMIT ?`, limit
  )
  let scored = 0
  for (const conv of unscored) {
    const result = await scoreConversationAI(conv.id)
    if (result) scored++
  }
  return scored
}
