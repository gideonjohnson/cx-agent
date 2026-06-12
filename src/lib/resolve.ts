import { anthropic } from './client.js'
import { all, first, run, uid } from './db.js'
import { assembleContext, formatContextForPrompt } from './context.js'
import { shouldEscalateForSentiment } from './sentiment.js'
import { scoreConversationAI } from './inferred-csat.js'
import { upsertPreferences } from './customer-memory.js'
import { mkdirSync, appendFileSync } from 'fs'
import type Anthropic from '@anthropic-ai/sdk'

export interface MediaAttachment {
  type: 'image'
  source:
    | { type: 'url'; url: string }
    | { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string }
}

mkdirSync('./logs', { recursive: true })

export interface ResolverTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ResolveResult {
  response: string
  escalated: boolean
  resolved: boolean
  actionsTaken: string[]
  conversationId: string
}

export async function resolveMessage(
  conversationId: string,
  customerMessage: string,
  systemPrompt: string,
  tools: ResolverTool[],
  handlers: Record<string, (input: Record<string, unknown>, conversationId: string) => Promise<unknown>>,
  model = 'claude-sonnet-4-6',
  mediaAttachments?: MediaAttachment[]
): Promise<ResolveResult> {
  // Assemble fresh context each turn
  const ctx = await assembleContext(conversationId)
  const contextBlock = formatContextForPrompt(ctx)

  // Load conversation history from DB
  const history = all<{ role: string; content: string }>(
    `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    conversationId
  )

  const claudeHistory: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role === 'customer' ? 'user' : 'assistant',
    content: m.content,
  }))

  // Check sentiment before calling Claude
  const priorFrustrationFlags = (first<{ count: number }>(
    `SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND frustration_flag = 1`, conversationId
  ))?.count ?? 0
  const sentiment = shouldEscalateForSentiment(customerMessage, ctx.priorContacts, priorFrustrationFlags)

  // Store customer message
  const msgId = uid()
  run(`INSERT INTO messages (id, conversation_id, role, content, frustration_flag) VALUES (?, ?, ?, ?, ?)`,
    msgId, conversationId, 'customer', customerMessage, sentiment?.escalate ? 1 : 0)
  run(`UPDATE conversations SET last_activity_at = datetime('now'), turn_count = turn_count + 1 WHERE id = ?`, conversationId)

  // Pre-escalate on sentiment if needed
  if (sentiment?.escalate) {
    return await handleEscalation(conversationId, sentiment.trigger, sentiment.reason, ctx, customerMessage)
  }

  // Build messages for Claude — attach media if present
  const userContent: Anthropic.MessageParam['content'] = mediaAttachments?.length
    ? [
        ...mediaAttachments.map(att => ({ type: 'image' as const, source: att.source as Anthropic.ImageBlockParam['source'] })),
        { type: 'text' as const, text: customerMessage },
      ]
    : customerMessage

  const messages: Anthropic.MessageParam[] = [
    ...claudeHistory,
    { role: 'user', content: userContent },
  ]

  const fullSystem = `${systemPrompt}\n\n---\n\n${contextBlock}`
  const actionsTaken: string[] = []
  let finalResponse = ''
  let escalated = false
  let resolved = false
  let totalTokens = 0

  for (let turn = 0; turn < 15; turn++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      temperature: 0.3,
      system: fullSystem,
      tools: tools as Anthropic.Tool[],
      messages,
    })

    totalTokens += response.usage.input_tokens + response.usage.output_tokens

    const textBlocks = response.content.filter(b => b.type === 'text') as Anthropic.TextBlock[]
    const toolBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]

    if (textBlocks.length) finalResponse = textBlocks.map(b => b.text).join('\n')
    if (response.stop_reason === 'end_turn' || !toolBlocks.length) break

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const tb of toolBlocks) {
      let result: unknown
      try {
        const handler = handlers[tb.name]
        result = handler
          ? await handler(tb.input as Record<string, unknown>, conversationId)
          : { error: `No handler for: ${tb.name}` }
      } catch (err) {
        result = { error: String(err) }
      }

      // Log the action
      const actionResult = result as Record<string, unknown>
      if (tb.name !== 'search_knowledge_base' && tb.name !== 'get_customer_account' && !tb.name.startsWith('get_')) {
        run(`INSERT INTO actions_log (id, conversation_id, action_name, authority_tier, input_json, output_json, verified, success) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          uid(), conversationId, tb.name,
          actionResult['authority_tier'] ?? 'auto',
          JSON.stringify(tb.input),
          JSON.stringify(result),
          actionResult['verified'] ? 1 : 0,
          actionResult['success'] ? 1 : 0
        )
        if (actionResult['success']) actionsTaken.push(tb.name)
        if (tb.name === 'escalate_to_human') escalated = true
      }

      toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) })
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })
  }

  // Store agent response
  run(`INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)`,
    uid(), conversationId, 'agent', finalResponse)

  // Mark resolved if agent indicates it
  if (finalResponse.toLowerCase().includes('resolved') || finalResponse.toLowerCase().includes('all done') || finalResponse.toLowerCase().includes('anything else')) {
    run(`UPDATE conversations SET status = 'resolved', resolved_at = datetime('now'), resolution_method = 'agent' WHERE id = ? AND status = 'open'`, conversationId)
    resolved = true
  }
  if (escalated) {
    run(`UPDATE conversations SET status = 'escalated', escalated = 1 WHERE id = ?`, conversationId)
    run(
      `INSERT INTO learning_queue (id, conversation_id, customer_message, agent_response, improvement_type, trigger)
       VALUES (?, ?, ?, ?, 'substance', 'escalation')`,
      uid(), conversationId, customerMessage, finalResponse || '(no response)'
    )
  }

  // Post-resolution: score conversation and update customer memory (fire-and-forget)
  if (resolved || escalated) {
    const conv = first<{ customer_id: string }>(
      `SELECT customer_id FROM conversations WHERE id = ?`, conversationId
    )
    if (conv) {
      scoreConversationAI(conversationId).catch(() => {})

      // Detect language from last customer message and persist preferences
      const langHint = detectLanguage(customerMessage)
      const topAction = actionsTaken[0]
      const issueCategory = topAction
        ? topAction.includes('order') ? 'orders'
          : topAction.includes('refund') || topAction.includes('billing') || topAction.includes('invoice') ? 'billing'
          : topAction.includes('subscription') ? 'subscription'
          : topAction.includes('account') || topAction.includes('password') || topAction.includes('unlock') ? 'account'
          : topAction.includes('return') || topAction.includes('reship') ? 'returns'
          : null
        : null

      if (langHint || issueCategory) {
        upsertPreferences(conv.customer_id, {
          ...(langHint ? { language: langHint } : {}),
          ...(issueCategory ? { last_issue_category: issueCategory } : {}),
        })
      }
    }
  }

  appendFileSync(`./logs/resolver.log`,
    `[${new Date().toISOString()}] conv:${conversationId} (${totalTokens} tokens) actions:[${actionsTaken.join(',')}]\n`)

  return { response: finalResponse, escalated, resolved, actionsTaken, conversationId }

  function detectLanguage(text: string): string | null {
    const frWords = /\b(bonjour|merci|s'il vous|je veux|pouvez-vous|annuler|remboursement)\b/i
    const esWords = /\b(hola|gracias|quiero|cancelar|reembolso|ayuda)\b/i
    const deWords = /\b(hallo|danke|bitte|möchte|kündigen|rückerstattung)\b/i
    if (frWords.test(text)) return 'fr'
    if (esWords.test(text)) return 'es'
    if (deWords.test(text)) return 'de'
    return null
  }
}

async function handleEscalation(
  conversationId: string,
  trigger: string,
  reason: string,
  ctx: Awaited<ReturnType<typeof assembleContext>>,
  lastMessage: string
): Promise<ResolveResult> {
  const escalationId = uid()
  const fullContext = {
    customer: ctx.customer,
    lastMessage,
    priorContacts: ctx.priorContacts,
    trigger,
  }

  run(`INSERT INTO escalations (id, conversation_id, trigger, summary, full_context_json) VALUES (?, ?, ?, ?, ?)`,
    escalationId, conversationId, trigger, reason, JSON.stringify(fullContext))
  run(`UPDATE conversations SET status = 'escalated', escalated = 1 WHERE id = ?`, conversationId)

  const customerName = String(ctx.customer?.['name'] ?? 'there').split(' ')[0]
  const response = trigger === 'vulnerability'
    ? `Hi ${customerName}, I want to make sure you get the right support right now. I'm connecting you with a member of our team who will be with you shortly. They have full context on your situation and can help directly.`
    : `Hi ${customerName}, I can see this has been a frustrating experience and I want to make sure you're properly looked after. I'm escalating this to a senior team member who will contact you shortly with a resolution. Reference: ESC-${escalationId.slice(0, 8)}.`

  run(`INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)`,
    uid(), conversationId, 'agent', response)

  return { response, escalated: true, resolved: false, actionsTaken: [], conversationId }
}
