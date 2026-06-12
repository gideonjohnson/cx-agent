export function getSettingsHtml(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CX Agent — Settings</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
      background:#0d0f14;color:#e2e8f0;min-height:100vh;
      background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,0.018) 1px,transparent 0);
      background-size:24px 24px;
    }
    header{
      background:linear-gradient(180deg,rgba(255,255,255,0.022) 0%,#161922 100%);
      border-bottom:1px solid #252a35;padding:12px 24px;
      display:flex;align-items:center;justify-content:space-between;
      box-shadow:0 1px 3px rgba(0,0,0,0.45),0 1px 2px rgba(0,0,0,0.3);
      position:sticky;top:0;z-index:10;
    }
    header h1{font-size:15px;font-weight:600}
    .back{font-size:12px;color:#64748b;text-decoration:none;transition:color .15s}
    .back:hover{color:#e2e8f0}
    .page{max-width:640px;margin:0 auto;padding:32px 24px 64px}
    .section{
      background:linear-gradient(180deg,rgba(255,255,255,0.022) 0%,#161922 48px);
      border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:16px;
      box-shadow:inset 0 1px 0 rgba(255,255,255,0.055),0 4px 14px rgba(0,0,0,0.35);
    }
    .section-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:18px}
    .field{margin-bottom:16px}
    .field:last-child{margin-bottom:0}
    .field label{display:block;font-size:12px;font-weight:500;color:#94a3b8;margin-bottom:5px}
    .field-row{display:flex;gap:8px}
    .field-row input{flex:1}
    input,select{
      width:100%;padding:9px 11px;background:rgba(8,10,16,0.55);border:1px solid #252a35;
      border-radius:7px;color:#e2e8f0;font-size:13px;outline:none;
      box-shadow:inset 0 2px 5px rgba(0,0,0,0.28);
      transition:border-color .15s,box-shadow .15s;
    }
    input:focus,select:focus{border-color:#6366f1;box-shadow:inset 0 2px 5px rgba(0,0,0,0.28),0 0 0 2px rgba(99,102,241,0.18)}
    input::placeholder{color:#374151}
    input[type=password]{font-family:monospace}
    .hint{font-size:11px;color:#475569;margin-top:5px}
    .hint a{color:#6366f1;text-decoration:none}
    .btn-save{
      padding:8px 18px;
      background:linear-gradient(180deg,#7173f5 0%,#5c5fe8 100%);
      color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:500;cursor:pointer;
      box-shadow:0 1px 3px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.12);
      transition:all .15s;
    }
    .btn-save:hover{
      background:linear-gradient(180deg,#8082f6 0%,#6b6ef0 100%);
      box-shadow:0 3px 10px rgba(0,0,0,0.35),0 0 14px rgba(99,102,241,0.28),inset 0 1px 0 rgba(255,255,255,0.12);
      transform:translateY(-1px);
    }
    .btn-save:disabled{opacity:.4;cursor:not-allowed;transform:none}
    .saved{font-size:12px;color:#22c55e;margin-left:8px;opacity:0;transition:opacity .3s}
    .saved.show{opacity:1}
    .err{font-size:12px;color:#ef4444;margin-left:8px}
    .two-col{display:grid;grid-template-columns:1fr 90px;gap:10px}
    .embed-box{
      background:rgba(8,10,16,0.7);border:1px solid #252a35;border-radius:7px;padding:12px;
      font-size:11px;font-family:monospace;color:#94a3b8;line-height:1.6;
      white-space:pre-wrap;word-break:break-all;cursor:pointer;
      box-shadow:inset 0 2px 8px rgba(0,0,0,0.3);
      transition:border-color .15s,box-shadow .15s;
    }
    .embed-box:hover{border-color:#6366f1;box-shadow:inset 0 2px 8px rgba(0,0,0,0.3),0 0 0 2px rgba(99,102,241,0.12)}
    .copy-hint{font-size:11px;color:#475569;margin-top:5px}
    footer{
      background:linear-gradient(180deg,#161922 0%,rgba(10,12,18,0.97) 100%);
      border-top:1px solid #252a35;padding:8px 24px;font-size:11px;color:#475569;
      position:fixed;bottom:0;width:100%;
      box-shadow:0 -4px 14px rgba(0,0,0,0.25);
    }
  </style>
</head>
<body>
<header>
  <h1>⚙️ Settings</h1>
  <a class="back" href="/">← Back to Dashboard</a>
</header>

<div class="page">

  <!-- Agent Behavior -->
  <div class="section">
    <div class="section-title">Agent Behavior</div>
    <div class="field">
      <label>Reply mode</label>
      <div class="field-row">
        <select id="REPLY_MODE">
          <option value="approve_social">Require approval for social media (Facebook, Instagram) — auto-send email &amp; SMS</option>
          <option value="auto">Auto-send all replies immediately</option>
          <option value="approve_all">Require approval for all channels</option>
        </select>
        <button class="btn-save" onclick="save('REPLY_MODE')">Save</button>
        <span class="saved" id="saved-REPLY_MODE">Saved ✓</span>
      </div>
      <p class="hint">Social media replies are public — review before sending is recommended. Pending approvals appear at the top of the dashboard.</p>
    </div>

    <div class="field">
      <label>Brand tone</label>
      <div class="field-row">
        <select id="BRAND_TONE">
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="casual">Casual</option>
          <option value="formal">Formal</option>
        </select>
        <button class="btn-save" onclick="save('BRAND_TONE')">Save</button>
        <span class="saved" id="saved-BRAND_TONE">Saved ✓</span>
      </div>
    </div>

    <div class="field">
      <label>Emoji policy</label>
      <div class="field-row">
        <select id="BRAND_EMOJI_POLICY">
          <option value="none">No emojis</option>
          <option value="occasional">Occasional (max 1 per message)</option>
          <option value="frequent">Frequent</option>
        </select>
        <button class="btn-save" onclick="save('BRAND_EMOJI_POLICY')">Save</button>
        <span class="saved" id="saved-BRAND_EMOJI_POLICY">Saved ✓</span>
      </div>
    </div>

    <div class="field">
      <label>Default language</label>
      <div class="field-row">
        <select id="BRAND_LANGUAGE">
          <option value="en">English</option>
          <option value="en-gb">English (British)</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
          <option value="pt">Portuguese</option>
          <option value="ar">Arabic</option>
          <option value="zh">Chinese</option>
        </select>
        <button class="btn-save" onclick="save('BRAND_LANGUAGE')">Save</button>
        <span class="saved" id="saved-BRAND_LANGUAGE">Saved ✓</span>
      </div>
      <p class="hint">The agent will auto-detect and match the customer's language regardless of this setting. This sets the fallback.</p>
    </div>

    <div class="field">
      <label>Escalation SLA (hours)</label>
      <div class="field-row">
        <input type="number" id="ESCALATION_SLA_HOURS" min="1" max="72" placeholder="2" style="width:80px">
        <button class="btn-save" onclick="save('ESCALATION_SLA_HOURS')">Save</button>
        <span class="saved" id="saved-ESCALATION_SLA_HOURS">Saved ✓</span>
      </div>
      <p class="hint">Unattended escalations older than this will trigger an email alert. Default: 2 hours.</p>
    </div>

    <div class="field">
      <label>Web chat identity verification</label>
      <div class="field-row">
        <select id="REQUIRE_WEB_IDENTITY_VERIFICATION">
          <option value="off">Off — trust the email address the customer provides</option>
          <option value="on">On — send a 6-digit code before disclosing any account data</option>
        </select>
        <button class="btn-save" onclick="save('REQUIRE_WEB_IDENTITY_VERIFICATION')">Save</button>
        <span class="saved" id="saved-REQUIRE_WEB_IDENTITY_VERIFICATION">Saved ✓</span>
      </div>
      <p class="hint">When enabled, the agent will verify the customer's email with a one-time code before looking up orders, billing, or account data in web chat sessions. Non-web channels (email, SMS, Facebook) are always auto-verified by sender identity.</p>
    </div>
  </div>

  <!-- Business -->
  <div class="section">
    <div class="section-title">Business</div>
    <div class="field">
      <label>Business name</label>
      <div class="field-row">
        <input type="text" id="CLIENT_NAME" placeholder="Acme Ltd">
        <button class="btn-save" onclick="save('CLIENT_NAME')">Save</button>
        <span class="saved" id="saved-CLIENT_NAME">Saved ✓</span>
      </div>
    </div>
    <div class="field">
      <label>Notification email</label>
      <div class="field-row">
        <input type="email" id="CLIENT_EMAIL" placeholder="you@company.com">
        <button class="btn-save" onclick="save('CLIENT_EMAIL')">Save</button>
        <span class="saved" id="saved-CLIENT_EMAIL">Saved ✓</span>
      </div>
      <p class="hint">Receives daily digests, escalation alerts, and stuck-conversation warnings.</p>
    </div>
  </div>

  <!-- AI -->
  <div class="section">
    <div class="section-title">AI</div>
    <div class="field">
      <label>Anthropic API key</label>
      <div class="field-row">
        <input type="password" id="ANTHROPIC_API_KEY" placeholder="sk-ant-api03-…">
        <button class="btn-save" onclick="saveAndValidate()">Save</button>
        <span class="saved" id="saved-ANTHROPIC_API_KEY">Saved ✓</span>
      </div>
      <p class="hint">Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank">console.anthropic.com</a>.</p>
    </div>
  </div>

  <!-- Email outbound + IMAP inbox -->
  <div class="section">
    <div class="section-title">Email — Outbound (SMTP) + Inbox Monitoring (IMAP)</div>
    <div class="field">
      <label>SMTP host &amp; port</label>
      <div class="two-col">
        <input type="text" id="SMTP_HOST" placeholder="smtp.gmail.com">
        <input type="number" id="SMTP_PORT" placeholder="587">
      </div>
    </div>
    <div class="field">
      <label>Email address</label>
      <input type="email" id="SMTP_USER" placeholder="you@gmail.com">
    </div>
    <div class="field">
      <label>Password / App password</label>
      <div class="field-row">
        <input type="password" id="SMTP_PASS" placeholder="Gmail App Password">
        <button class="btn-save" onclick="saveSmtp()">Save all</button>
        <span class="saved" id="saved-smtp">Saved ✓</span>
      </div>
      <p class="hint">For Gmail: generate an App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank">myaccount.google.com/apppasswords</a>.</p>
    </div>
    <div class="field" style="margin-top:20px;padding-top:16px;border-top:1px solid #252a35">
      <label>IMAP host &amp; port <span style="color:#475569;font-weight:400">(inbox monitoring — defaults to imap.* equivalent of SMTP host)</span></label>
      <div class="two-col">
        <input type="text" id="IMAP_HOST" placeholder="imap.gmail.com">
        <input type="number" id="IMAP_PORT" placeholder="993">
      </div>
    </div>
    <div class="field">
      <label>IMAP email &amp; password <span style="color:#475569;font-weight:400">(leave blank to reuse SMTP credentials)</span></label>
      <div class="field-row">
        <input type="email" id="IMAP_USER" placeholder="same as SMTP email">
        <input type="password" id="IMAP_PASS" placeholder="same as SMTP password" style="flex:1">
        <button class="btn-save" onclick="saveImap()">Save</button>
        <span class="saved" id="saved-imap">Saved ✓</span>
      </div>
      <p class="hint">The agent polls your inbox every 2 minutes, handles new emails automatically, and replies via SMTP. Emails are marked as read after processing.</p>
    </div>
    <div class="field">
      <button class="btn-save" style="background:#1e2330;color:#94a3b8;border:1px solid #252a35" onclick="testChannel('email')">Test email connection</button>
      <span id="test-email-result" style="font-size:12px;margin-left:10px"></span>
    </div>
  </div>

  <!-- SMS / Twilio -->
  <div class="section">
    <div class="section-title">SMS — Twilio</div>
    <div class="field">
      <label>Account SID</label>
      <input type="text" id="TWILIO_ACCOUNT_SID" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
    </div>
    <div class="field">
      <label>Auth token</label>
      <input type="password" id="TWILIO_AUTH_TOKEN" placeholder="your auth token">
    </div>
    <div class="field">
      <label>Twilio phone number</label>
      <div class="field-row">
        <input type="text" id="TWILIO_PHONE_NUMBER" placeholder="+44700000000">
        <button class="btn-save" onclick="saveTwilio()">Save all</button>
        <span class="saved" id="saved-twilio">Saved ✓</span>
      </div>
    </div>
    <div class="field">
      <label>Webhook URL — paste this into Twilio Console → Phone Numbers → Messaging</label>
      <div class="embed-box" id="sms-webhook" onclick="copyField(this)"></div>
      <p class="copy-hint">Click to copy · Requires this machine to be reachable (use ngrok for local testing)</p>
    </div>
    <div class="field">
      <button class="btn-save" style="background:#1e2330;color:#94a3b8;border:1px solid #252a35" onclick="testChannel('sms')">Test Twilio connection</button>
      <span id="test-sms-result" style="font-size:12px;margin-left:10px"></span>
    </div>
  </div>

  <!-- Facebook / Instagram -->
  <div class="section">
    <div class="section-title">Facebook &amp; Instagram — Meta Graph API</div>
    <div class="field">
      <label>Page Access Token</label>
      <div class="field-row">
        <input type="password" id="FB_PAGE_ACCESS_TOKEN" placeholder="EAAxxxxxxxxxxxx">
        <button class="btn-save" onclick="saveFacebook()">Save all</button>
        <span class="saved" id="saved-facebook">Saved ✓</span>
      </div>
    </div>
    <div class="field">
      <label>Webhook verify token <span style="color:#475569;font-weight:400">(you create this — any string)</span></label>
      <input type="text" id="FB_VERIFY_TOKEN" placeholder="my-secret-verify-token-123">
    </div>
    <div class="field">
      <label>Webhook URL — paste into Meta Developer Console → App → Webhooks</label>
      <div class="embed-box" id="fb-webhook" onclick="copyField(this)"></div>
      <p class="copy-hint">Click to copy · Subscribe to: messages, message_reactions, feed (for post comments)</p>
    </div>
    <p class="hint" style="margin-top:8px">Get a Page Access Token at <a href="https://developers.facebook.com/" target="_blank">developers.facebook.com</a> → App → Messenger → Settings. The same token covers Instagram if your IG is linked to the Facebook Page.</p>
    <div class="field" style="margin-top:12px">
      <button class="btn-save" style="background:#1e2330;color:#94a3b8;border:1px solid #252a35" onclick="testChannel('facebook')">Test Facebook connection</button>
      <span id="test-facebook-result" style="font-size:12px;margin-left:10px"></span>
    </div>
  </div>

  <!-- WhatsApp operator bot -->
  <div class="section">
    <div class="section-title">WhatsApp — Operator Bot</div>
    <p style="font-size:13px;color:#94a3b8;margin-bottom:18px;line-height:1.6">Control CX Agent from WhatsApp. Uses your existing Twilio account — no extra cost beyond standard WhatsApp messaging rates.</p>
    <div class="field">
      <label>Twilio WhatsApp number <span style="color:#475569;font-weight:400">(sandbox: +14155238886)</span></label>
      <div class="field-row">
        <input type="text" id="TWILIO_WHATSAPP_NUMBER" placeholder="+14155238886">
        <button class="btn-save" onclick="save('TWILIO_WHATSAPP_NUMBER')">Save</button>
        <span class="saved" id="saved-TWILIO_WHATSAPP_NUMBER">Saved ✓</span>
      </div>
      <p class="hint">Enable WhatsApp at <a href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn" target="_blank">console.twilio.com</a> → Messaging → Try it out → Send a WhatsApp message. For production, request a WhatsApp Sender.</p>
    </div>
    <div class="field">
      <label>Your WhatsApp number <span style="color:#475569;font-weight:400">(operator's number — messages from here are treated as operator commands)</span></label>
      <div class="field-row">
        <input type="text" id="WHATSAPP_OPERATOR_NUMBER" placeholder="+447700900123">
        <button class="btn-save" onclick="save('WHATSAPP_OPERATOR_NUMBER')">Save</button>
        <span class="saved" id="saved-WHATSAPP_OPERATOR_NUMBER">Saved ✓</span>
      </div>
      <p class="hint">Include country code (e.g. +44 for UK). Only messages from this number are accepted — all others are ignored.</p>
    </div>
    <div class="field">
      <label>Webhook URL — paste this into Twilio Console → WhatsApp → Sandbox Settings → When a message comes in</label>
      <div class="embed-box" id="wa-webhook" onclick="copyField(this)"></div>
      <p class="copy-hint">Click to copy</p>
    </div>
    <div class="field">
      <button class="btn-save" style="background:#1e2330;color:#94a3b8;border:1px solid #252a35" onclick="testChannel('whatsapp')">Test WhatsApp connection</button>
      <span id="test-whatsapp-result" style="font-size:12px;margin-left:10px"></span>
    </div>
  </div>

  <!-- Telegram operator bot -->
  <div class="section">
    <div class="section-title">Telegram — Operator Bot</div>
    <p style="font-size:13px;color:#94a3b8;margin-bottom:18px;line-height:1.6">Control CX Agent from your phone. Get escalation alerts, approve replies, and query the agent in plain English — all from Telegram.</p>
    <div class="field">
      <label>Bot token <span style="color:#475569;font-weight:400">(from @BotFather → /newbot)</span></label>
      <div class="field-row">
        <input type="password" id="TELEGRAM_BOT_TOKEN" placeholder="7123456789:AAHdqT...">
        <button class="btn-save" onclick="save('TELEGRAM_BOT_TOKEN')">Save</button>
        <span class="saved" id="saved-TELEGRAM_BOT_TOKEN">Saved ✓</span>
      </div>
      <p class="hint">Open Telegram → search <strong>@BotFather</strong> → send <code>/newbot</code> → copy the token here.</p>
    </div>
    <div class="field">
      <label>Operator chat ID <span style="color:#475569;font-weight:400">(auto-filled on first /start)</span></label>
      <div class="field-row">
        <input type="text" id="TELEGRAM_CHAT_ID" placeholder="Auto-registered when you send /start to your bot">
        <button class="btn-save" onclick="save('TELEGRAM_CHAT_ID')">Save</button>
        <span class="saved" id="saved-TELEGRAM_CHAT_ID">Saved ✓</span>
      </div>
      <p class="hint">After saving the token and restarting, open your bot in Telegram and send <code>/start</code>. The chat ID registers automatically. Or find it via <a href="https://t.me/userinfobot" target="_blank">@userinfobot</a>.</p>
    </div>
    <div class="field">
      <button class="btn-save" style="background:#1e2330;color:#94a3b8;border:1px solid #252a35" onclick="testChannel('telegram')">Test Telegram connection</button>
      <span id="test-telegram-result" style="font-size:12px;margin-left:10px"></span>
    </div>
  </div>

  <!-- Chat widget embed -->
  <div class="section">
    <div class="section-title">Chat Widget</div>
    <p style="font-size:13px;color:#94a3b8;margin-bottom:14px;line-height:1.6">Add this snippet to any webpage to embed the customer chat widget as a floating button. Replace <code style="color:#6366f1">YOUR_SERVER_IP</code> with this machine's IP address if embedding externally.</p>
    <div class="embed-box" id="embed-snippet" onclick="copySnippet(this)"></div>
    <p class="copy-hint" id="copy-hint">Click to copy</p>
    <div style="margin-top:12px">
      <a id="chat-link" href="http://localhost:4748/chat" target="_blank" style="font-size:12px;color:#6366f1;text-decoration:none">Open chat page →</a>
    </div>
  </div>

  <!-- Dashboard port -->
  <div class="section">
    <div class="section-title">Advanced</div>
    <div class="field">
      <label>Dashboard port <span style="color:#475569;font-weight:400">(requires restart)</span></label>
      <div class="field-row" style="max-width:200px">
        <input type="number" id="DASHBOARD_PORT" placeholder="4747">
        <button class="btn-save" onclick="save('DASHBOARD_PORT')">Save</button>
        <span class="saved" id="saved-DASHBOARD_PORT">Saved ✓</span>
      </div>
    </div>
  </div>

</div>

<footer>CX Agent — Settings</footer>

<script>
async function testChannel(ch) {
  const resultEl = document.getElementById(\`test-\${ch}-result\`)
  if (resultEl) { resultEl.textContent = 'Testing…'; resultEl.style.color = '#64748b' }
  try {
    const r = await fetch(\`/api/channels/test/\${ch}\`, { method: 'POST' })
    const d = await r.json()
    if (resultEl) {
      resultEl.textContent = d.ok ? ('✓ ' + d.message) : ('✗ ' + d.error)
      resultEl.style.color = d.ok ? '#22c55e' : '#ef4444'
    }
  } catch (e) {
    if (resultEl) { resultEl.textContent = '✗ Connection failed'; resultEl.style.color = '#ef4444' }
  }
}

async function loadStatus() {
  const d  = await fetch('/api/setup/status').then(r=>r.json()).catch(()=>({}))
  const ch = await fetch('/api/channels/status').then(r=>r.json()).catch(()=>({}))
  const st = await fetch('/api/state').then(r=>r.json()).catch(()=>({}))

  if (d.client_name)  document.getElementById('CLIENT_NAME').value  = d.client_name
  if (d.client_email) document.getElementById('CLIENT_EMAIL').value = d.client_email
  if (d.smtp_user)    document.getElementById('SMTP_USER').value    = d.smtp_user

  if (ch.email?.user)       document.getElementById('IMAP_USER').value = ch.email.user
  if (ch.sms?.phone)       document.getElementById('TWILIO_PHONE_NUMBER').value = ch.sms.phone
  if (ch.telegram?.chatId) document.getElementById('TELEGRAM_CHAT_ID').value = ch.telegram.chatId
  if (ch.whatsapp?.whatsappNumber) document.getElementById('TWILIO_WHATSAPP_NUMBER').value = ch.whatsapp.whatsappNumber
  if (ch.whatsapp?.operatorNumber) document.getElementById('WHATSAPP_OPERATOR_NUMBER').value = ch.whatsapp.operatorNumber

  document.getElementById('wa-webhook').textContent =
    \`http://\${host}:\${port}/webhook/whatsapp\`

  const port = ch.web?.port || 4748
  const host = location.hostname || 'YOUR_SERVER_IP'

  document.getElementById('embed-snippet').textContent =
    \`<script src="http://\${host}:\${port}/widget.js"><\\/script>\`

  document.getElementById('sms-webhook').textContent =
    \`http://\${host}:\${port}/webhook/sms\`

  document.getElementById('fb-webhook').textContent =
    \`http://\${host}:\${port}/webhook/facebook\`

  if (st.replyMode) {
    const sel = document.getElementById('REPLY_MODE')
    if (sel) sel.value = st.replyMode
  }

  // Brand voice
  const cfg = await fetch('/api/setup/status').then(r=>r.json()).catch(()=>({}))
  // Fetch individual brand voice values via state extras
  for (const key of ['BRAND_TONE','BRAND_EMOJI_POLICY','BRAND_LANGUAGE','ESCALATION_SLA_HOURS','REQUIRE_WEB_IDENTITY_VERIFICATION']) {
    const el = document.getElementById(key)
    if (el && st.config && st.config[key]) el.value = st.config[key]
  }
}

async function save(key) {
  const val = document.getElementById(key).value.trim()
  if (!val) return
  const res = await fetch('/api/setup/config', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ key, value: val }),
  })
  if (res.ok) flash('saved-' + key)
}

async function saveAndValidate() {
  const key = document.getElementById('ANTHROPIC_API_KEY').value.trim()
  if (!key) return
  const res = await fetch('/api/setup/validate-key', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ key }),
  })
  const d = await res.json()
  if (!d.valid) { alert(d.error || 'Invalid API key'); return }
  await fetch('/api/setup/config', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ key: 'ANTHROPIC_API_KEY', value: key }),
  })
  flash('saved-ANTHROPIC_API_KEY')
}

async function saveSmtp() {
  for (const f of ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS']) {
    const val = document.getElementById(f).value.trim()
    if (!val) continue
    await fetch('/api/setup/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: f, value: val }) })
  }
  flash('saved-smtp')
}

async function saveImap() {
  for (const f of ['IMAP_HOST','IMAP_PORT','IMAP_USER','IMAP_PASS']) {
    const val = document.getElementById(f)?.value?.trim()
    if (!val) continue
    await fetch('/api/setup/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: f, value: val }) })
  }
  flash('saved-imap')
}

async function saveTwilio() {
  for (const f of ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_PHONE_NUMBER']) {
    const val = document.getElementById(f)?.value?.trim()
    if (!val) continue
    await fetch('/api/setup/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: f, value: val }) })
  }
  flash('saved-twilio')
}

async function saveFacebook() {
  for (const f of ['FB_PAGE_ACCESS_TOKEN','FB_VERIFY_TOKEN']) {
    const val = document.getElementById(f)?.value?.trim()
    if (!val) continue
    await fetch('/api/setup/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: f, value: val }) })
  }
  flash('saved-facebook')
}

function flash(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), 2000)
}

function copySnippet(el) {
  navigator.clipboard.writeText(el.textContent).then(() => {
    document.getElementById('copy-hint').textContent = 'Copied!'
    setTimeout(() => document.getElementById('copy-hint').textContent = 'Click to copy', 2000)
  })
}

function copyField(el) {
  navigator.clipboard.writeText(el.textContent).catch(() => {})
  const orig = el.style.borderColor
  el.style.borderColor = '#22c55e'
  setTimeout(() => el.style.borderColor = orig, 1500)
}

loadStatus()
</script>
</body>
</html>`
}
