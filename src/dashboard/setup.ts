export function getSetupHtml(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CX Agent — Setup</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
      background:#0a0c12;
      color:#e2e8f0;min-height:100vh;
      display:flex;align-items:center;justify-content:center;padding:24px;
      perspective:1200px;
    }

    /* layered background — dot grid + radial glow */
    body::before{
      content:'';position:fixed;inset:0;
      background-image:radial-gradient(circle at 1px 1px,rgba(99,102,241,.05) 1px,transparent 0);
      background-size:28px 28px;pointer-events:none;z-index:0;
    }
    body::after{
      content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
      background:radial-gradient(ellipse 70% 60% at 50% 40%,rgba(99,102,241,.08) 0%,transparent 70%);
    }

    .wizard{width:100%;max-width:560px;position:relative;z-index:1}
    .wizard-top{
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:20px;padding:0 2px;
    }
    .wizard-label{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#475569;}
    .btn-skip-all{
      padding:5px 12px;background:transparent;color:#374151;border:1px solid #252a35;
      border-radius:6px;font-size:11px;cursor:pointer;transition:all .15s;
    }
    .btn-skip-all:hover{color:#64748b;border-color:#374151}

    .progress{display:flex;align-items:center;justify-content:center;margin-bottom:28px;gap:0}
    .pdot{
      width:30px;height:30px;border-radius:50%;
      background:#161922;border:1px solid #252a35;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:600;color:#475569;z-index:1;flex-shrink:0;
      transition:all .3s cubic-bezier(.4,0,.2,1);
      box-shadow:0 2px 8px rgba(0,0,0,.5);
    }
    .pdot.active{
      background:#6366f1;border-color:#6366f1;color:#fff;
      box-shadow:0 0 0 3px rgba(99,102,241,.25),0 0 18px rgba(99,102,241,.4),0 2px 8px rgba(0,0,0,.5);
    }
    .pdot.done{background:#22c55e;border-color:#22c55e;color:#fff;box-shadow:0 0 12px rgba(34,197,94,.35),0 2px 8px rgba(0,0,0,.5)}
    .pline{width:48px;height:2px;background:#252a35;flex-shrink:0;transition:background .3s}
    .pline.done{background:#22c55e}

    /* ── Card with tilt + deep shadow ─────────────────────────────── */
    .card{
      background:linear-gradient(160deg,#1a1f2e 0%,#161922 60%);
      border:1px solid rgba(255,255,255,.075);
      border-radius:16px;
      padding:32px;
      /* layered shadow: contact shadow + floating shadow + glow */
      box-shadow:
        0 1px 2px rgba(0,0,0,.6),
        0 8px 32px rgba(0,0,0,.65),
        0 24px 64px rgba(0,0,0,.45),
        inset 0 1px 0 rgba(255,255,255,.07);
      transform-style:preserve-3d;
      transition:box-shadow .25s, transform .08s linear;
      will-change:transform;
      position:relative;
    }
    /* top-edge rim light */
    .card::before{
      content:'';position:absolute;inset:0;border-radius:16px;pointer-events:none;
      background:linear-gradient(180deg,rgba(255,255,255,.06) 0%,transparent 40%);
    }
    /* accent glow at bottom */
    .card::after{
      content:'';position:absolute;bottom:-24px;left:10%;right:10%;height:60px;
      background:radial-gradient(ellipse 80% 100% at 50% 0%,rgba(99,102,241,.18) 0%,transparent 70%);
      pointer-events:none;filter:blur(8px);
    }

    .step{display:none}
    .step.active{display:block}

    .step-icon{font-size:32px;margin-bottom:16px}
    .step-title{font-size:20px;font-weight:700;letter-spacing:-.3px;margin-bottom:6px}
    .step-sub{font-size:13px;color:#64748b;margin-bottom:28px;line-height:1.5}

    label{display:block;font-size:12px;font-weight:500;color:#94a3b8;margin-bottom:6px;margin-top:16px}
    label:first-of-type{margin-top:0}
    input,select{
      width:100%;padding:10px 12px;
      background:rgba(8,10,16,.7);
      border:1px solid #252a35;border-radius:8px;
      color:#e2e8f0;font-size:14px;outline:none;
      box-shadow:inset 0 2px 6px rgba(0,0,0,.4);
      transition:border-color .15s,box-shadow .15s;
    }
    input:focus,select:focus{
      border-color:#6366f1;
      box-shadow:inset 0 2px 6px rgba(0,0,0,.4),0 0 0 2px rgba(99,102,241,.2),0 0 14px rgba(99,102,241,.15);
    }
    input::placeholder{color:#2d3748}

    .key-wrap{position:relative}
    .key-wrap input{padding-right:90px}
    .key-status{
      position:absolute;right:10px;top:50%;transform:translateY(-50%);
      font-size:11px;font-weight:500;
    }
    .key-ok{color:#22c55e}
    .key-err{color:#ef4444}
    .key-checking{color:#64748b}

    .hint{font-size:11px;color:#475569;margin-top:6px;line-height:1.5}
    .hint a{color:#6366f1;text-decoration:none}
    .hint a:hover{text-decoration:underline}

    .optional-tag{
      display:inline-block;font-size:10px;font-weight:600;
      color:#475569;background:#1e2330;border-radius:4px;
      padding:1px 6px;margin-left:6px;vertical-align:middle;letter-spacing:.04em;
    }

    .actions{display:flex;justify-content:space-between;align-items:center;margin-top:28px}
    .btn-next{
      padding:10px 24px;
      background:linear-gradient(180deg,#7173f5 0%,#5c5fe8 100%);
      color:#fff;border:none;
      border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;
      box-shadow:0 1px 3px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.12);
      transition:opacity .15s,transform .12s,box-shadow .15s;
    }
    .btn-next:hover{
      opacity:.95;transform:translateY(-1px);
      box-shadow:0 4px 16px rgba(0,0,0,.4),0 0 18px rgba(99,102,241,.35),inset 0 1px 0 rgba(255,255,255,.12);
    }
    .btn-next:active{transform:translateY(0);box-shadow:0 1px 3px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.12)}
    .btn-next:disabled{opacity:.35;cursor:not-allowed;transform:none}
    .btn-back{
      padding:10px 16px;background:transparent;color:#64748b;border:none;
      font-size:13px;cursor:pointer;transition:color .15s;
    }
    .btn-back:hover{color:#e2e8f0}
    .btn-skip{
      padding:6px 12px;background:transparent;color:#475569;border:none;
      font-size:12px;cursor:pointer;transition:color .15s;
    }
    .btn-skip:hover{color:#94a3b8}

    .done-icon{font-size:48px;margin-bottom:20px;text-align:center}
    .done-title{font-size:22px;font-weight:700;text-align:center;margin-bottom:8px}
    .done-sub{font-size:14px;color:#64748b;text-align:center;margin-bottom:32px;line-height:1.6}
    .checklist{list-style:none;margin-bottom:28px}
    .checklist li{
      display:flex;align-items:center;gap:10px;
      font-size:13px;padding:7px 0;border-bottom:1px solid #1e2330;color:#94a3b8;
    }
    .checklist li:last-child{border-bottom:none}
    .checklist li .ck{color:#22c55e;font-weight:700;min-width:16px}
    .checklist li .ck.skip{color:#475569}
    .btn-launch{
      display:block;width:100%;padding:13px;
      background:linear-gradient(180deg,#7173f5 0%,#5c5fe8 100%);
      color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;
      cursor:pointer;text-align:center;
      box-shadow:0 2px 8px rgba(0,0,0,.4),0 0 24px rgba(99,102,241,.3),inset 0 1px 0 rgba(255,255,255,.12);
      transition:opacity .15s,transform .12s,box-shadow .15s;
    }
    .btn-launch:hover{
      opacity:.95;transform:translateY(-1px);
      box-shadow:0 6px 24px rgba(0,0,0,.4),0 0 32px rgba(99,102,241,.4),inset 0 1px 0 rgba(255,255,255,.12);
    }
    .btn-launch:active{transform:translateY(0)}

    .smtp-grid{display:grid;grid-template-columns:1fr 90px;gap:10px}
    .error-msg{font-size:12px;color:#ef4444;margin-top:8px;display:none}
  </style>
</head>
<body>
<div class="wizard">
  <div class="wizard-top">
    <span class="wizard-label">🎧 CX Agent — Setup</span>
    <button class="btn-skip-all" onclick="skipSetup()">Skip setup →</button>
  </div>

  <div class="progress">
    <div class="pdot active" id="dot1">1</div>
    <div class="pline" id="line1"></div>
    <div class="pdot" id="dot2">2</div>
    <div class="pline" id="line2"></div>
    <div class="pdot" id="dot3">3</div>
    <div class="pline" id="line3"></div>
    <div class="pdot" id="dot4">4</div>
  </div>

  <div class="card" id="main-card">

    <!-- Step 1: Business -->
    <div class="step active" id="step1">
      <div class="step-icon">🏢</div>
      <div class="step-title">Your business</div>
      <div class="step-sub">CX Agent personalises every interaction with your business name. Your email receives daily digests and escalation alerts.</div>
      <label>Business name</label>
      <input id="client-name" type="text" placeholder="Acme Ltd" autocomplete="organization">
      <label>Your email address</label>
      <input id="client-email" type="email" placeholder="you@company.com" autocomplete="email">
      <div class="error-msg" id="err1">Please fill in both fields.</div>
      <div class="actions">
        <span></span>
        <button class="btn-next" id="next1" onclick="goStep1()">Continue</button>
      </div>
    </div>

    <!-- Step 2: AI Key -->
    <div class="step" id="step2">
      <div class="step-icon">🤖</div>
      <div class="step-title">Anthropic API key</div>
      <div class="step-sub">CX Agent runs on Claude. Paste your API key below — it's stored locally and never leaves your machine.</div>
      <label>API key</label>
      <div class="key-wrap">
        <input id="api-key" type="password" placeholder="sk-ant-api03-...">
        <span class="key-status" id="key-status"></span>
      </div>
      <p class="hint">Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank">console.anthropic.com</a>. You need at least claude-sonnet-4-6 access.</p>
      <div class="error-msg" id="err2">Please enter a valid API key.</div>
      <div class="actions">
        <button class="btn-back" onclick="setStep(1)">Back</button>
        <button class="btn-next" id="next2" onclick="goStep2()">Validate &amp; Continue</button>
      </div>
    </div>

    <!-- Step 3: Email (optional) -->
    <div class="step" id="step3">
      <div class="step-icon">📧</div>
      <div class="step-title">Email notifications <span class="optional-tag">optional</span></div>
      <div class="step-sub">Configure SMTP to send daily digests, escalation alerts, and CSAT requests. You can skip this now and set it up later in Settings.</div>
      <label>SMTP host</label>
      <div class="smtp-grid">
        <input id="smtp-host" type="text" placeholder="smtp.gmail.com">
        <input id="smtp-port" type="number" placeholder="587" value="587">
      </div>
      <label>Email address</label>
      <input id="smtp-user" type="email" placeholder="you@gmail.com">
      <label>Password / App password</label>
      <input id="smtp-pass" type="password" placeholder="Gmail App Password or SMTP password">
      <p class="hint">For Gmail: generate an App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank">myaccount.google.com/apppasswords</a> (2FA must be enabled).</p>
      <div class="error-msg" id="err3">Fill in all email fields or skip this step.</div>
      <div class="actions">
        <button class="btn-back" onclick="setStep(2)">Back</button>
        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn-skip" onclick="skipEmail()">Skip for now</button>
          <button class="btn-next" id="next3" onclick="goStep3()">Save &amp; Continue</button>
        </div>
      </div>
    </div>

    <!-- Step 4: Done -->
    <div class="step" id="step4">
      <div class="done-icon">✅</div>
      <div class="done-title">You're all set</div>
      <div class="done-sub">CX Agent is configured and ready. Your AI support agent can now handle customer inquiries, refunds, and escalations automatically.</div>
      <ul class="checklist" id="done-checklist">
        <li><span class="ck">✓</span><span>Business configured</span></li>
        <li><span class="ck">✓</span><span>Anthropic API key saved</span></li>
        <li id="email-check"><span class="ck skip">–</span><span>Email notifications (skipped)</span></li>
      </ul>
      <button class="btn-launch" onclick="launch()">Open Dashboard →</button>
    </div>

  </div>
</div>

<script>
let emailSkipped = false

// ── Step navigation ────────────────────────────────────────────────
function setStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'))
  document.getElementById('step' + n).classList.add('active')
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById('dot' + i)
    dot.className = 'pdot' + (i < n ? ' done' : i === n ? ' active' : '')
    if (i < 4) document.getElementById('line' + i).className = 'pline' + (i < n ? ' done' : '')
  }
}

async function goStep1() {
  const name  = document.getElementById('client-name').value.trim()
  const email = document.getElementById('client-email').value.trim()
  const err   = document.getElementById('err1')
  if (!name || !email) { err.style.display = 'block'; return }
  err.style.display = 'none'
  await saveConfig('CLIENT_NAME', name)
  await saveConfig('CLIENT_EMAIL', email)
  setStep(2)
}

async function goStep2() {
  const key    = document.getElementById('api-key').value.trim()
  const err    = document.getElementById('err2')
  const status = document.getElementById('key-status')
  const btn    = document.getElementById('next2')
  if (!key) { err.style.display = 'block'; return }
  err.style.display = 'none'
  btn.disabled = true
  status.className = 'key-status key-checking'
  status.textContent = 'Validating...'
  try {
    const res  = await fetch('/api/setup/validate-key', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    const data = await res.json()
    if (data.valid) {
      status.className = 'key-status key-ok'
      status.textContent = '✓ Valid'
      await saveConfig('ANTHROPIC_API_KEY', key)
      setTimeout(() => setStep(3), 400)
    } else {
      status.className = 'key-status key-err'
      status.textContent = '✗ Invalid'
      err.textContent = data.error || 'Invalid API key.'
      err.style.display = 'block'
    }
  } catch {
    status.className = 'key-status key-err'
    status.textContent = '✗ Error'
    err.textContent = 'Could not validate — check your connection.'
    err.style.display = 'block'
  }
  btn.disabled = false
}

function skipEmail() {
  emailSkipped = true
  const li = document.getElementById('email-check')
  li.querySelector('.ck').textContent = '–'
  li.querySelector('span:last-child').textContent = 'Email notifications (skipped — configure in Settings)'
  setStep(4)
}

async function goStep3() {
  const host = document.getElementById('smtp-host').value.trim()
  const port = document.getElementById('smtp-port').value.trim()
  const user = document.getElementById('smtp-user').value.trim()
  const pass = document.getElementById('smtp-pass').value.trim()
  const err  = document.getElementById('err3')
  if (!host || !port || !user || !pass) { err.style.display = 'block'; return }
  err.style.display = 'none'
  await saveConfig('SMTP_HOST', host)
  await saveConfig('SMTP_PORT', port)
  await saveConfig('SMTP_USER', user)
  await saveConfig('SMTP_PASS', pass)
  const li = document.getElementById('email-check')
  li.querySelector('.ck').textContent = '✓'
  li.querySelector('.ck').className = 'ck'
  li.querySelector('span:last-child').textContent = 'Email notifications configured'
  setStep(4)
}

async function skipSetup() {
  await fetch('/api/setup/skip', { method: 'POST' }).catch(() => {})
  window.location.href = '/'
}

async function saveConfig(key, value) {
  await fetch('/api/setup/config', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  }).catch(() => {})
}

function launch() { window.location.href = '/' }

// ── 3D card tilt ───────────────────────────────────────────────────
const card = document.getElementById('main-card')
const MAX_TILT = 5  // degrees

document.addEventListener('mousemove', e => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const dx = (e.clientX - cx) / cx  // -1 → 1
  const dy = (e.clientY - cy) / cy  // -1 → 1
  const rx = -dy * MAX_TILT
  const ry =  dx * MAX_TILT
  card.style.transform = \`perspective(900px) rotateX(\${rx}deg) rotateY(\${ry}deg) translateZ(4px)\`
  // shift box-shadow to match light angle
  const sx = ry * 2
  const sy = -rx * 2
  card.style.boxShadow = \`
    \${sx}px \${sy + 1}px 2px rgba(0,0,0,.6),
    \${sx * 2}px \${sy * 2 + 8}px 32px rgba(0,0,0,.65),
    \${sx * 3}px \${sy * 3 + 24}px 64px rgba(0,0,0,.4),
    inset 0 1px 0 rgba(255,255,255,.07)
  \`
})

document.addEventListener('mouseleave', () => {
  card.style.transform = ''
  card.style.boxShadow = ''
})

// Pre-fill existing config
;(async () => {
  try {
    const res = await fetch('/api/setup/status')
    const d = await res.json()
    if (d.client_name)  document.getElementById('client-name').value = d.client_name
    if (d.client_email) document.getElementById('client-email').value = d.client_email
    if (d.smtp_user)    document.getElementById('smtp-user').value = d.smtp_user
  } catch {}
})()
</script>
</body>
</html>`
}
