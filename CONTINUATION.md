# CX Agent — Continuation Reference

Autonomous omni-channel customer service agent. Monitors email, SMS, Facebook/Instagram DMs & comments, and website chat. Handles responses automatically, holds social media replies for owner approval, escalates what it can't resolve. Sold as a standalone Electron desktop app.

---

## Stack

- **Runtime**: Bun
- **AI**: Claude Sonnet 4.6 (`@anthropic-ai/sdk`)
- **DB**: SQLite via `bun:sqlite` (`data/cx.db`)
- **Email send**: Nodemailer (Gmail/SMTP)
- **Email receive**: imapflow + mailparser
- **Scheduler**: node-cron
- **Desktop**: Electron + electron-builder

---

## Ports

| Service        | Port |
|----------------|------|
| Dashboard      | 4747 |
| Channel API    | 4748 |

---

## Run Commands

```bash
bun run start          # start all services (dashboard + channel API + scheduler)
bun run seed           # reset + seed demo data
bun run app            # launch Electron app (dev)
bun run app:build      # build Windows installer → dist/installer/
bun run app:publish    # build + publish to GitHub Releases
```

---

## File Structure

```
cx-agent/
├── electron/
│   ├── main.cjs          — Electron main process (spawns Bun, tray, notifications)
│   └── loading.html      — Loading splash screen
├── src/
│   ├── index.ts          — Entry: loads config, starts dashboard + channel API + scheduler
│   ├── scheduler.ts      — Crons: email poll, stale-close, SLA check, CSAT, digests
│   ├── rules.ts          — Rules: stale close, CSAT, escalation rate, SLA breach, stuck convs
│   ├── seed.ts           — Demo data seed
│   ├── agent/
│   │   ├── resolver.ts   — handleCustomerMessage(): assembles tools + system prompt → resolveMessage()
│   │   └── channel-handler.ts — processInbound(): unified entry for all channels
│   ├── analytics/
│   │   └── metrics.ts    — CX metrics (resolution rate, FCR, CSAT, escalation rate, volume)
│   ├── channels/
│   │   ├── web.ts        — Channel API: chat widget + SMS webhook + Facebook/IG webhook
│   │   └── email-poller.ts — IMAP poll every 2 min, handles image attachments
│   ├── dashboard/
│   │   ├── server.ts     — Dashboard server + ALL API routes
│   │   ├── setup.ts      — First-run 4-step setup wizard
│   │   ├── ui.ts         — Dashboard HTML/JS (all panels + modals)
│   │   └── settings.ts   — Settings page HTML/JS
│   ├── lib/
│   │   ├── authority.ts  — Authority tier config (AUTO / CONFIRM / ESCALATE)
│   │   ├── channel-send.ts — Shared reply sender (email, SMS, FB, IG)
│   │   ├── client.ts     — Lazy Anthropic client
│   │   ├── config.ts     — Runtime config store (DB-persisted)
│   │   ├── context.ts    — Assembles customer context per agent turn (incl. identityVerified)
│   │   ├── db.ts         — SQLite schema (17 tables) + migrations
│   │   ├── email.ts      — Nodemailer helper
│   │   ├── events.ts     — Event log
│   │   ├── resolve.ts    — Core agentic loop (tool calls, media, learning queue population)
│   │   ├── sanitize.ts   — Prompt injection resistance (strips injection attempts)
│   │   └── sentiment.ts  — Frustration + vulnerability detection
│   └── tools/
│       ├── account.ts    — Account tools (unlock, reset, profile, reactivate)
│       ├── billing.ts    — Billing tools (refund, goodwill credit, invoice, retry payment)
│       ├── escalate.ts   — Escalation tools (human handoff, pending confirmation)
│       ├── integrations.ts — call_integration: calls client-configured external APIs
│       ├── knowledge.ts  — search_knowledge_base
│       ├── orders.ts     — Order tools (status, return, reship, cancel, reschedule)
│       ├── retention.ts  — Revenue tools (log_revenue_event, update_revenue_outcome)
│       ├── subscription.ts — Subscription tools (pause, cancel, change plan, reactivate)
│       └── verification.ts — Identity verification (send_verification_code, verify_identity)
├── .github/workflows/
│   └── release.yml       — GitHub Actions: build + publish installer on v* tag push
├── data/
│   └── cx.db             — SQLite database (gitignored)
└── package.json
```

---

## Database Tables

| Table               | Purpose                                                    |
|---------------------|------------------------------------------------------------|
| customers           | Customer records (name, email, tier, status)               |
| orders              | Orders with tracking and delivery info                     |
| subscriptions       | Subscription plans and billing status                      |
| invoices            | Invoice and refund records                                 |
| conversations       | Chat sessions (open/resolved/escalated + identity_verified)|
| messages            | Full message history                                       |
| actions_log         | Every tool call + authority tier + verified/success        |
| knowledge_base      | Policies + FAQs searched before every policy statement     |
| authority_config    | Per-action tier overrides (DB overrides defaults)          |
| escalations         | Human escalation queue with full context                   |
| csat_scores         | Post-resolution ratings (1–5)                             |
| events              | Audit trail (every system event)                           |
| config              | Runtime config (API keys, SMTP, brand voice, etc.)         |
| inbound_messages    | Unified inbox for all channels (pending / handled / etc.)  |
| revenue_events      | Retention + upsell attempts and outcomes                   |
| integrations        | Client-configured external API endpoints                   |
| verification_codes  | 6-digit codes for web chat identity verification           |
| learning_queue      | Flagged turns for human review (low CSAT, escalations)     |

---

## Channels

| Channel      | How it works                                                       |
|--------------|--------------------------------------------------------------------|
| Email        | IMAP polling every 2 min (imapflow). Replies via SMTP.             |
| SMS          | Twilio webhook POST /webhook/sms on port 4748                      |
| Facebook DMs | Meta Graph webhook POST /webhook/facebook. Enforces 24h window.   |
| FB Comments  | Same webhook, `field: feed/comments`. Uses comment reply endpoint. |
| Instagram    | Same webhook as Facebook.                                          |
| Web chat     | Embedded widget via <script src="http://HOST:4748/widget.js">      |

**Reply mode** (config: `REPLY_MODE`):
- `approve_social` (default) — auto-send email/SMS, hold social for approval
- `auto` — auto-send everything
- `approve_all` — hold everything for manual approval

---

## Agent Authority Tiers

| Tier     | Behaviour                                                     |
|----------|---------------------------------------------------------------|
| AUTO     | Execute immediately                                           |
| CONFIRM  | Call `request_customer_confirmation`, wait for customer yes   |
| ESCALATE | Call `escalate_to_human` immediately                         |

**Defaults:** Refund AUTO < £50 · CONFIRM £50–£500 · ESCALATE > £500. Goodwill AUTO ≤ £25.
Configurable per-action from Authority Config panel in dashboard.

---

## Tools Available to Agent

| Tool                         | Tier    | What it does                                              |
|------------------------------|---------|-----------------------------------------------------------|
| get_customer_account         | auto    | Full account lookup                                       |
| send_password_reset          | auto    | Email reset link                                          |
| unlock_account               | auto    | Unlock locked account                                     |
| update_profile               | auto    | Update phone / address                                    |
| reactivate_account           | auto    | Reactivate cancelled account                              |
| get_order_status             | auto    | Order + tracking lookup                                   |
| reschedule_delivery          | confirm | Change delivery date/address                              |
| cancel_order                 | confirm | Cancel unshipped order                                    |
| initiate_return              | auto    | Generate return label (≤30 days)                          |
| reship_item                  | confirm | Reship damaged/lost item                                  |
| get_invoice_history          | auto    | Recent invoices                                           |
| issue_refund                 | tiered  | Refund with AUTO/CONFIRM/ESCALATE by amount               |
| apply_goodwill_credit        | auto    | Goodwill credit ≤ £25                                     |
| retry_payment                | auto    | Retry failed payment                                      |
| send_payment_update_link     | auto    | Secure payment method update link                         |
| get_subscription_status      | auto    | Subscription details                                      |
| change_plan                  | confirm | Upgrade/downgrade plan                                    |
| pause_subscription           | confirm | Pause billing                                             |
| cancel_subscription          | confirm | Cancel (requires retention offer first)                   |
| reactivate_subscription      | auto    | Reactivate paused/cancelled sub                           |
| search_knowledge_base        | auto    | Search KB before stating any policy                       |
| request_customer_confirmation| auto    | Store pending confirmation for CONFIRM-tier actions       |
| escalate_to_human            | auto    | Human handoff with full context                           |
| log_revenue_event            | auto    | Record retention/upsell attempt + outcome                 |
| update_revenue_outcome       | auto    | Update outcome of pending revenue event                   |
| send_verification_code       | auto    | Send 6-digit code to registered email (web chat)          |
| verify_identity              | auto    | Verify code → mark conversation as identity_verified      |
| call_integration             | auto    | Call a client-configured external API by name             |

---

## Config Keys

| Key                                | Default         | Description                                    |
|------------------------------------|-----------------|------------------------------------------------|
| CLIENT_NAME                        | —               | Business name                                  |
| CLIENT_EMAIL                       | —               | Receives alerts + digests                      |
| ANTHROPIC_API_KEY                  | —               | Claude API key                                 |
| SMTP_HOST/PORT/USER/PASS           | —               | Outbound email                                 |
| IMAP_HOST/PORT/USER/PASS/TLS       | derived from SMTP | Inbound email polling                        |
| TWILIO_ACCOUNT_SID/AUTH_TOKEN      | —               | SMS                                            |
| TWILIO_PHONE_NUMBER                | —               | Your Twilio number                             |
| FB_PAGE_ACCESS_TOKEN               | —               | Facebook/Instagram page token                  |
| FB_VERIFY_TOKEN                    | —               | Webhook verification token                     |
| FB_PAGE_ID                         | —               | Facebook Page ID                               |
| REPLY_MODE                         | approve_social  | auto / approve_social / approve_all            |
| BRAND_TONE                         | professional    | professional / friendly / casual / formal      |
| BRAND_EMOJI_POLICY                 | none            | none / occasional / frequent                   |
| BRAND_LANGUAGE                     | en              | Default language fallback                      |
| ESCALATION_SLA_HOURS               | 2               | Hours before unattended escalation alert fires |
| REQUIRE_WEB_IDENTITY_VERIFICATION  | off             | on = require email code for web chat           |

---

## Dashboard API Routes (port 4747)

```
GET  /api/state                        — full dashboard state snapshot
GET  /api/metrics?days=30              — CX metrics
GET  /api/conversations/:id            — conversation detail + messages + actions
POST /api/conversations/:id/csat       — record CSAT score (≤2 → learning queue)
POST /api/escalations/:id/resolve      — resolve escalation
POST /api/escalations/:id/assign       — assign escalation
GET  /api/kb                           — list KB entries
POST /api/kb                           — create KB entry
PUT  /api/kb/:id                       — update KB entry
DELETE /api/kb/:id                     — delete KB entry
POST /api/kb/import                    — bulk import (raw text with --- separators OR entries[] JSON)
PATCH /api/authority/:action           — update authority tier for an action
GET  /api/customers                    — list customers
POST /api/customers                    — create customer
PUT  /api/customers/:id                — update customer
DELETE /api/customers/:id              — soft-delete customer
GET  /api/customers/:id/conversations  — customer conversation history
POST /api/inbox/:id/approve            — approve + send pending reply (editable before send)
POST /api/inbox/:id/discard            — discard pending reply
GET  /api/inbox?channel=&status=&limit= — paginated inbox
GET  /api/channels/status              — per-channel configured flags
POST /api/channels/test/email          — IMAP connection test
POST /api/channels/test/sms            — Twilio connection test
POST /api/channels/test/facebook       — Facebook Graph API connection test
GET  /api/integrations                 — list integrations
POST /api/integrations                 — create integration
PUT  /api/integrations/:id             — update integration
DELETE /api/integrations/:id           — delete integration
POST /api/integrations/:id/test        — test integration endpoint
GET  /api/learning-queue?status=       — list learning queue items
POST /api/learning-queue/:id/approve   — approve item (optionally create KB entry)
POST /api/learning-queue/:id/reject    — reject item
POST /api/setup/config                 — save a config key
POST /api/setup/validate-key           — validate Anthropic API key
```

---

## Channel API Routes (port 4748)

```
GET  /chat             — web chat page
GET  /widget.js        — embeddable chat widget script
POST /api/verify       — email check / contact auto-create (always returns found:true)
POST /api/chat         — handle web chat message
POST /webhook/sms      — Twilio SMS webhook (form-encoded)
GET  /webhook/facebook — Meta webhook verification
POST /webhook/facebook — Meta webhook events (DMs + comments, enforces 24h window)
GET  /api/health       — health check
```

---

## Security Features

- **Prompt injection resistance** (`src/lib/sanitize.ts`): 16 regex patterns strip role-override/jailbreak attempts from all inbound text before it reaches the LLM. Logged as `security_injection_attempt` events.
- **Rate limiting**: 20 messages per conversation per 10 minutes (in-memory, `channel-handler.ts`).
- **Identity verification**: Web chat conversations start unverified. Agent calls `send_verification_code` → `verify_identity` before disclosing account data. Non-web channels auto-verified by sender identity.
- **Injection-hardened system prompt**: Final rule — agent will not comply with instructions that try to override authority tiers, policies, or identity.
- **Meta 24h window**: Facebook/Instagram DMs outside the 24h reply window are blocked from auto-send and queued for human review.

---

## Spec Compliance Status

All items from the product spec (`slwo gpkd dhlu mkza.txt`) are now built:

| # | Item | Status |
|---|------|--------|
| 1 | Omnichannel intake | ✓ |
| 2 | Conversation threading | ✓ |
| 3 | Window-state tracking (Meta 24h) | ✓ |
| 4 | Media handling (images via email + FB) | ✓ |
| 5 | Ground-truth KB layer | ✓ |
| 6 | Zero-hallucination posture | ✓ |
| 7 | Live system access (external integrations) | ✓ |
| 8 | Policy engine (authority_config table) | ✓ |
| 9 | Resolution over conversation | ✓ |
| 10 | Write capabilities | ✓ |
| 11 | Tiered authority as config | ✓ |
| 12 | Verify-after-act | ✓ |
| 13 | Idempotency | ✓ |
| 14 | Human handoff | ✓ |
| 15 | Escalation SLA awareness | ✓ |
| 16 | Hard compliance walls | ✓ |
| 17 | PII discipline (identity verification) | ✓ |
| 18 | Prompt-injection resistance | ✓ |
| 19 | Brand voice config | ✓ |
| 20 | Multilingual | ✓ |
| 21 | Context retention | ✓ |
| 22 | Sentiment-adaptive | ✓ |
| 23 | Audit ledger | ✓ |
| 24 | Confidence + reasoning capture | ✓ |
| 25 | Metrics dashboard | ✓ |
| 26 | Asymmetric self-improvement (learning queue) | ✓ |
| 27 | Graceful degradation | ✓ |
| 28 | Rate/abuse controls | ✓ |
| 29 | Multi-tenancy | ✓ |
| 30 | Onboarding pipeline (KB import) | ✓ |
| 31 | Approval inbox | ✓ |
| 32 | Revenue awareness | ✓ |

---

## CURRENT STATE — v1.3.0 READY TO TAG

All 32 spec items are built plus 8 advanced CX intelligence features. TypeScript clean (`bunx tsc --noEmit` passes).

**Completed in v1.3.0 (advanced CX capabilities):**
- ✓ **Inferred CSAT** — Claude Haiku scores 100% of resolved/escalated conversations (1–10 + reason). Shown in metrics bar and per-conversation. Scored hourly via scheduler (`src/lib/inferred-csat.ts`)
- ✓ **AI Insight Brief** — Claude Sonnet analyses last N days of conversations, clusters complaints, surfaces competitor mentions / pricing signals / product signals. Weekly email + dashboard panel. Manual trigger via dashboard. (`src/lib/insights.ts`)
- ✓ **Conversation Replay UI** — Step-through timeline modal tab interleaving customer/agent messages and tool calls with timestamps, tiers, and verification status (`GET /api/conversations/:id/replay`)
- ✓ **Self-Improvement Proposals** — Agent analyses failed/escalated turns in learning queue and proposes KB entries to fill the gap. Appear as `agent_proposed` items in learning queue for human approval. Runs Sunday 23:00. (`src/lib/self-improve.ts`)
- ✓ **Memory-Rich Personalization** — Customer communication style, language, channel preference, issue history persist across sessions. Injected into every agent turn's system prompt. (`src/lib/customer-memory.ts`)
- ✓ **Voice Channel** — Twilio TwiML gather/say loop. Bun.serve on port 4749. Starts automatically if VOICE_WEBHOOK_URL is set. (`src/channels/voice.ts`)
- ✓ **MCP Server** — Standalone stdio JSON-RPC MCP server exposing 5 CX tools to any MCP-compatible AI agent. (`src/mcp/server.ts`, `bun run mcp`)
- ✓ **QA Simulation CLI** — 6 synthetic personas test critical paths (password reset, refund, cancellation, distressed customer, prompt injection, large refund). Exit 1 if assertions fail. (`src/qa/simulate.ts`, `bun run simulate`)

**NEXT: tag and release**

```bash
git add src/ package.json CONTINUATION.md
git commit -m "feat: v1.3.0 — inferred CSAT, AI insights, conversation replay, self-improvement, customer memory, voice, MCP, QA sim"
git tag v1.3.0
git push origin master --tags
```

**PRE-CLIENT checklist (must do before any client goes live):**
- [ ] Remove "Skip for now →" button from setup wizard (src/dashboard/setup.ts)
- [ ] Configure channels per client (email App Password, Twilio credentials, Meta Page Access Token)
- [ ] Voice: configure VOICE_WEBHOOK_URL + Twilio credentials + point Twilio webhook to `{VOICE_WEBHOOK_URL}/webhook/voice`
- [ ] Channel credentials wiring (see cx_agent_channel_wiring memory)

---

## Ports

| Service        | Port |
|----------------|------|
| Dashboard      | 4747 |
| Channel API    | 4748 |
| Voice          | 4749 |

---

## Scheduler Jobs

| Schedule         | Job                                                              |
|------------------|------------------------------------------------------------------|
| Every 2 min      | Poll IMAP inbox for new email                                    |
| Every 30 min     | Close stale conversations + escalation rate alert + SLA breach   |
| Every hour :00   | Send CSAT email requests for resolved conversations              |
| Every hour :30   | AI-score unscored conversations (inferred CSAT, up to 15)        |
| Every 2 hours    | Flag stuck conversations (10+ turns, unresolved)                 |
| Daily 09:00      | Proactive outreach to at-risk customers (overdue + active sub)   |
| Daily 06:00      | Morning digest email to CLIENT_EMAIL                             |
| Sunday 22:00     | Generate weekly AI insight report + email brief to CLIENT_EMAIL  |
| Sunday 23:00     | Self-improvement: agent proposes KB entries from failed turns    |
| Monday 08:00     | Weekly summary email to CLIENT_EMAIL                             |

---

## New Config Keys (v1.3.0)

| Key                | Description                                               |
|--------------------|-----------------------------------------------------------|
| VOICE_WEBHOOK_URL  | Public HTTPS URL Twilio hits (e.g. https://abc.ngrok.io). If set, voice server starts on port 4749. |

---

## New Scripts (v1.3.0)

```bash
bun run simulate    # QA simulation — 6 synthetic personas, exits 1 on failure
bun run mcp         # Start MCP server (stdio, for use by AI orchestrators)
```

---

## MCP Server Tools

| Tool                      | Description                                    |
|---------------------------|------------------------------------------------|
| cx_search_knowledge_base  | Full-text search KB entries                    |
| cx_get_metrics            | Current CX metrics (resolution, CSAT, etc.)    |
| cx_check_customer         | Look up customer by email                      |
| cx_list_escalations       | List open escalations                          |
| cx_get_insights           | Latest AI insight report                       |

MCP config for Claude Desktop / other clients:
```json
{
  "mcpServers": {
    "cx-agent": {
      "command": "bun",
      "args": ["run", "C:/path/to/cx-agent/src/mcp/server.ts"]
    }
  }
}
```

---

## Electron App

- Tray icon with "Open Dashboard" and "Quit" menu
- Polls `/api/state` every 60 seconds
- Shows `Notification` when new escalations or pending approvals appear
- Auto-updates via `electron-updater` on new GitHub Releases
- Loading splash while Bun server starts

---

## Release Process

```bash
git tag v1.3.0
git push origin v1.3.0
```
GitHub Actions (`release.yml`) builds NSIS installer and publishes to GitHub Releases. Running apps auto-update on next startup.
