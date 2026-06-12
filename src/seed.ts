import { db, run, uid } from './lib/db.js'

console.log('[seed] Seeding CX Agent database...')

db.exec(`
  DELETE FROM csat_scores;
  DELETE FROM actions_log;
  DELETE FROM messages;
  DELETE FROM escalations;
  DELETE FROM conversations;
  DELETE FROM invoices;
  DELETE FROM subscriptions;
  DELETE FROM orders;
  DELETE FROM customers;
  DELETE FROM knowledge_base;
  DELETE FROM authority_config;
  DELETE FROM events;
`)

// ── Customers ───────────────────────────────────────────────────────────────
const c1 = uid(), c2 = uid(), c3 = uid(), c4 = uid(), c5 = uid(), c6 = uid()
run(`INSERT INTO customers (id,name,email,phone,tier,account_status) VALUES (?,?,?,?,?,?)`,
  c1, 'James Thornton', 'james.thornton@acme.com', '07711 234567', 'enterprise', 'active')
run(`INSERT INTO customers (id,name,email,phone,tier,account_status) VALUES (?,?,?,?,?,?)`,
  c2, 'Elena Rodriguez', 'elena.r@techstart.io', '07822 345678', 'vip', 'active')
run(`INSERT INTO customers (id,name,email,phone,tier,account_status) VALUES (?,?,?,?,?,?)`,
  c3, 'David Park', 'dpark@gmail.com', '07933 456789', 'standard', 'active')
run(`INSERT INTO customers (id,name,email,phone,tier,account_status) VALUES (?,?,?,?,?,?)`,
  c4, 'Amara Osei', 'amara.osei@consulting.co', '07844 567890', 'vip', 'locked')
run(`INSERT INTO customers (id,name,email,phone,tier,account_status) VALUES (?,?,?,?,?,?)`,
  c5, 'Tom Berkley', 'tomberkley@email.com', null, 'standard', 'active')
run(`INSERT INTO customers (id,name,email,phone,tier,account_status) VALUES (?,?,?,?,?,?)`,
  c6, 'Fatima Al-Hassan', 'fatima.h@enterprise.com', '07955 678901', 'enterprise', 'active')

// ── Subscriptions ────────────────────────────────────────────────────────────
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,datetime('now','+18 days'))`,
  uid(), c1, 'Enterprise', 599, 'monthly', 'active')
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,datetime('now','+5 days'))`,
  uid(), c2, 'Professional', 129, 'monthly', 'active')
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,datetime('now','+22 days'))`,
  uid(), c3, 'Starter', 29, 'monthly', 'active')
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,paused_until) VALUES (?,?,?,?,?,?,datetime('now','+45 days'))`,
  uid(), c4, 'Professional', 129, 'monthly', 'paused')
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,cancelled_at) VALUES (?,?,?,?,?,?,datetime('now','-10 days'))`,
  uid(), c5, 'Starter', 29, 'monthly', 'cancelled')
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,datetime('now','+3 days'))`,
  uid(), c6, 'Enterprise', 599, 'monthly', 'active')

// ── Orders ───────────────────────────────────────────────────────────────────
function daysAgo(d: number) { return new Date(Date.now() - d * 86400000).toISOString() }
function daysFromNow(d: number) { return new Date(Date.now() + d * 86400000).toISOString() }

const o1 = uid(), o2 = uid(), o3 = uid(), o4 = uid()
run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,tracking_number,carrier,estimated_delivery) VALUES (?,?,?,?,?,?,?,?,?)`,
  o1, c3, 'ORD-4521', 'shipped',
  JSON.stringify([{ name: 'Pro Keyboard', qty: 1, price: 149.99 }, { name: 'USB-C Hub', qty: 2, price: 34.99 }]),
  219.97, 'JD000123456789GB', 'Royal Mail', daysFromNow(2))

run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,estimated_delivery) VALUES (?,?,?,?,?,?,?)`,
  o2, c2, 'ORD-4489', 'processing',
  JSON.stringify([{ name: 'Standing Desk Mat', qty: 1, price: 79.99 }]),
  79.99, daysFromNow(4))

run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,tracking_number,carrier) VALUES (?,?,?,?,?,?,?,?)`,
  o3, c1, 'ORD-4401', 'delivered',
  JSON.stringify([{ name: 'Monitor Arm', qty: 2, price: 89.99 }]),
  179.98, 'DPD987654321', 'DPD')

run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,estimated_delivery,created_at) VALUES (?,?,?,?,?,?,?,?)`,
  o4, c5, 'ORD-4188', 'processing',
  JSON.stringify([{ name: 'Wireless Mouse', qty: 1, price: 45.00 }]),
  45.00, daysFromNow(1), daysAgo(35)) // 35 days old — outside return window

// ── Invoices ──────────────────────────────────────────────────────────────────
const inv1 = uid(), inv2 = uid(), inv3 = uid(), inv4 = uid()
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at,paid_at) VALUES (?,?,?,?,?,?,datetime('now','-5 days'))`,
  inv1, c1, 599, 'Enterprise Plan — June 2026', 'paid', daysAgo(5))
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at) VALUES (?,?,?,?,?,?)`,
  inv2, c6, 599, 'Enterprise Plan — June 2026', 'overdue', daysAgo(14))
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at,paid_at) VALUES (?,?,?,?,?,?,datetime('now','-2 days'))`,
  inv3, c2, 129, 'Professional Plan — June 2026', 'paid', daysAgo(2))
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at,paid_at,refunded_at,refund_amount_gbp) VALUES (?,?,?,?,?,?,datetime('now','-20 days'),datetime('now','-19 days'),?)`,
  inv4, c3, 29, 'Starter Plan — May 2026', 'refunded', daysAgo(20), 29)

// ── Knowledge Base ────────────────────────────────────────────────────────────
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(), 'returns', 'Returns policy',
  'Customers can return any item within 30 days of the order date for a full refund. Items must be unused and in original packaging. After 30 days, returns are at the discretion of the support team. Digital products are non-refundable once accessed.',
  'policy_doc', 1, 0)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(), 'billing', 'Refund processing times',
  'Refunds are processed within 3-5 business days to the original payment method. Goodwill credits are applied immediately to the account balance and used against the next invoice automatically.',
  'policy_doc', 1, 0)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(), 'billing', 'Subscription plans and pricing',
  'Starter: £29/month (1 user, basic features). Professional: £129/month (up to 10 users, advanced features). Enterprise: £599/month (unlimited users, dedicated support, custom integrations). Annual billing saves 20%. All plans include free standard support.',
  'pricing_page', 1, 0)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(), 'account', 'Account access and security',
  'Accounts lock after 5 failed login attempts. Locked accounts can be unlocked by customer support immediately. Password resets are sent to the registered email address and expire after 1 hour. 2FA can be reset by support after identity verification.',
  'policy_doc', 1, 0)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(), 'delivery', 'Delivery times and carriers',
  'Standard delivery: 3-5 business days via Royal Mail. Express delivery: 1-2 business days via DPD (available at checkout). Free standard delivery on orders over £75. International delivery available to EU: 5-10 business days. Tracking is provided for all orders.',
  'policy_doc', 1, 0)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(), 'technical', 'Common technical issues',
  'Most login issues are resolved by clearing browser cache and cookies. Slow performance: try a different browser or disable extensions. If the service is down, check our status page. For persistent issues, collect browser type, OS version, and error messages before escalating.',
  'support_guide', 1, 0)

// ── Sample resolved conversation ─────────────────────────────────────────────
const conv1 = uid()
run(`INSERT INTO conversations (id,customer_id,channel,status,turn_count,resolved_at,resolution_method) VALUES (?,?,?,?,?,datetime('now','-2 hours'),?)`,
  conv1, c3, 'web', 'resolved', 3, 'agent_resolved')
run(`INSERT INTO messages (id,conversation_id,role,content) VALUES (?,?,?,?)`,
  uid(), conv1, 'user', 'I need to return an item I bought last week — it arrived damaged')
run(`INSERT INTO messages (id,conversation_id,role,content) VALUES (?,?,?,?)`,
  uid(), conv1, 'assistant', "I'm sorry to hear your item arrived damaged. I've raised a return for you — your return reference is RET-SAMPLE01. A return label has been sent to dpark@gmail.com. Your refund of £34.99 will be processed within 5 business days once we receive the item.")
run(`INSERT INTO csat_scores (id,conversation_id,score,comment,collected_at) VALUES (?,?,?,?,datetime('now','-1 hour'))`,
  uid(), conv1, 5, 'Really fast, sorted it immediately!')

// ── Events ────────────────────────────────────────────────────────────────────
run(`INSERT INTO events (id,type,subject,description) VALUES (?,?,?,?)`, uid(), 'seed', 'Database seeded', 'Initial seed data loaded')

console.log('[seed] Done.')
console.log('  6 customers (2 enterprise, 2 VIP, 2 standard)')
console.log('  6 subscriptions (active/paused/cancelled)')
console.log('  4 orders (shipped/processing/delivered)')
console.log('  4 invoices (paid/overdue/refunded)')
console.log('  6 knowledge base entries')
console.log('  1 resolved conversation with CSAT score 5')
console.log('')
console.log('Run: bun run dashboard')
