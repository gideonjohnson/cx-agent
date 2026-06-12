import Anthropic from '@anthropic-ai/sdk'
import { getConfig } from './config.js'

let _client: Anthropic | null = null

export function resetClient(): void {
  _client = null
}

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: getConfig('ANTHROPIC_API_KEY') ?? '' })
  }
  return _client
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_, prop: string) {
    return (getClient() as any)[prop]
  },
})
