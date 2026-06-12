import { anthropic } from './client.js'
import { all, run, uid } from './db.js'

interface KbProposal {
  title: string
  category: string
  content: string
  addresses_indices: number[]
}

export async function runSelfImprovement(): Promise<number> {
  const candidates = all<{
    id: string
    conversation_id: string
    customer_message: string
    agent_response: string
    trigger: string | null
    improvement_type: string
  }>(
    `SELECT id, conversation_id, customer_message, agent_response, trigger, improvement_type
     FROM learning_queue
     WHERE status = 'pending'
       AND improvement_type IN ('substance', 'escalation')
       AND suggested_correction IS NULL
     ORDER BY created_at DESC
     LIMIT 40`
  )

  if (candidates.length === 0) return 0

  const context = candidates.map((c, i) =>
    `[${i + 1}] Type: ${c.improvement_type} | Trigger: ${c.trigger ?? 'unknown'}\nCustomer: ${c.customer_message.slice(0, 250)}\nAgent: ${c.agent_response.slice(0, 250)}`
  ).join('\n\n')

  try {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: `You are a customer service quality coach reviewing failed or escalated agent conversations.

Your job: propose Knowledge Base entries that would have given the agent the information it needed to resolve these cases without escalating or failing.

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "title": "Clear, specific KB entry title",
    "category": "billing|returns|delivery|technical|account|policy|general",
    "content": "The exact policy, procedure, or information the agent needed. Be specific and complete. Write it as ground truth the agent can quote directly.",
    "addresses_indices": [1, 3]
  }
]

Rules:
- Only propose entries for cases where the agent lacked information — not where it showed poor judgment
- Each entry must be genuinely useful and actionable
- content should be 2-5 sentences of concrete policy/procedure
- If no entries can be proposed, return []
- Maximum 6 proposals`,
      messages: [{ role: 'user', content: context }],
    })

    const text = res.content[0].type === 'text' ? res.content[0].text.trim() : '[]'
    let proposals: KbProposal[] = []
    try {
      proposals = JSON.parse(text) as KbProposal[]
    } catch {
      const m = text.match(/\[[\s\S]*\]/)
      if (m) try { proposals = JSON.parse(m[0]) as KbProposal[] } catch {}
    }

    if (!Array.isArray(proposals)) return 0

    let created = 0
    for (const p of proposals) {
      if (!p.title || !p.content || !p.category) continue

      const refConv = candidates[0].conversation_id
      const entryId = uid()

      run(
        `INSERT INTO learning_queue
           (id, conversation_id, customer_message, agent_response, improvement_type, trigger, suggested_correction, status)
         VALUES (?, ?, ?, ?, 'agent_proposed', 'self_improve', ?, 'pending')`,
        entryId,
        refConv,
        `[Agent-identified gap] ${p.title}`,
        `Addresses ${(p.addresses_indices ?? []).length} flagged conversation(s)`,
        JSON.stringify({ title: p.title, category: p.category, content: p.content })
      )
      created++
    }

    return created
  } catch {
    return 0
  }
}
