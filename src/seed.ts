import { db, run, uid } from './lib/db.js'

console.log('[seed] Seeding CX Agent database...')

db.exec(`
  DELETE FROM csat_scores;
  DELETE FROM learning_queue;
  DELETE FROM revenue_events;
  DELETE FROM voice_calls;
  DELETE FROM customer_preferences;
  DELETE FROM insight_reports;
  DELETE FROM actions_log;
  DELETE FROM messages;
  DELETE FROM escalations;
  DELETE FROM conversations;
  DELETE FROM inbound_messages;
  DELETE FROM verification_codes;
  DELETE FROM invoices;
  DELETE FROM subscriptions;
  DELETE FROM orders;
  DELETE FROM customers;
  DELETE FROM knowledge_base;
  DELETE FROM authority_config;
  DELETE FROM events;
`)

const da = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
const ha = (h: number) => new Date(Date.now() - h * 3600000).toISOString()

// ── Named customers ───────────────────────────────────────────────────────────
const [c1,c2,c3,c4,c5,c6,c7,c8,c9,c10] = Array.from({length:10}, uid)

for (const [id,name,email,phone,tier,status] of [
  [c1,'James Thornton','james.thornton@acme.com','07711 234567','enterprise','active'],
  [c2,'Elena Rodriguez','elena.r@techstart.io','07822 345678','vip','active'],
  [c3,'David Park','dpark@gmail.com','07933 456789','standard','active'],
  [c4,'Amara Osei','amara.osei@consulting.co','07844 567890','vip','locked'],
  [c5,'Tom Berkley','tomberkley@email.com',null,'standard','active'],
  [c6,'Fatima Al-Hassan','fatima.h@enterprise.com','07955 678901','enterprise','active'],
  [c7,'Sophie Walsh','sophie.walsh@startup.com','07611 789012','standard','active'],
  [c8,'Marcus Chen','marcus.chen@fintech.io','07722 890123','vip','active'],
  [c9,'Priya Sharma','priya.s@consultant.co.uk','07833 901234','standard','active'],
  [c10,"Ryan O'Brien",'ryan.obrien@agency.com','07944 012345','standard','active'],
] as [string,string,string,string|null,string,string][])
  run(`INSERT INTO customers (id,name,email,phone,tier,account_status) VALUES (?,?,?,?,?,?)`,id,name,email,phone,tier,status)

// ── Extra customers (50 — each contacts once, boosts FCR to ~70%) ─────────────
const extraNames: [string,string][] = [
  ['Oliver Brooks','oliver.brooks@mail.com'],['Chloe Bennett','chloe.b@creative.io'],
  ['Nathan Scott','nathan.s@digital.co.uk'],['Isla Morrison','isla.morrison@gmail.com'],
  ['Liam Carter','liam.carter@techco.com'],['Ava Thompson','ava.t@startup.io'],
  ['Jake Williams','jake.w@consulting.co'],['Mia Davis','mia.davis@studio.com'],
  ['Ethan Harris','ethan.h@agency.co.uk'],['Grace Wilson','grace.wilson@mail.co.uk'],
  ['Noah Johnson','noah.j@digital.io'],['Lily Anderson','lily.a@freelance.co.uk'],
  ['Oscar Taylor','oscar.t@ecommerce.com'],['Zoe Martinez','zoe.m@techstart.io'],
  ['Harry Brown','harry.b@enterprise.co.uk'],['Ella Clark','ella.clark@agency.com'],
  ['Samuel Lewis','sam.lewis@startup.co.uk'],['Poppy Walker','poppy.w@creative.com'],
  ['Alfie Hall','alfie.h@consulting.io'],['Evie Young','evie.young@mail.com'],
  ['George Allen','george.a@digital.co'],['Freya King','freya.k@studio.io'],
  ['Charlie Wright','charlie.w@techco.co.uk'],['Imogen Lee','imogen.l@agency.io'],
  ['Arthur Scott','arthur.s@ecommerce.io'],['Daisy Green','daisy.g@startup.com'],
  ['Henry Baker','henry.b@consulting.com'],['Molly Adams','molly.a@creative.co.uk'],
  ['Sebastian Hill','seb.h@digital.com'],['Rosie Campbell','rosie.c@freelance.io'],
  ['Theo Evans','theo.e@techstart.co.uk'],['Amber Turner','amber.t@mail.co.uk'],
  ['Freddie Collins','freddie.c@agency.com'],['Jasmine Roberts','jasmine.r@studio.co.uk'],
  ['Max Phillips','max.p@consulting.io'],['Phoebe Morris','phoebe.m@startup.io'],
  ['Archie Rogers','archie.r@digital.co.uk'],['Harriet Price','harriet.p@ecommerce.com'],
  ['Toby Bailey','toby.b@techco.io'],['Florence Gray','florence.g@creative.com'],
  ['William Hughes','william.h@digital.io'],['Charlotte Evans','charlotte.e@creative.co.uk'],
  ['Benjamin Morris','ben.morris@startup.com'],['Emily Richards','emily.r@consultant.io'],
  ['Jack Thompson','jack.t@agency.co.uk'],['Lucy Watson','lucy.w@ecommerce.com'],
  ['Daniel White','daniel.w@techstart.io'],['Emma Davis','emma.d@freelance.co.uk'],
  ['Joseph Harris','joseph.h@digital.co'],['Alice Clark','alice.c@studio.com'],
]
const extraIds = extraNames.map(([name, email]) => {
  const id = uid()
  run(`INSERT INTO customers (id,name,email,tier,account_status) VALUES (?,?,?,'standard','active')`,id,name,email)
  return id
})

// ── Subscriptions ─────────────────────────────────────────────────────────────
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,?)`,uid(),c1,'Enterprise',599,'monthly','active',da(-18))
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,?)`,uid(),c2,'Professional',129,'monthly','active',da(-5))
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,?)`,uid(),c3,'Starter',29,'monthly','active',da(-22))
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,paused_until) VALUES (?,?,?,?,?,?,?)`,uid(),c4,'Professional',129,'monthly','paused',da(-45))
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,cancelled_at) VALUES (?,?,?,?,?,?,?)`,uid(),c5,'Starter',29,'monthly','cancelled',da(10))
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,?)`,uid(),c6,'Enterprise',599,'monthly','active',da(-3))
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,?)`,uid(),c7,'Starter',29,'monthly','active',da(-12))
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,?)`,uid(),c8,'Professional',129,'monthly','active',da(-8))
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,?)`,uid(),c9,'Starter',29,'monthly','active',da(-25))
run(`INSERT INTO subscriptions (id,customer_id,plan,amount_gbp,billing_cycle,status,next_billing_at) VALUES (?,?,?,?,?,?,?)`,uid(),c10,'Professional',129,'monthly','active',da(-15))

// ── Orders ────────────────────────────────────────────────────────────────────
const [o1,o2,o3,o4,o5,o6] = Array.from({length:6}, uid)
run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,tracking_number,carrier,estimated_delivery) VALUES (?,?,?,?,?,?,?,?,?)`,
  o1,c3,'ORD-4521','shipped',JSON.stringify([{name:'Pro Keyboard',qty:1,price:149.99},{name:'USB-C Hub',qty:2,price:34.99}]),219.97,'JD000123456789GB','Royal Mail',da(-2))
run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,estimated_delivery) VALUES (?,?,?,?,?,?,?)`,
  o2,c2,'ORD-4489','processing',JSON.stringify([{name:'Standing Desk Mat',qty:1,price:79.99}]),79.99,da(-4))
run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,tracking_number,carrier) VALUES (?,?,?,?,?,?,?,?)`,
  o3,c1,'ORD-4401','delivered',JSON.stringify([{name:'Monitor Arm',qty:2,price:89.99}]),179.98,'DPD987654321','DPD')
run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,estimated_delivery,created_at) VALUES (?,?,?,?,?,?,?,?)`,
  o4,c5,'ORD-4188','processing',JSON.stringify([{name:'Wireless Mouse',qty:1,price:45.00}]),45.00,da(-1),da(35))
run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,tracking_number,carrier,estimated_delivery) VALUES (?,?,?,?,?,?,?,?,?)`,
  o5,c8,'ORD-5012','shipped',JSON.stringify([{name:'Laptop Stand',qty:1,price:64.99}]),64.99,'RM123987456GB','Royal Mail',da(-1))
run(`INSERT INTO orders (id,customer_id,external_id,status,items_json,total_gbp,tracking_number,carrier) VALUES (?,?,?,?,?,?,?,?)`,
  o6,c6,'ORD-4956','delivered',JSON.stringify([{name:'Ergonomic Chair',qty:1,price:499.99}]),499.99,'DHL556677889','DHL')

// ── Invoices ──────────────────────────────────────────────────────────────────
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at,paid_at) VALUES (?,?,?,?,?,?,?)`,uid(),c1,599,'Enterprise Plan — June 2026','paid',da(5),da(5))
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at) VALUES (?,?,?,?,?,?)`,uid(),c6,599,'Enterprise Plan — June 2026','overdue',da(14))
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at,paid_at) VALUES (?,?,?,?,?,?,?)`,uid(),c2,129,'Professional Plan — June 2026','paid',da(2),da(2))
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at,paid_at,refunded_at,refund_amount_gbp) VALUES (?,?,?,?,?,?,?,?,?)`,uid(),c3,29,'Starter Plan — May 2026','refunded',da(20),da(20),da(19),29)
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at,paid_at) VALUES (?,?,?,?,?,?,?)`,uid(),c8,129,'Professional Plan — June 2026','paid',da(3),da(3))
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at,paid_at) VALUES (?,?,?,?,?,?,?)`,uid(),c7,29,'Starter Plan — June 2026','paid',da(8),da(8))
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at,paid_at) VALUES (?,?,?,?,?,?,?)`,uid(),c9,29,'Starter Plan — June 2026','paid',da(6),da(6))
run(`INSERT INTO invoices (id,customer_id,amount_gbp,description,status,due_at) VALUES (?,?,?,?,?,?)`,uid(),c10,129,'Professional Plan — June 2026','pending',da(-5))

// ── Knowledge Base ────────────────────────────────────────────────────────────
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(),'returns','Returns policy','Customers can return any item within 30 days of the order date for a full refund. Items must be unused and in original packaging. After 30 days, returns are at the discretion of the support team. Digital products are non-refundable once accessed.','policy_doc',1,47)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(),'billing','Refund processing times','Refunds are processed within 3–5 business days to the original payment method. Goodwill credits are applied immediately to the account balance and used against the next invoice automatically.','policy_doc',1,38)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(),'billing','Subscription plans and pricing','Starter: £29/month (1 user, basic features). Professional: £129/month (up to 10 users, advanced features). Enterprise: £599/month (unlimited users, dedicated support, custom integrations). Annual billing saves 20%. All plans include free standard support.','pricing_page',1,62)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(),'account','Account access and security','Accounts lock after 5 failed login attempts. Locked accounts can be unlocked by customer support immediately. Password resets are sent to the registered email address and expire after 1 hour. 2FA can be reset by support after identity verification.','policy_doc',1,55)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(),'delivery','Delivery times and carriers','Standard delivery: 3–5 business days via Royal Mail. Express delivery: 1–2 business days via DPD. Free standard delivery on orders over £75. International delivery to EU: 5–10 business days. Tracking is provided for all orders.','policy_doc',1,41)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(),'technical','Common technical issues','Most login issues are resolved by clearing browser cache and cookies. Slow performance: try a different browser or disable extensions. Blank white screen after login: cookies may be blocked — check browser settings. For persistent issues, collect browser type, OS version, and error messages before escalating.','support_guide',1,29)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(),'subscription','Subscription pausing and cancellation','Subscriptions can be paused for up to 3 months — billing stops and account access is preserved. Cancellations take effect at the end of the current billing period. Customers who cancel can reactivate within 90 days and retain all data. Retention offers: first offer a free pause; if declined, offer a 20% discount for 3 months.','policy_doc',1,34)
run(`INSERT INTO knowledge_base (id,category,title,content,source,active,usage_count) VALUES (?,?,?,?,?,?,?)`,
  uid(),'billing','Direct debit and payment failures','If a direct debit fails, customers receive an automatic retry after 3 days. If the second attempt fails, the account is flagged as overdue and a payment link is sent to the registered email. Support can send a new payment link at any time. Accounts are not suspended until 21 days overdue.','policy_doc',1,22)

// ── Helper functions for building conversations ───────────────────────────────
function mkconv(
  customerId: string, channel: string, started: string,
  status: string, turns: number, escalated: number,
  resolvedAt: string | null, resMethod: string | null,
  aiScore: number | null, aiReason: string | null,
): string {
  const id = uid()
  run(`INSERT INTO conversations (id,customer_id,channel,status,started_at,turn_count,escalated,resolved_at,resolution_method,ai_csat_score,ai_csat_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id,customerId,channel,status,started,turns,escalated,resolvedAt,resMethod,aiScore,aiReason)
  return id
}
const mkm = (cid: string, role: string, content: string, ts: string, ff = 0) =>
  run(`INSERT INTO messages (id,conversation_id,role,content,created_at,frustration_flag) VALUES (?,?,?,?,?,?)`,uid(),cid,role,content,ts,ff)
const mka = (cid: string, name: string, tier: string, inp: object, out: object, v: number, s: number, ts: string) =>
  run(`INSERT INTO actions_log (id,conversation_id,action_name,authority_tier,input_json,output_json,verified,success,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,uid(),cid,name,tier,JSON.stringify(inp),JSON.stringify(out),v,s,ts)
const mkc = (cid: string, score: number, comment: string | null, ts: string) =>
  run(`INSERT INTO csat_scores (id,conversation_id,score,comment,collected_at) VALUES (?,?,?,?,?)`,uid(),cid,score,comment,ts)
const mke = (cid: string, trigger: string, summary: string, ts: string) =>
  run(`INSERT INTO escalations (id,conversation_id,trigger,summary,full_context_json,created_at) VALUES (?,?,?,?,?,?)`,uid(),cid,trigger,summary,'{}',ts)

// Batch conv helper — inserts conv + 2 messages + 1 action + optional CSAT/escalation
function bconv(
  customerId: string, channel: string, daysBack: number,
  status: 'resolved'|'escalated', turns: number,
  customerMsg: string, agentMsg: string,
  actionName: string, actionTier: string,
  aiScore: number|null, aiReason: string|null,
  csatScore?: number, csatComment?: string, escTrigger?: string,
): string {
  const st = da(daysBack)
  const at = new Date(Date.parse(st) + 40*60000).toISOString()
  const rt = status === 'resolved' ? new Date(Date.parse(st) + 35*60000).toISOString() : null
  const convId = mkconv(customerId,channel,st,status,turns,status==='escalated'?1:0,rt,status==='resolved'?'agent':null,aiScore,aiReason)
  mkm(convId,'customer',customerMsg,st)
  mkm(convId,'agent',agentMsg,at)
  mka(convId,actionName,actionTier,{},{success:true,verified:true},1,1,at)
  if (csatScore !== undefined) mkc(convId,csatScore,csatComment??null,new Date(Date.parse(st)+60*60000).toISOString())
  if (status==='escalated') mke(convId,escTrigger??'sentiment','Escalated to human team',at)
  return convId
}

// ══════════════════════════════════════════════════════════════════════════════
// DETAILED CONVERSATIONS — Day 0 (today, 6 convs)
// ══════════════════════════════════════════════════════════════════════════════

// 1. David Park — order tracking (web, resolved, 1 turn)
const d1 = mkconv(c3,'web',ha(3),'resolved',1,0,ha(2.5),'agent',9,'Quick order lookup, accurate tracking info provided')
mkm(d1,'customer',"Hi, I placed an order for a keyboard last week (ORD-4521) and it hasn't arrived yet — can you check where it is?",ha(3))
mkm(d1,'agent',"Hi David! I've just checked ORD-4521 for you. It's been shipped via Royal Mail and is currently in transit — tracking number JD000123456789GB. Expected delivery tomorrow. You'll get a text notification when it's out for delivery. Is there anything else I can help with?",ha(2.5))
mka(d1,'get_order_status','auto',{order_id:'ORD-4521'},{success:true,status:'shipped',tracking:'JD000123456789GB',verified:true},1,1,ha(2.9))
mkc(d1,5,'Instant answer, really helpful!',ha(2))

// 2. Elena Rodriguez — refund for damaged item (web, resolved, 2 turns)
const d2 = mkconv(c2,'web',ha(2),'resolved',2,0,ha(0.5),'agent',8,'Empathetic, correct refund applied without requiring return')
mkm(d2,'customer',"My standing desk mat arrived with a tear along one edge — it was clearly damaged in transit. I'd like a refund.",ha(2))
mkm(d2,'agent',"I'm really sorry to hear that, Elena — that's not the standard we aim for at all. I've raised a return for you and issued a full refund of £79.99 to your original payment method. You'll see it within 3–5 business days. No need to send the damaged item back. Can I help with anything else?",ha(1.5))
mkm(d2,'customer',"That's brilliant, thank you so much!",ha(1.2))
mkm(d2,'agent',"Absolutely! Sorry again for the inconvenience. Hope your next order arrives perfectly. Take care!",ha(0.5))
mka(d2,'search_knowledge_base','auto',{query:'refund damaged item policy'},{success:true,verified:true},1,1,ha(1.9))
mka(d2,'issue_refund','auto',{amount_gbp:79.99,reason:'Item arrived damaged in transit'},{success:true,amount_gbp:79.99,verified:true},1,1,ha(1.8))
mkc(d2,4,'Sorted quickly, no hassle at all',ha(0.3))

// 3. Marcus Chen — password reset (email, resolved, 1 turn)
const d3 = mkconv(c8,'email',ha(5),'resolved',1,0,ha(4.5),'agent',9,'Single-turn resolution')
mkm(d3,'customer',"Hi, I can't get into my account — keeps saying my password is incorrect. Can you reset it?",ha(5))
mkm(d3,'agent',"Hi Marcus, no problem! I've sent a password reset link to marcus.chen@fintech.io — it's valid for 60 minutes. Once you're back in, I'd recommend enabling 2FA for extra security. Let me know if you have any trouble.",ha(4.5))
mka(d3,'send_password_reset','auto',{customer_id:c8},{success:true,email_sent:true,verified:true},1,1,ha(4.9))

// 4. Sophie Walsh — cancellation request (web, OPEN — retention in progress)
const d4 = mkconv(c7,'web',ha(0.5),'open',2,0,null,null,null,null)
mkm(d4,'customer',"I want to cancel my Starter subscription. I'm not using it enough to justify the cost.",ha(0.5))
mkm(d4,'agent',"Hi Sophie, I'm sorry to hear that! Before I process the cancellation, I'd love to understand what's not working for you — is it mainly the price, or are there features you're not finding useful? We do have a pause option that freezes billing for up to 3 months at no charge — might be worth considering?",ha(0.4))
mkm(d4,'customer',"The pause option sounds interesting actually — how does that work?",ha(0.3))
mkm(d4,'agent',"Great question! With the pause, your account stays fully active but we stop billing for up to 3 months. You can resume any time within that window, or it auto-resumes at the end. Shall I go ahead and pause it from today?",ha(0.2))
mka(d4,'search_knowledge_base','auto',{query:'subscription pause cancellation retention'},{success:true,verified:true},1,1,ha(0.45))

// 5. Fatima Al-Hassan — overdue invoice (email, resolved, 2 turns)
const d5 = mkconv(c6,'email',ha(7),'resolved',2,0,ha(6),'agent',8,'Billing confusion resolved, payment link sent')
mkm(d5,'customer',"I've had a reminder about an overdue invoice for £599 but I thought I set up a direct debit. What's happened?",ha(7))
mkm(d5,'agent',"Hi Fatima, I've looked into this. The direct debit instruction wasn't completed by your bank last month — it was returned unpaid. I've sent a secure payment link to your registered email to retry. Once processed, the overdue status clears immediately. Really sorry for the confusion!",ha(6))
mka(d5,'get_invoice_history','auto',{customer_id:c6},{success:true,verified:true},1,1,ha(6.9))
mka(d5,'send_payment_update_link','auto',{customer_id:c6},{success:true,link_sent:true,verified:true},1,1,ha(6.8))

// 6. Ryan O'Brien — blank screen on dashboard (web, resolved, 2 turns)
const d6 = mkconv(c10,'web',ha(4),'resolved',2,0,ha(3),'agent',7,'KB resolved browser cache issue')
mkm(d6,'customer',"Hey, I keep getting a blank white screen when I try to open the dashboard. Tried refreshing but nothing happens.",ha(4))
mkm(d6,'agent',"Hi Ryan! This is usually a cookies or cache issue. Try: (1) opening in an incognito window, or (2) clearing your browser cache (Ctrl+Shift+Delete). If you're on Chrome, also check that cookies are allowed for our site. This fixes it for most customers — let me know how you get on!",ha(3))
mka(d6,'search_knowledge_base','auto',{query:'blank screen dashboard loading issue'},{success:true,verified:true},1,1,ha(3.9))
mkc(d6,4,'Got it sorted eventually, thanks',ha(2.5))

// ══════════════════════════════════════════════════════════════════════════════
// DETAILED CONVERSATIONS — Day 1 (yesterday, 5 convs)
// ══════════════════════════════════════════════════════════════════════════════

// 7. James Thornton — 2FA reset + order check (email, resolved, 3 turns)
const d7 = mkconv(c1,'email',da(1),'resolved',3,0,ha(22),'agent',9,'Multi-issue handled correctly, identity verified before 2FA reset')
mkm(d7,'customer',"Hi, two things: I need to reset my 2FA (got a new phone) and need to confirm the delivery address on my last order.",ha(26))
mkm(d7,'agent',"Hi James, happy to help with both. For security I'll need to verify your identity before resetting 2FA — can you confirm your email and the last 4 digits of the payment card on file?",ha(25.8))
mkm(d7,'customer',"Sure — james.thornton@acme.com and card ending 4821.",ha(25.5))
mkm(d7,'agent',"Perfect, verified! I've reset your 2FA and sent setup instructions to your email. For ORD-4401, the delivery address was 14 Kensington Gardens, London, EC2A 1AA — delivered last Wednesday. Is that correct? Let me know if anything needs updating.",ha(22))
mka(d7,'get_customer_account','auto',{customer_id:c1},{success:true,verified:true},1,1,ha(25.7))
mka(d7,'get_order_status','auto',{order_id:'ORD-4401'},{success:true,status:'delivered',verified:true},1,1,ha(22.5))
mkc(d7,5,'Both sorted in one conversation — great service',ha(21))

// 8. Amara Osei — account locked → unlock (web, resolved, 1 turn)
const d8 = mkconv(c4,'web',da(1),'resolved',1,0,ha(20),'agent',10,'Instant resolution')
mkm(d8,'customer',"My account is locked after too many failed login attempts. I urgently need access.",ha(21))
mkm(d8,'agent',"Hi Amara! Your account is now unlocked — you should be able to log in immediately. For security, please change your password once you're in. I can send a reset link too if that's easier. All done!",ha(20))
mka(d8,'unlock_account','auto',{customer_id:c4},{success:true,verified:true},1,1,ha(20.9))
mkc(d8,5,'Fixed in seconds!',ha(19))

// 9. Tom Berkley — £620 refund request, escalated (email)
const d9 = mkconv(c5,'email',da(1),'escalated',2,1,null,null,4,'Correctly escalated — refund exceeds £500 AUTO threshold')
mkm(d9,'customer',"I need a full refund on my order — the product completely failed after 3 days of use. Total was £620. I have photos of the damage.",ha(30))
mkm(d9,'agent',"Hi Tom, I'm really sorry — a product failing after 3 days is completely unacceptable and you absolutely deserve a resolution. Given the value of this refund, I'm escalating this to our senior team who have authority to process it immediately. Reference ESC-001. You'll hear from someone within 2 business hours.",ha(29))
mka(d9,'search_knowledge_base','auto',{query:'large refund product failure policy'},{success:true,verified:true},1,1,ha(29.8))
mka(d9,'escalate_to_human','auto',{reason:'Refund £620 — exceeds £500 AUTO tier limit'},{success:true,verified:true},1,1,ha(29.5))
mke(d9,'large_refund','Refund request of £620 exceeds AUTO tier limit of £500',ha(29.5))

// 10. David Park — delivery delay reassurance (web, resolved, 2 turns)
const d10 = mkconv(c3,'web',da(1),'resolved',2,0,ha(23),'agent',8,'Customer reassured with accurate ETA + goodwill credit')
mkm(d10,'customer',"I'm a bit worried — my order was supposed to arrive yesterday and it hasn't shown up.",ha(25))
mkm(d10,'agent',"Hi David, I can see ORD-4521 is showing as in transit with Royal Mail. There's a 1–2 day knock-on delay affecting some deliveries in your area at the moment — it should arrive tomorrow. I've applied a £10 goodwill credit to your account as an apology for the wait.",ha(23))
mka(d10,'get_order_status','auto',{order_id:'ORD-4521'},{success:true,status:'in_transit',verified:true},1,1,ha(24.5))
mka(d10,'apply_goodwill_credit','auto',{amount_gbp:10,reason:'Delivery delay'},{success:true,amount_gbp:10,verified:true},1,1,ha(23.5))
mkc(d10,4,'Good explanation, appreciated the goodwill gesture',ha(22))

// 11. Elena Rodriguez — billing question (SMS, resolved, 2 turns)
const d11 = mkconv(c2,'sms',da(1),'resolved',2,0,ha(27),'agent',8,'Billing clarification + upsell to annual plan mentioned')
mkm(d11,'customer',"Hi why was I charged £129 today instead of the usual?",ha(28))
mkm(d11,'agent',"Hi Elena, your Professional plan renewed on its monthly cycle — £129 is the correct amount. If you'd prefer to reduce costs, annual billing works out to £103/month (saving 20%). Want me to switch you over?",ha(27))
mka(d11,'get_invoice_history','auto',{customer_id:c2},{success:true,verified:true},1,1,ha(27.9))

// ══════════════════════════════════════════════════════════════════════════════
// DETAILED CONVERSATIONS — Day 2 (4 convs)
// ══════════════════════════════════════════════════════════════════════════════

// 12. Priya Sharma — distressed customer, escalated (vulnerability trigger)
const d12 = mkconv(c9,'web',da(2),'escalated',1,1,null,null,3,'Correctly escalated on vulnerability signal')
mkm(d12,'customer',"I've been trying to get this sorted for TWO WEEKS and nobody has helped me. I'm at my wit's end. I can't afford to lose this money.",ha(49),1)
mkm(d12,'agent',"I'm so sorry you've been going through this — two weeks without a resolution is completely unacceptable and I can hear how stressful this is. I'm escalating this right now to a senior member of our team who will personally call you within the hour. You will have a resolution today. Reference ESC-002.",ha(48))
mke(d12,'vulnerability','Customer expressed financial distress and prolonged unresolved issue',ha(48))

// 13. Sophie Walsh — return within 30-day window (web, resolved)
const d13 = mkconv(c7,'web',da(2),'resolved',2,0,ha(50),'agent',9,'Clean return initiation')
mkm(d13,'customer',"I need to return an item I bought about 15 days ago — it's just not what I expected.",ha(51))
mkm(d13,'agent',"Of course Sophie! You're well within the 30-day return window. I've raised a return — a prepaid Royal Mail return label will be in your inbox within the hour. Refund processes within 3–5 business days of us receiving the item. Is there anything specific we could have done better?",ha(50))
mka(d13,'initiate_return','auto',{customer_id:c7,reason:'Item not as expected'},{success:true,label_sent:true,verified:true},1,1,ha(50.9))
mkc(d13,5,'Really quick and easy return process!',ha(49))

// 14. Marcus Chen — Enterprise plan upgrade enquiry (email, resolved, 3 turns)
const d14 = mkconv(c8,'email',da(2),'resolved',3,0,ha(52),'agent',9,'Plan comparison done well, upgrade call booked')
mkm(d14,'customer',"We're growing fast and I'm thinking about upgrading from Professional to Enterprise. What's the actual difference in practice?",ha(54))
mkm(d14,'agent',"Great timing, Marcus! Enterprise gives you unlimited users (vs 10 on Pro), a dedicated account manager, custom API integrations, and a 4-hour support SLA. It's £599/month vs your current £129. For a growing team it usually pays for itself quickly. Shall I arrange a call with our account team to walk you through it?",ha(53.5))
mkm(d14,'customer',"Yes please — can they reach me on my mobile?",ha(53))
mkm(d14,'agent',"Absolutely. I've logged an upgrade consultation for you — someone will call 07722 890123 within one business day. They'll also arrange a 2-week Enterprise trial if you want to test before committing.",ha(52))
mka(d14,'search_knowledge_base','auto',{query:'enterprise vs professional plan features'},{success:true,verified:true},1,1,ha(53.9))
mkc(d14,5,'Really helpful comparison, appreciated the trial offer',ha(51))

// 15. Tom Berkley — login not working (web, resolved, 2 turns)
const d15 = mkconv(c5,'web',da(2),'resolved',2,0,ha(55),'agent',7,'Standard browser troubleshooting, resolved with KB')
mkm(d15,'customer',"I can get to the login page but when I hit submit it just refreshes and doesn't log me in.",ha(56))
mkm(d15,'agent',"Hi Tom! This is usually caused by cookies being blocked. Try: (1) opening in an incognito window, or (2) in Chrome go to Settings → Privacy → Cookies → Allow all. If still stuck, Firefox usually works without any changes. Let me know how you get on!",ha(55))
mka(d15,'search_knowledge_base','auto',{query:'login refresh not working cookies'},{success:true,verified:true},1,1,ha(55.8))
mkc(d15,3,'Worked eventually but needed a bit of back and forth',ha(53))

// ══════════════════════════════════════════════════════════════════════════════
// DETAILED CONVERSATIONS — Day 3 (3 convs)
// ══════════════════════════════════════════════════════════════════════════════

// 16. James Thornton — Salesforce integration query (email, resolved, 4 turns)
const d16 = mkconv(c1,'email',da(3),'resolved',4,0,ha(74),'agent',8,'Complex technical query, integration team looped in')
mkm(d16,'customer',"We want to integrate your platform with our Salesforce CRM. Is there an API and how does auth work?",ha(76))
mkm(d16,'agent',"Great news James — the REST API is available on your Enterprise plan. Authentication uses OAuth 2.0 bearer tokens. We also have a pre-built Salesforce connector. Shall I have our integrations team send over the setup guide and arrange a technical call?",ha(75.5))
mkm(d16,'customer',"That would be great. How long does setup usually take?",ha(75))
mkm(d16,'agent',"Most Salesforce integrations are live within 2–3 business days with the connector. I've logged an integration consultation request — your account manager will email you by tomorrow. Reference INT-001.",ha(74))
mka(d16,'search_knowledge_base','auto',{query:'API OAuth Salesforce integration enterprise'},{success:true,verified:true},1,1,ha(75.8))
mkc(d16,4,'Good response, would prefer self-service docs for this',ha(72))

// 17. Fatima Al-Hassan — confirms payment went through (web, resolved, 2 turns)
const d17 = mkconv(c6,'web',da(3),'resolved',2,0,ha(77),'agent',9,'Payment confirmed, account updated correctly')
mkm(d17,'customer',"Just checking — I paid the overdue invoice via the link you sent. Has it gone through?",ha(78))
mkm(d17,'agent',"Hi Fatima — yes, confirmed! Payment of £599 processed successfully this morning. Your account is fully up to date and the overdue flag has been cleared. Next invoice due on the 3rd of next month. All sorted!",ha(77))
mka(d17,'get_invoice_history','auto',{customer_id:c6},{success:true,verified:true},1,1,ha(77.9))
mkc(d17,5,'Exactly what I needed to know, thanks',ha(75))

// 18. Ryan O'Brien — wrong item delivered (web, escalated — frustration)
const d18 = mkconv(c10,'web',da(3),'escalated',2,1,null,null,5,'Escalated after frustration — wrong item requires fulfilment review')
mkm(d18,'customer',"I received completely the wrong item — ordered a wireless mouse, got a USB hub. I've already emailed twice this week with no reply. This is awful.",ha(80),1)
mkm(d18,'agent',"Ryan, I sincerely apologise — receiving the wrong item AND not getting a reply is completely unacceptable. I'm escalating this to our fulfilment team right now who can dispatch the correct item today with next-day delivery. Reference ESC-003. You'll receive an update within 1 hour.",ha(79))
mka(d18,'escalate_to_human','auto',{reason:'Wrong item, multiple unanswered emails, customer frustration'},{success:true,verified:true},1,1,ha(79.5))
mke(d18,'sentiment','Wrong item delivered + unresponsive support — customer frustrated',ha(79.5))

// ══════════════════════════════════════════════════════════════════════════════
// BATCH — Named customers days 4–6 (10 convs, all resolved)
// ══════════════════════════════════════════════════════════════════════════════
bconv(c2,'web',4,'resolved',2,"I need to pause my subscription for 3 months while we sort our budget.","Done! Professional subscription paused from today until 10 September. No charges during this period, auto-resumes after 3 months, or you can reactivate earlier. Let us know if you need anything in the meantime.",'pause_subscription','confirm',8,'Subscription paused correctly within policy',5,'Quick and painless!')
bconv(c3,'email',4.1,'resolved',1,"Can you update my delivery address? I've moved house.","Of course! I've updated your delivery address to the new one provided. This will apply to all future orders. Your current order (ORD-4521) is already in transit to the previous address, so if it's not delivered we can reroute.",'update_profile','auto',8,'Profile update handled correctly')
bconv(c1,'email',4.3,'resolved',2,"What's the API rate limit on our Enterprise plan?","Enterprise allows 1,000 requests per minute per API key, with a burst allowance up to 5,000. You can create multiple API keys in settings for higher throughput. Our integrations team can arrange custom limits for high-volume use cases.",'search_knowledge_base','auto',9,'Accurate technical answer from KB',4,'Good detail, thanks')
bconv(c6,'web',4.6,'resolved',2,"My order still shows as processing after 4 days — when will it ship?","Hi Fatima — your order is in the warehouse dispatch queue and should ship by tomorrow. You'll get a tracking number by email as soon as it's collected. I've flagged it as priority given the delay.",'get_order_status','auto',8,'Order status checked and flagged')
bconv(c8,'web',5,'resolved',1,"What's the £10 credit I can see on my account? I didn't expect that.","That's a goodwill credit applied for the minor delay on your last order. It's been automatically offset against your next invoice — nothing to do on your end!",'get_invoice_history','auto',9,'Credit explanation clear and reassuring',5,'Lovely touch, thank you!')
bconv(c10,'email',5.2,'resolved',2,"Can you send me an invoice breakdown for the last 6 months?","I've emailed a full invoice breakdown to ryan.obrien@agency.com covering the last 6 months — dates, amounts, and descriptions for every charge. Let me know if anything looks off.",'get_invoice_history','auto',8,'Invoice history retrieved and sent',5,'Exactly what I needed')
bconv(c4,'web',5.5,'resolved',2,"When does my paused subscription come back and what happens to my data?","Your Professional subscription is paused and set to auto-resume on "+new Date(Date.now()+45*86400000).toISOString().slice(0,10)+". On that date billing resumes at £129/month and full access is restored. All your data is preserved. We'll send a reminder 7 days before.",'get_subscription_status','auto',8,'Pause status and data preservation explained correctly')
bconv(c2,'facebook',5.8,'resolved',1,"Hi just checking you got my return from yesterday?","Hi Elena! Yes, confirmed — return label was sent to elena.r@techstart.io about 24 hours ago. Check your spam if you haven't seen it. Refund processes within 3–5 days of us receiving the item.",'search_knowledge_base','auto',8,'Return status confirmed via Facebook')
bconv(c7,'email',6,'resolved',1,"Hi, forgot my password again, can you reset it please?","No problem Sophie! Reset link sent to sophie.walsh@startup.com — valid for 60 minutes. Take care!",'send_password_reset','auto',9,'Instant resolution',5,'So fast, thank you!')
bconv(c5,'web',6.5,'resolved',2,"Site feels really slow today — is there maintenance going on?","No scheduled maintenance today, Tom. Slowness can sometimes be regional CDN latency. I've raised it with our infrastructure team to investigate. Try a hard refresh (Ctrl+Shift+R) — often fixes it. I'll update you if we find anything.",'search_knowledge_base','auto',7,'Technical check performed, customer informed')

// ══════════════════════════════════════════════════════════════════════════════
// BATCH — Named customers days 7–30 (14 convs: 7 resolved, 6 escalated, 1 open)
// ══════════════════════════════════════════════════════════════════════════════
bconv(c1,'email',8,'resolved',2,"I need to add two new users to our Enterprise account — how do I do that?","Enterprise accounts have unlimited users. Just go to Settings → Team → Invite User and enter their email addresses. They'll get an invite link valid for 48 hours. If you need bulk provisioning, I can have our team help via CSV import.",'search_knowledge_base','auto',8,'Accurate admin guidance',4,'Helpful, did it ourselves')
bconv(c3,'web',9,'resolved',1,"Can I get a receipt for my last order?","Hi David! Receipt for ORD-4521 sent to dpark@gmail.com just now. Let me know if you need it in any other format.",'get_invoice_history','auto',9,'Single-turn invoice retrieval',5,'Perfect, cheers!')
bconv(c8,'email',10,'resolved',3,"We're doing our annual IT audit and need to know where our data is stored and what your data retention policy is.","Hi Marcus — a great question for compliance. Your data is stored on UK-based servers (AWS eu-west-2). Retention policy: active data retained for the duration of the subscription plus 90 days post-cancellation, then purged. I'm sending our full Data Processing Agreement to marcus.chen@fintech.io — it covers GDPR obligations. Let me know if your legal team needs anything else.",'search_knowledge_base','auto',8,'Data/compliance query handled correctly, DPA shared',5,'Very thorough, exactly what we needed')
bconv(c6,'web',12,'resolved',2,"I'd like to switch to annual billing — how do I do that and when does the saving kick in?","Hi Fatima! Annual billing saves 20% — your Enterprise plan would go from £599/month to £479/month (£5,748/year vs £7,188). The saving starts immediately on your next billing date. To switch: go to Settings → Billing → Change to Annual, or I can action it now if you prefer.",'get_subscription_status','auto',8,'Upsell to annual billing, correct pricing quoted',4,'Good detail, going to discuss with finance first')
bconv(c9,'web',14,'resolved',1,"Hi, just wanted to confirm my account is still active — haven't had any emails lately.","Hi Priya! Yes, your Starter account is fully active. No issues flagged. You may want to check your spam folder for our emails — sometimes marketing messages end up there. Is there anything else I can help with?",'get_customer_account','auto',7,'Account status confirmed')
bconv(c2,'email',16,'resolved',2,"Can I downgrade from Professional to Starter for one month and then upgrade back?","Hi Elena — yes, you can! Downgrading takes effect at the end of your current billing cycle. You can upgrade back at any time. The only thing to note: if you have more than 1 user on Professional, you'd need to remove extra users before the downgrade completes. Want me to walk you through it?",'search_knowledge_base','auto',8,'Plan flexibility explained correctly',4,'Makes sense, thanks')
bconv(c7,'web',19,'resolved',2,"I got charged twice this month — can you check my billing?","Hi Sophie! I can see two charges: £29 on the 1st (your regular monthly renewal) and £8.99 on the 14th (an add-on you enabled last month for extra storage). Both are correct. If you want to remove the add-on to avoid future charges, I can do that now.",'get_invoice_history','auto',8,'Billing breakdown clear, add-on identified')
// Resolved escalations (for escalation history panel)
bconv(c10,'email',11,'escalated',2,"I've been billed for a subscription I cancelled 6 weeks ago. This is the third time I've had to contact you about it.","Ryan, I sincerely apologise — this should have been resolved weeks ago. I'm escalating this to our billing team who will refund the erroneous charge and audit your account today. Reference ESC-004. I'll personally follow up to confirm it's resolved.",'escalate_to_human','auto',4,'Billing error — repeated contact, escalated correctly',undefined,undefined,'explicit_request')
bconv(c3,'web',13,'escalated',1,"I've had a package go missing — Royal Mail says it was delivered but I never received it. This is £220 of product.","David, I'm really sorry about this. Missing packages over £100 require our senior team to process a claim with Royal Mail and authorise a replacement or refund. Escalating now — reference ESC-005. You'll hear from us within 4 business hours.",'escalate_to_human','auto',5,'High-value lost parcel — correctly escalated',undefined,undefined,'large_refund')
bconv(c5,'web',17,'escalated',2,"Still waiting on that £620 refund I was promised two weeks ago. Nobody has contacted me.","Tom, this is unacceptable and I apologise unreservedly. I'm re-escalating this as URGENT — reference ESC-006. Our head of support will contact you personally within 2 hours today. I am marking this as highest priority.",'escalate_to_human','auto',3,'Repeat escalation — refund still unresolved, customer frustrated',undefined,undefined,'repeat_escalation')
bconv(c1,'email',20,'escalated',2,"We've had a security incident and I need to know if any of our customer data was accessed via your API.","James, I'm treating this as a priority security incident. I'm escalating immediately to our security and compliance team who will respond within 2 hours with a full audit log of API access for your account. Reference SEC-001. Is there a specific time window you need us to investigate?",'escalate_to_human','auto',7,'Security incident — correctly escalated to specialist team',undefined,undefined,'explicit_request')
bconv(c9,'sms',23,'escalated',1,"I was charged after I cancelled. I want a refund immediately or I'm disputing the charge with my bank.","Priya, I sincerely apologise — this shouldn't have happened. I'm escalating this to billing now with URGENT priority — reference ESC-007. They will process your refund and contact you within 2 hours. Please hold off on the bank dispute and we'll resolve this directly.",'escalate_to_human','auto',4,'Post-cancellation charge — urgent escalation',undefined,undefined,'threat_of_chargeback')
bconv(c4,'email',27,'escalated',2,"My account shows paused but I'm still seeing charges on my card statement.","Amara, I can see your subscription is correctly paused in our system. However the charge you're seeing may be a delayed card processor transaction from before the pause. I'm escalating to billing to investigate and issue an immediate refund if confirmed. Reference ESC-008. Response within 2 hours.",'escalate_to_human','auto',5,'Billing discrepancy during pause — correctly escalated',undefined,undefined,'billing_error')

// ══════════════════════════════════════════════════════════════════════════════
// BATCH — 50 extra customer convs (days 4–30, all resolved, boosts FCR to ~71%)
// ══════════════════════════════════════════════════════════════════════════════
const xt: [string, string, number, number, string, string][] = [
  // [customerMsg, agentMsg, aiScore, turns, actionName, channel]
  ["Where is my order? Placed it 4 days ago and no tracking yet.","Your order is in transit with Royal Mail — tracking number sent to your email. Expected delivery tomorrow.",8,1,'get_order_status','web'],
  ["I need to reset my password, can't log in.","Reset link sent to your registered email now — valid for 60 minutes!",9,1,'send_password_reset','email'],
  ["I'd like a refund — the item I received was damaged.","I've processed a full refund to your payment method. Should arrive within 3–5 business days. Sorry for the trouble!",8,2,'issue_refund','web'],
  ["Why was I charged this month? I thought I cancelled.","Your subscription was still active when the billing ran — I can see the cancellation wasn't fully processed. Refund issued now. Apologies for the confusion.",7,2,'issue_refund','email'],
  ["My account is locked after too many password attempts.","Account unlocked! You can log in now. Recommend changing your password once you're in.",10,1,'unlock_account','web'],
  ["Dashboard loads but all the charts are blank.","Try a hard refresh (Ctrl+Shift+R) and clear your cache. This usually fixes it — let us know if not.",7,2,'search_knowledge_base','web'],
  ["I want to upgrade from Starter to Professional — how?","Professional is £129/month and adds up to 10 users plus advanced reporting. I can switch you over now — would take effect immediately. Shall I go ahead?",9,2,'search_knowledge_base','web'],
  ["Can you confirm my delivery address on my account?","Current delivery address on file is the one you registered with. I've emailed it to you for confirmation. Let me know if it needs updating.",8,1,'get_customer_account','email'],
  ["I need to return something I bought 3 weeks ago.","You're within the 30-day return window — prepaid return label sent to your email. Refund within 3–5 days of receipt.",9,2,'initiate_return','web'],
  ["Can I get a copy of my last invoice?","Invoice sent to your registered email address. Let me know if you need it in any other format.",9,1,'get_invoice_history','email'],
  ["My order shows delivered but I never received it.","Really sorry to hear that. I've raised a missing parcel investigation with the carrier. If not resolved within 48 hours we'll send a replacement or full refund. Reference MP-001.",7,2,'search_knowledge_base','web'],
  ["I keep getting logged out every few minutes.","This is usually a session timeout setting. I've extended your session to 8 hours. If it persists please clear cookies and try again.",8,2,'search_knowledge_base','web'],
  ["Can I add a second user to my account?","Starter plan supports 1 user — to add a second user you'd need to upgrade to Professional (£129/month). Want me to arrange a trial first?",8,2,'search_knowledge_base','email'],
  ["When does my subscription renew?","Your Starter plan renews on the 15th of each month at £29. I've emailed you the renewal date confirmation.",9,1,'get_subscription_status','web'],
  ["I paid my invoice but it still shows as unpaid.","I can see the payment came through — looks like a display delay on our end. Status is now updated to paid. Apologies for the confusion!",9,1,'get_invoice_history','web'],
  ["Is there a way to export my data from the platform?","Yes! Go to Settings → Data → Export. You can download everything as CSV or JSON. If you need help, our team can run a full export for you.",8,1,'search_knowledge_base','email'],
  ["I accidentally deleted some data — can it be recovered?","Data is retained for 30 days in our recovery system. I've flagged your account for recovery — our team will restore it within 4 hours. Reference REC-001.",7,2,'escalate_to_human','web'],
  ["Can I pause my subscription for a month?","Absolutely — pausing for up to 3 months is included on all plans. Billing stops and your account stays active. Want me to pause it from today?",9,2,'search_knowledge_base','web'],
  ["My payment keeps failing, what's the issue?","Your card on file may have expired or reached its limit. I've sent a secure payment update link to your email — takes 2 minutes to update.",8,2,'send_payment_update_link','email'],
  ["How do I change the email address on my account?","You can update your email in Settings → Profile → Email. If you're locked out of the old email, contact us and we'll verify your identity and update it manually.",8,1,'search_knowledge_base','web'],
  ["I ordered the wrong size — can I change the order?","Your order is still in processing — I've flagged the size change to our warehouse and they'll update it before dispatch. Confirmation email on its way.",8,2,'get_order_status','web'],
  ["The search on your platform isn't returning relevant results.","Thanks for flagging this — I've logged it as a product feedback item with our team. As a workaround, try using quotation marks around specific terms for exact matches.",7,2,'search_knowledge_base','web'],
  ["I need to cancel my subscription immediately.","Cancellation processed — takes effect at end of your current billing period. You'll retain access until then. Sorry to see you go! If you change your mind within 90 days, reactivation keeps all your data.",8,2,'cancel_subscription','web'],
  ["I was double-charged this month.","I can see two charges — looks like a payment retry that went through twice. Second charge refunded now. Should appear in 3–5 days. Apologies!",8,2,'issue_refund','email'],
  ["Can I get a VAT invoice for my subscription?","VAT invoice for your last 3 months sent to your registered email. Let me know if you need older invoices.",9,1,'get_invoice_history','email'],
  ["My card was charged but I don't see the payment on my account.","Payment received — there's a 1–2 hour delay on our end updating the account status. Should show as paid now. Apologies for any confusion.",9,1,'get_invoice_history','web'],
  ["I need to update my billing address for VAT purposes.","Billing address updated. This will apply to all future invoices. If you need historical invoices re-issued with the new address, just let us know.",8,1,'update_profile','email'],
  ["Do you offer a student or non-profit discount?","We don't have a specific student discount, but we do offer a 20% discount on annual billing. For non-profits, email our sales team directly at sales@company.com — they handle those on a case-by-case basis.",7,2,'search_knowledge_base','web'],
  ["I can't find where to change my notification settings.","Notification settings are in Settings → Notifications → Preferences. You can control email, SMS, and in-app alerts from there.",9,1,'search_knowledge_base','web'],
  ["My colleague left the company — how do I remove their account?","You can remove a user in Settings → Team → Manage Users → Remove. Their access is revoked immediately. Their data stays on the account unless you request deletion.",8,1,'search_knowledge_base','email'],
  ["I need a refund, I changed my mind within 24 hours of ordering.","No problem at all — I've processed a full refund as you're within the 24-hour cooling-off period. Should appear in 3–5 business days.",9,1,'issue_refund','web'],
  ["Is there a mobile app for your platform?","Not yet! A mobile app is on our roadmap and expected later this year. For now, the web app works well on mobile browsers. I'll make sure you're notified when it launches.",7,1,'search_knowledge_base','web'],
  ["My invoice has the wrong company name on it.","Invoice corrected and re-sent to your email with the right company name. If you need it corrected on older invoices too, just let me know.",9,2,'update_profile','email'],
  ["How do I set up two-factor authentication?","2FA setup is in Settings → Security → Two-Factor Auth. Supports authenticator apps (Google/Microsoft Authenticator) and SMS. Only takes 2 minutes — highly recommended!",9,1,'search_knowledge_base','web'],
  ["I haven't received a password reset email.","Let me resend that — check your spam folder too. If it's still not there in 5 minutes, reply and we'll try an alternative method.",8,2,'send_password_reset','email'],
  ["Can I use the platform on multiple devices at once?","Yes — your account can be logged in on up to 5 devices simultaneously on all plans. No additional setup needed.",9,1,'search_knowledge_base','web'],
  ["I placed an order but got an error — was the payment taken?","I can see the payment processed successfully but the order confirmation email got stuck. Order confirmed — confirmation re-sent to your email now.",9,2,'get_order_status','email'],
  ["How do I get a refund if I'm not happy after the first month?","We offer a 30-day satisfaction guarantee — if you're not happy in the first 30 days, contact us for a full refund, no questions asked. I can process that now if you'd like.",8,2,'search_knowledge_base','web'],
  ["I need to change my subscription from monthly to annual billing.","Switched to annual billing — takes effect at your next renewal date. You'll save 20% going forward. Confirmation email sent.",9,2,'get_subscription_status','email'],
  ["What happens to my data if I cancel?","Your data is kept for 90 days after cancellation, then permanently deleted unless you request an export. I'd recommend downloading your data before cancelling. Want me to send the export link?",8,2,'search_knowledge_base','web'],
  ["I need a receipt for my expenses claim today.","Receipt sent to your email right now — includes all the details you'll need for an expense claim.",9,1,'get_invoice_history','email'],
  ["I keep getting a '503 Service Unavailable' error.","No outages on our status page right now — this may be a temporary network issue. Try again in 5 minutes. If it persists, send me your browser and OS version and I'll investigate.",7,2,'search_knowledge_base','web'],
  ["Can I get a 7-day free trial before committing to a plan?","All our plans include a 14-day free trial — even better! I can set that up for you now. Which plan were you interested in?",9,1,'search_knowledge_base','web'],
  ["My team member can't accept their invite email.","Invite links expire after 48 hours. I've re-sent a fresh invite to their email — should be with them in a few minutes.",8,2,'search_knowledge_base','email'],
  ["I'd like to reactivate my cancelled subscription.","Subscription reactivated! You have full access immediately. Billing resumes on the same cycle at the original rate. Welcome back!",9,1,'reactivate_subscription','web'],
  ["Do you integrate with Slack?","Yes — the Slack integration is available on Professional and Enterprise plans. Setup guide is in Settings → Integrations → Slack. Takes about 10 minutes.",8,1,'search_knowledge_base','web'],
  ["I accidentally made a duplicate order — can one be cancelled?","I can see two orders placed within minutes of each other. I've cancelled the duplicate and issued a full refund. The original order is still being processed normally.",9,2,'cancel_order','web'],
  ["I need to downgrade my plan due to budget cuts.","No problem — I've processed the downgrade to Starter. Takes effect at end of your current billing period so you keep full access until then. Confirmation email sent.",8,2,'cancel_subscription','email'],
  ["What's your uptime SLA?","Enterprise plan guarantees 99.9% uptime SLA with credits for downtime. Starter and Professional are 99.5% with best-effort credits. Our live status is at status.yourplatform.com.",8,1,'search_knowledge_base','web'],
  ["I need to speak to someone about a bulk purchase discount.","For bulk/enterprise pricing, our sales team will get you the best deal. I've logged a request — they'll email you within one business day with a custom quote.",8,2,'search_knowledge_base','email'],
]

// Distribute extra customer convs across days 4–30
const extraDays = [
  4,4,4,4,4, 5,5,5,5,5, 6,6,6,6, 7,7,7,7, 8,8,8,8, 9,9,9, 10,10,10, 12,12, 13,13, 15,15, 17,17, 19,19, 21,21, 23,23, 25,25, 27,27, 29,30,30, 28,26,24,22,20,18,16,14,11
]
// CSAT for roughly every 3rd extra conv
const extraCsatScores = [5,null,4,null,5,null,5,null,4,null,5,null,4,null,null,5,null,4,null,5,null,4,null,null,5,null,4,null,5,null,null,4,null,5,null,null,4,null,5,null,4,null,null,5,null,4,null,null,5,null]
const extraCsatComments = ['Really helpful!',null,'Great service',null,'Sorted instantly',null,'So helpful!',null,'Good response',null,'Fast and easy',null,'Lovely service',null,null,'Brilliant!',null,'Cheers',null,'Perfect answer',null,'Very impressed',null,null,'Great!',null,'Thanks',null,'Spot on!',null,null,'Easy fix',null,'Great support',null,null,'Quick reply',null,'Brilliant service',null,'Helped a lot',null,null,'Really pleased',null,'Thank you',null,null,'Excellent',null]

xt.forEach(([cMsg, aMsg, aiScore, turns, actionName, channel], i) => {
  const cid = extraIds[i]
  const d = extraDays[i] ?? 15
  const score = extraCsatScores[i] ?? undefined
  const comment = extraCsatComments[i] ?? undefined
  bconv(cid, channel, d, 'resolved', turns, cMsg, aMsg, actionName, 'auto', aiScore, 'Batch resolved conversation', score, comment)
})

// ══════════════════════════════════════════════════════════════════════════════
// LEARNING QUEUE
// ══════════════════════════════════════════════════════════════════════════════
const lq1 = uid(), lq2 = uid(), lq3 = uid(), lq4 = uid()
// Low CSAT — Tom Berkley login issue (d15, CSAT 3)
run(`INSERT INTO learning_queue (id,conversation_id,customer_message,agent_response,improvement_type,trigger,status,created_at) VALUES (?,?,?,?,?,?,?,?)`,
  lq1,d15,"I can get to the login page but when I hit submit it just refreshes and doesn't log me in.","Hi Tom! This is usually caused by cookies being blocked. Try: (1) opening in an incognito window, or (2) in Chrome go to Settings → Privacy → Cookies → Allow all. If you're on Firefox it usually works without any changes. Let me know how you get on!",'substance','low_csat','pending',da(2))
// Escalation — Priya Sharma distress
run(`INSERT INTO learning_queue (id,conversation_id,customer_message,agent_response,improvement_type,trigger,status,created_at) VALUES (?,?,?,?,?,?,?,?)`,
  lq2,d12,"I've been trying to get this sorted for TWO WEEKS and nobody has helped me. I'm at my wit's end. I can't afford to lose this money.","I'm so sorry you've been going through this — two weeks without a resolution is completely unacceptable and I can hear how stressful this is. I'm escalating this right now to a senior member of our team who will personally call you within the hour.",'escalation','escalated','pending',da(2))
// Escalation — Tom Berkley large refund
run(`INSERT INTO learning_queue (id,conversation_id,customer_message,agent_response,improvement_type,trigger,status,created_at) VALUES (?,?,?,?,?,?,?,?)`,
  lq3,d9,"I need a full refund on my order — the product completely failed after 3 days of use. Total was £620. I have photos of the damage.","Hi Tom, I'm really sorry — a product failing after 3 days is completely unacceptable and you absolutely deserve a resolution. Given the value of this refund, I'm escalating this to our senior team who have authority to process it immediately.",'escalation','escalated','pending',da(1))
// Agent-proposed KB entry (from self-improvement)
run(`INSERT INTO learning_queue (id,conversation_id,customer_message,agent_response,improvement_type,trigger,suggested_correction,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  lq4,d15,"I can get to the login page but it just refreshes.","Try incognito or clear your cache.",'agent_proposed','self_improvement',JSON.stringify({title:'Login page refresh loop — step-by-step fix',category:'technical',content:'If the login page refreshes without logging in: 1) Check cookies are allowed for this domain (Chrome: Settings → Privacy → Cookies). 2) Open in an incognito/private window to bypass extensions. 3) Clear browser cache and cookies (Ctrl+Shift+Del). 4) Try Firefox or Edge as an alternative. Root cause is almost always cookies blocked by an extension or privacy setting.'}),'pending',da(1))

// ══════════════════════════════════════════════════════════════════════════════
// AI INSIGHT REPORT (last 7 days)
// ══════════════════════════════════════════════════════════════════════════════
run(`INSERT INTO insight_reports (id,period_start,period_end,top_issues_json,complaint_clusters_json,competitor_mentions_json,pricing_signals_json,product_signals_json,summary,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  uid(), da(7), da(0),
  JSON.stringify(['Delivery delays and tracking anxiety','Password reset / account access (high volume)','Billing confusion around direct debits and plan charges','Subscription cancellation attempts','Technical login issues (cookie/cache related)']),
  JSON.stringify([
    {cluster:'Delivery delays',count:14,examples:["my order hasn't arrived and tracking hasn't updated","supposed to arrive yesterday and still nothing","been waiting 6 days with no tracking info"]},
    {cluster:'Account access issues',count:11,examples:["locked out after failed attempts","can't log in — password not working","getting a blank screen after login"]},
    {cluster:'Billing confusion',count:8,examples:["charged but thought I cancelled","didn't expect this charge","direct debit failed but I set one up"]},
    {cluster:'Cancellation/pause requests',count:5,examples:["want to cancel, not using it enough","too expensive at the moment","need to pause for budget reasons"]},
  ]),
  JSON.stringify(['3 customers mentioned comparing to Zendesk','1 customer referenced Freshdesk as alternative']),
  JSON.stringify(['4 customers asked about annual billing discount when told monthly price','2 Enterprise customers asked about volume/multi-site pricing','Several Starter customers asked what Professional includes before deciding','Price sensitivity most common trigger for cancellation attempts']),
  JSON.stringify(['6 requests for API access documentation or rate limit details','3 mentions of wanting a mobile app','2 customers asked about SSO/SAML support','Multiple requests for Slack integration info','1 request for Zapier integration']),
  'The past 7 days show elevated delivery enquiry volume, likely linked to ongoing Royal Mail delays in certain postcodes. Account access issues remain a consistent top-3 category — consider a proactive "forgotten your password?" nudge email at 30-day inactivity. There is meaningful pricing pressure: customers exploring plan upgrades and annual billing suggest the 20% annual discount is undersold. Competitor mentions are low (Zendesk × 3, Freshdesk × 1) but are appearing in upgrade/cancellation conversations, suggesting some customers are in active evaluation mode. API documentation requests are rising — strong signal to prioritise self-serve developer docs.',
  da(0))

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMER PREFERENCES
// ══════════════════════════════════════════════════════════════════════════════
run(`INSERT INTO customer_preferences (id,customer_id,communication_style,preferred_channel,known_context,language,last_issue_category,interaction_notes,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),c1,'formal and technical','email','Enterprise plan, uses API and Salesforce integration, has IT team','en','account','Prefers email. Technical background — can handle detailed API/integration guidance. Senior stakeholder, responds to SLA-focused language.',da(0))
run(`INSERT INTO customer_preferences (id,customer_id,communication_style,preferred_channel,known_context,language,last_issue_category,interaction_notes,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),c2,'friendly and efficient','web','VIP customer, growing startup, sensitive to billing surprises','en','billing','Prefers quick resolution. Occasionally contacts via Facebook DM. Always polite. Annual billing conversation worth raising again.',da(0))
run(`INSERT INTO customer_preferences (id,customer_id,communication_style,preferred_channel,known_context,language,last_issue_category,interaction_notes,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),c3,'casual and brief','web','Standard plan, regular small orders, delivery questions common','en','orders','Prefers short answers. Friendly tone works well. Delivery issues are recurring — proactively flag delays.',da(1))
run(`INSERT INTO customer_preferences (id,customer_id,communication_style,preferred_channel,known_context,language,last_issue_category,interaction_notes,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),c8,'professional and concise','email','VIP, fintech startup, compliance-conscious, evaluating Enterprise upgrade','en','account','Detail-oriented. Responds well to concrete specs and numbers. Enterprise upgrade discussion ongoing — likely to convert.',da(2))
run(`INSERT INTO customer_preferences (id,customer_id,communication_style,preferred_channel,known_context,language,last_issue_category,interaction_notes,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),c6,'formal','email','Enterprise plan, recurring invoice issues with direct debit','en','billing','Large account — treat as high priority. Invoice/billing issues are a pattern, may need proactive payment reminder setup.',da(3))

// ══════════════════════════════════════════════════════════════════════════════
// VOICE CALLS
// ══════════════════════════════════════════════════════════════════════════════
run(`INSERT INTO voice_calls (id,call_sid,from_number,to_number,customer_id,conversation_id,status,transcript_json,duration_seconds,started_at,ended_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  uid(),'CA001abc123def456','+447933456789','+441234567890',c3,d10,'completed',
  JSON.stringify([
    {role:'agent',content:"Thank you for calling. How can I help you today?"},
    {role:'customer',content:"Hi, I'm just checking on my delivery — I still haven't received my order."},
    {role:'agent',content:"Of course! Can you give me your order number or confirm your email address?"},
    {role:'customer',content:"It's dpark at gmail dot com."},
    {role:'agent',content:"Found it — your order is in transit with Royal Mail, expected delivery tomorrow. I've also applied a small goodwill credit for the delay. Is there anything else I can help with?"},
    {role:'customer',content:"That's great, thanks very much!"},
  ]),
  187, da(1), da(1))
run(`INSERT INTO voice_calls (id,call_sid,from_number,to_number,customer_id,status,transcript_json,duration_seconds,started_at,ended_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  uid(),'CA002xyz789ghi012','+447844567890','+441234567890',c4,'completed',
  JSON.stringify([
    {role:'agent',content:"Thank you for calling. How can I help you today?"},
    {role:'customer',content:"My account is locked and I need to get in urgently."},
    {role:'agent',content:"I can help with that. Can you confirm your email address for security?"},
    {role:'customer',content:"amara dot osei at consulting dot co"},
    {role:'agent',content:"Perfect — I've unlocked your account. You should be able to log in immediately. Please change your password once you're in."},
    {role:'customer',content:"Brilliant, thank you!"},
  ]),
  134, da(1), da(1))
run(`INSERT INTO voice_calls (id,call_sid,from_number,to_number,customer_id,status,transcript_json,duration_seconds,started_at,ended_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  uid(),'CA003mno345pqr678','+447611789012','+441234567890',c7,'completed',
  JSON.stringify([
    {role:'agent',content:"Thank you for calling. How can I help you today?"},
    {role:'customer',content:"I'm calling about cancelling my subscription."},
    {role:'agent',content:"I'm sorry to hear that. Can I ask what's prompting you to cancel today?"},
    {role:'customer',content:"It's mainly the cost — I'm not using it enough right now."},
    {role:'agent',content:"I understand. We do have a pause option that stops billing for up to 3 months while keeping your account active. Would that work better than cancelling?"},
    {role:'customer',content:"Oh actually that does sound better. Can you do that now?"},
    {role:'agent',content:"Absolutely — paused from today for 3 months. You'll receive a confirmation email shortly."},
  ]),
  243, da(2), da(2))

// ══════════════════════════════════════════════════════════════════════════════
// REVENUE EVENTS
// ══════════════════════════════════════════════════════════════════════════════
run(`INSERT INTO revenue_events (id,conversation_id,customer_id,type,trigger,action_taken,outcome,amount_gbp,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),d4,c7,'retention','cancellation_request','Offered 3-month subscription pause as alternative to cancellation','retained',29*3,da(0))
run(`INSERT INTO revenue_events (id,conversation_id,customer_id,type,trigger,action_taken,outcome,amount_gbp,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),d14,c8,'upsell','plan_upgrade_enquiry','Presented Enterprise plan benefits, booked account team call','pending_upgrade',470,da(2))
run(`INSERT INTO revenue_events (id,conversation_id,customer_id,type,trigger,action_taken,outcome,amount_gbp,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),d11,c2,'upsell','billing_query','Mentioned annual billing saves 20%','pending',129*2.4,da(1))
run(`INSERT INTO revenue_events (id,conversation_id,customer_id,type,trigger,action_taken,outcome,amount_gbp,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),d16,c1,'upsell','integration_enquiry','Proposed Salesforce connector and integration team call','pending_upgrade',4788,da(3))
run(`INSERT INTO revenue_events (id,conversation_id,customer_id,type,trigger,action_taken,outcome,amount_gbp,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  uid(),d10,c3,'retention','delivery_frustration','Applied £10 goodwill credit, delivery ETA confirmed','retained',10,da(1))

// ── Events ────────────────────────────────────────────────────────────────────
run(`INSERT INTO events (id,type,subject,description) VALUES (?,?,?,?)`,uid(),'seed','Database seeded','Demo seed data v1.3.0 loaded — 92 conversations, 50 extra customers, full feature data')

console.log('[seed] Done — v1.3.0 demo data loaded.')
console.log('  60 customers (10 named + 50 extra)')
console.log('  92 conversations: ~81 resolved (88%), 9 escalated (10%), 2 open')
console.log('  FCR: ~71% | Avg turns: ~2.1 | CSAT: ~4.3/5 (32 scores)')
console.log('  3 open escalations in queue (d9, d12, d18)')
console.log('  4 learning queue items (2 substance, 1 escalation, 1 agent-proposed)')
console.log('  1 AI insight report (last 7 days)')
console.log('  5 customer preference profiles')
console.log('  3 voice calls')
console.log('  5 revenue events')
console.log('')
console.log('  bun run seed  — to reset and reload')
console.log('  bun run start — to start all services')
