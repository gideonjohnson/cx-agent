import { Database } from 'bun:sqlite'
import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'
import { join } from 'path'

const dataDir = process.env.CX_DATA_DIR || './data'
mkdirSync(dataDir, { recursive: true })

export const db = new Database(join(dataDir, 'cx.db'), { create: true })
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

export const uid = () => randomUUID().replace(/-/g, '').slice(0, 16)

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    tier TEXT NOT NULL DEFAULT 'standard',
    account_status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    external_id TEXT,
    status TEXT NOT NULL DEFAULT 'processing',
    items_json TEXT NOT NULL DEFAULT '[]',
    total_gbp REAL NOT NULL DEFAULT 0,
    delivery_address_json TEXT,
    tracking_number TEXT,
    carrier TEXT,
    estimated_delivery TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    plan TEXT NOT NULL,
    amount_gbp REAL NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    status TEXT NOT NULL DEFAULT 'active',
    next_billing_at TEXT,
    paused_until TEXT,
    cancelled_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    subscription_id TEXT REFERENCES subscriptions(id),
    amount_gbp REAL NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    due_at TEXT,
    paid_at TEXT,
    refunded_at TEXT,
    refund_amount_gbp REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    channel TEXT NOT NULL DEFAULT 'web',
    status TEXT NOT NULL DEFAULT 'open',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
    turn_count INTEGER NOT NULL DEFAULT 0,
    resolved_at TEXT,
    resolution_method TEXT,
    escalated INTEGER NOT NULL DEFAULT 0,
    pending_confirmation_json TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    frustration_flag INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS actions_log (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    action_name TEXT NOT NULL,
    authority_tier TEXT NOT NULL,
    input_json TEXT,
    output_json TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 0,
    reversed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_verified_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS authority_config (
    id TEXT PRIMARY KEY,
    action_name TEXT NOT NULL UNIQUE,
    tier TEXT NOT NULL,
    threshold_json TEXT,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS escalations (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    trigger TEXT NOT NULL,
    summary TEXT NOT NULL,
    full_context_json TEXT,
    assigned_to TEXT,
    resolved_at TEXT,
    resolution_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS revenue_events (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    customer_id TEXT NOT NULL REFERENCES customers(id),
    type TEXT NOT NULL,
    trigger TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    outcome TEXT NOT NULL DEFAULT 'pending',
    amount_gbp REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    url TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    headers_json TEXT,
    auth_type TEXT NOT NULL DEFAULT 'none',
    auth_value TEXT,
    auth_header TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS learning_queue (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    customer_message TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    improvement_type TEXT NOT NULL DEFAULT 'phrasing',
    trigger TEXT,
    suggested_correction TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS csat_scores (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    score INTEGER NOT NULL,
    comment TEXT,
    collected_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    subject TEXT,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inbound_messages (
    id TEXT PRIMARY KEY,
    channel TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    customer_id TEXT REFERENCES customers(id),
    subject TEXT,
    body TEXT NOT NULL,
    agent_reply TEXT,
    agent_reply_sent INTEGER NOT NULL DEFAULT 0,
    agent_action TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reply_type TEXT NOT NULL DEFAULT 'direct',
    conversation_id TEXT REFERENCES conversations(id),
    external_id TEXT,
    thread_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    handled_at TEXT
  );
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS insight_reports (
    id TEXT PRIMARY KEY,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    top_issues_json TEXT NOT NULL DEFAULT '[]',
    complaint_clusters_json TEXT NOT NULL DEFAULT '[]',
    competitor_mentions_json TEXT NOT NULL DEFAULT '[]',
    pricing_signals_json TEXT NOT NULL DEFAULT '[]',
    product_signals_json TEXT NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customer_preferences (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE REFERENCES customers(id),
    communication_style TEXT,
    preferred_channel TEXT,
    known_context TEXT,
    language TEXT,
    last_issue_category TEXT,
    interaction_notes TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS voice_calls (
    id TEXT PRIMARY KEY,
    call_sid TEXT NOT NULL UNIQUE,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    customer_id TEXT REFERENCES customers(id),
    conversation_id TEXT REFERENCES conversations(id),
    status TEXT NOT NULL DEFAULT 'in_progress',
    transcript_json TEXT,
    duration_seconds INTEGER,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT
  );
`)

// Migrations for existing DBs
try { db.exec(`ALTER TABLE inbound_messages ADD COLUMN reply_type TEXT NOT NULL DEFAULT 'direct'`) } catch {}
try { db.exec(`ALTER TABLE conversations ADD COLUMN identity_verified INTEGER NOT NULL DEFAULT 0`) } catch {}
try { db.exec(`ALTER TABLE conversations ADD COLUMN verification_channel TEXT`) } catch {}
try { db.exec(`ALTER TABLE conversations ADD COLUMN ai_csat_score REAL`) } catch {}
try { db.exec(`ALTER TABLE conversations ADD COLUMN ai_csat_reason TEXT`) } catch {}

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...(params as any[])) as T[]
}

export function first<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | null {
  return db.prepare(sql).get(...(params as any[])) as T | null
}

export function run(sql: string, ...params: unknown[]): void {
  db.prepare(sql).run(...(params as any[]))
}
