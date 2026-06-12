export interface SentimentResult {
  frustrated: boolean
  vulnerable: boolean
  score: number // 0 = calm, 1 = very frustrated
  signals: string[]
}

const FRUSTRATION_PATTERNS = [
  /still (not |broken|wrong|missing)/i,
  /third (time|contact|call|email)/i,
  /second (time|contact|call|email)/i,
  /again.{0,20}(same|issue|problem)/i,
  /unacceptable/i,
  /ridiculous/i,
  /appalling/i,
  /disgusting/i,
  /worst.{0,20}(service|experience|company)/i,
  /never.{0,20}again/i,
  /cancel.{0,20}(everything|account|all)/i,
  /social media/i,
  /twitter|facebook|instagram/i,
  /trading standards/i,
  /ombudsman/i,
  /lawyer|solicitor|legal action|sue/i,
  /bbc|watchdog|press/i,
  /\b(wtf|what the f|f\*\*k)\b/i,
]

const VULNERABILITY_PATTERNS = [
  /hospital|surgery|medical/i,
  /funeral|bereavement|died|death/i,
  /disability|disabled/i,
  /can't afford|no money|financial difficulty|hardship/i,
  /mental health|anxiety|depression|panic/i,
  /elderly|carer|dementia/i,
  /domestic.{0,20}(abuse|violence)/i,
  /crisis/i,
]

const CAPS_THRESHOLD = 0.4 // 40% caps = frustrated

function hasManyExclamations(text: string): boolean {
  return (text.match(/!/g) || []).length >= 3
}

function capsRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, '')
  if (letters.length < 10) return 0
  const upper = text.replace(/[^A-Z]/g, '').length
  return upper / letters.length
}

export function analyzeSentiment(message: string): SentimentResult {
  const signals: string[] = []
  let score = 0

  for (const pattern of FRUSTRATION_PATTERNS) {
    if (pattern.test(message)) {
      signals.push(pattern.source.replace(/[\\^$.*+?()[\]{}|]/g, '').slice(0, 30))
      score += 0.25
    }
  }

  if (capsRatio(message) > CAPS_THRESHOLD) {
    signals.push('CAPS lock')
    score += 0.3
  }

  if (hasManyExclamations(message)) {
    signals.push('multiple exclamation marks')
    score += 0.15
  }

  const vulnerable = VULNERABILITY_PATTERNS.some(p => p.test(message))
  if (vulnerable) signals.push('vulnerability signal')

  return {
    frustrated: score >= 0.5,
    vulnerable,
    score: Math.min(score, 1),
    signals,
  }
}

export function shouldEscalateForSentiment(
  message: string,
  priorContacts: number,
  priorFrustrationFlags: number
): { escalate: boolean; trigger: string; reason: string } | null {
  const sentiment = analyzeSentiment(message)

  if (sentiment.vulnerable) {
    return {
      escalate: true,
      trigger: 'vulnerability',
      reason: `Vulnerability signal detected: ${sentiment.signals.join(', ')}`,
    }
  }

  if (priorContacts >= 2 && priorFrustrationFlags >= 1) {
    return {
      escalate: true,
      trigger: 'repeated_contact',
      reason: `${priorContacts} prior contacts with prior frustration — customer needs human attention`,
    }
  }

  if (sentiment.frustrated) {
    return {
      escalate: true,
      trigger: 'frustration',
      reason: `High frustration detected: ${sentiment.signals.join(', ')}`,
    }
  }

  return null
}
