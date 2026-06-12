import { all, run } from '../lib/db.js'

export const knowledgeTools = [
  {
    name: 'search_knowledge_base',
    description: 'Search the knowledge base for policies, product information, and resolution guidance. Always call this when you need to state a policy or confirm what the company offers.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'What to search for' },
        category: { type: 'string', description: 'Optional: filter by category (billing, returns, technical, account, delivery)' },
      },
      required: ['query'],
    },
  },
]

export const knowledgeHandlers = {
  search_knowledge_base: async (input: Record<string, unknown>) => {
    const { query, category } = input as { query: string; category?: string }
    const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 3)

    const entries = all<{ id: string; category: string; title: string; content: string; source: string; usage_count: number }>(
      `SELECT id, category, title, content, source, usage_count FROM knowledge_base
       WHERE active = 1 ${category ? `AND category = '${category}'` : ''}
       ORDER BY usage_count DESC LIMIT 15`
    )

    const scored = entries.map(e => {
      const text = (e.title + ' ' + e.content).toLowerCase()
      const matches = words.filter(w => text.includes(w)).length
      const relevance = Math.round((matches / Math.max(words.length, 1)) * 100)
      return { ...e, relevance }
    }).filter(e => e.relevance >= 20).sort((a, b) => b.relevance - a.relevance).slice(0, 3)

    if (scored.length > 0) {
      // Increment usage count for matched entries
      for (const e of scored) {
        run(`UPDATE knowledge_base SET usage_count = usage_count + 1 WHERE id = ?`, e.id)
      }
    }

    return {
      success: true,
      verified: true,
      results: scored.length > 0 ? scored : [],
      message: scored.length === 0
        ? 'No matching KB entries found. Use your judgment but acknowledge any uncertainty to the customer.'
        : `Found ${scored.length} relevant entry/entries. Use these to ground your response.`,
    }
  },
}
