import { loadConfigIntoEnv } from './lib/config.js'

// Load DB-persisted config into process.env before any module that reads it
loadConfigIntoEnv()

// Start all services
await import('./dashboard/server.js')
await import('./channels/web.js')
await import('./scheduler.js')

// Telegram operator bot (optional — only starts if TELEGRAM_BOT_TOKEN is configured)
const { startTelegramPolling } = await import('./channels/telegram.js')
await startTelegramPolling()
