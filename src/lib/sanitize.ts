import { logEvent } from './events.js'

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|rules?|guidelines?|prompts?|context)/i,
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /\bact\s+as\s+(a|an|the|if)\s+/i,
  /forget\s+(everything|all|your|what)/i,
  /disregard\s+(all|your|previous|prior)/i,
  /new\s+(instructions?|rules?|persona|role|system\s+prompt)/i,
  /\[SYSTEM\]/i,
  /<\s*system\s*>/i,
  /\bDAN\b/,
  /jailbreak/i,
  /override\s+(your|the)\s+(system|instructions?|prompt|rules?)/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /roleplay\s+as\s+/i,
  /your\s+real\s+(instructions?|prompt|system|rules?)/i,
  /\bsystem\s+prompt\b/i,
  /\bprompt\s+injection\b/i,
]

// Sanitize customer-supplied text before it reaches the LLM.
// Strips injection attempts, logs security events, preserves legitimate content.
export function sanitizeCustomerInput(
  raw: string,
  conversationId?: string
): { sanitized: string; injectionAttempt: boolean } {
  const injectionAttempt = INJECTION_PATTERNS.some(p => p.test(raw))

  if (!injectionAttempt) return { sanitized: raw, injectionAttempt: false }

  if (conversationId) {
    logEvent('security_injection_attempt', conversationId, raw.slice(0, 200))
  }

  let sanitized = raw
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(new RegExp(pattern.source, 'gi'), '')
  }
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim()

  // If nothing legitimate remains, substitute a neutral stub
  if (!sanitized || sanitized.length < 5) {
    sanitized = 'I have a question about my account.'
  }

  return { sanitized, injectionAttempt: true }
}
