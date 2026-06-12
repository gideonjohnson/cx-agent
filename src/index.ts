import { loadConfigIntoEnv } from './lib/config.js'

// Load DB-persisted config into process.env before any module that reads it
loadConfigIntoEnv()

// Start all three services
await import('./dashboard/server.js')
await import('./channels/web.js')
await import('./scheduler.js')
