export function dashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CX Agent — Dafdevs</title>
<style>
  :root {
    --bg: #0d0f14; --surface: #161922; --surface-2: #1b2030; --border: #252a35;
    --text: #e2e8f0; --muted: #64748b; --accent: #6366f1;
    --green: #22c55e; --amber: #f59e0b; --red: #ef4444; --blue: #3b82f6;
    --hi: inset 0 1px 0 rgba(255,255,255,0.055);
    --sh-sm: 0 1px 3px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3);
    --sh-md: 0 4px 14px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3);
    --sh-lg: 0 20px 50px rgba(0,0,0,0.65), 0 6px 20px rgba(0,0,0,0.45);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg); color: var(--text);
    font-family: 'Inter', system-ui, sans-serif; font-size: 14px;
    background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.018) 1px, transparent 0);
    background-size: 24px 24px;
  }
  header {
    background: linear-gradient(180deg, rgba(255,255,255,0.022) 0%, var(--surface) 100%);
    border-bottom: 1px solid var(--border); padding: 12px 24px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: var(--sh-sm); position: relative; z-index: 10;
  }
  header h1 { font-size: 15px; font-weight: 600; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); display: inline-block; margin-right: 7px; box-shadow: 0 0 7px rgba(34,197,94,0.65), 0 0 2px rgba(34,197,94,0.9); }
  .client-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1px; background: var(--border); }
  .mc {
    background: linear-gradient(180deg, rgba(255,255,255,0.028) 0%, var(--surface) 55%);
    padding: 18px 20px; box-shadow: var(--hi); position: relative; overflow: hidden;
  }
  .mc::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.18) 50%, transparent 100%);
  }
  .mc .label { font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); margin-bottom: 8px; }
  .mc .value { font-size: 26px; font-weight: 700; line-height: 1; }
  .mc .sub { font-size: 11px; color: var(--muted); margin-top: 5px; }
  .green { color: var(--green); } .amber { color: var(--amber); } .red { color: var(--red); }
  .layout { display: grid; grid-template-columns: 1fr 320px; gap: 1px; background: var(--border); height: calc(100vh - 124px); overflow: hidden; }
  .main-col { overflow-y: auto; display: flex; flex-direction: column; gap: 1px; background: var(--border); }
  .sidebar { overflow-y: auto; display: flex; flex-direction: column; gap: 1px; background: rgba(8,10,16,0.5); }
  .panel { background: var(--surface); padding: 18px 20px; box-shadow: var(--hi); }
  .sidebar .panel { background: linear-gradient(180deg, rgba(255,255,255,0.016) 0%, #13161e 100%); }
  .panel h2 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .badge { padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 700; }
  .b-open { background: rgba(99,102,241,.2); color: var(--accent); box-shadow: 0 0 9px rgba(99,102,241,0.2), inset 0 1px 0 rgba(99,102,241,0.25); }
  .b-esc { background: rgba(239,68,68,.2); color: var(--red); box-shadow: 0 0 9px rgba(239,68,68,0.2), inset 0 1px 0 rgba(239,68,68,0.25); }
  .b-res { background: rgba(34,197,94,.15); color: var(--green); box-shadow: 0 0 9px rgba(34,197,94,0.18), inset 0 1px 0 rgba(34,197,94,0.2); }
  .b-vip { background: rgba(245,158,11,.15); color: var(--amber); box-shadow: 0 0 8px rgba(245,158,11,0.15); }
  .b-ent { background: rgba(99,102,241,.15); color: var(--accent); box-shadow: 0 0 8px rgba(99,102,241,0.15); }
  .row { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border); transition: background .13s; }
  .row:last-child { border-bottom: none; }
  .row:hover { background: rgba(255,255,255,0.026); margin: 0 -8px; padding-left: 8px; padding-right: 8px; border-radius: 6px; }
  .row-info { flex: 1; min-width: 0; }
  .row-info .title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }
  .row-info .meta { font-size: 11px; color: var(--muted); margin-top: 3px; }
  .btn { padding: 5px 12px; border-radius: 6px; border: none; cursor: pointer; font-size: 11px; font-weight: 500; transition: all .15s; }
  .btn-p {
    background: linear-gradient(180deg, #7173f5 0%, #5c5fe8 100%);
    color: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12);
  }
  .btn-p:hover {
    background: linear-gradient(180deg, #8082f6 0%, #6b6ef0 100%);
    box-shadow: 0 3px 10px rgba(0,0,0,0.35), 0 0 14px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.12);
    transform: translateY(-1px);
  }
  .btn-g {
    background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: var(--muted);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .btn-g:hover {
    background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.14); color: var(--text);
    box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06);
    transform: translateY(-1px);
  }
  .btn-r {
    background: rgba(239,68,68,.12); color: var(--red);
    box-shadow: inset 0 1px 0 rgba(239,68,68,0.1);
  }
  .btn-r:hover {
    background: rgba(239,68,68,.22);
    box-shadow: 0 0 12px rgba(239,68,68,0.18), inset 0 1px 0 rgba(239,68,68,0.15);
    transform: translateY(-1px);
  }
  .event-row { font-size: 11px; padding: 5px 0; border-bottom: 1px solid var(--border); display: flex; gap: 8px; }
  .event-row:last-child { border-bottom: none; }
  .e-time { color: var(--muted); white-space: nowrap; }
  .e-type { color: var(--accent); font-weight: 500; min-width: 100px; }
  .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty { color: var(--muted); font-size: 12px; padding: 16px 0; text-align: center; }
  .kb-row { display: grid; grid-template-columns: 90px 1fr 80px; gap: 10px; align-items: start; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 12px; transition: background .13s; }
  .kb-row:last-child { border-bottom: none; }
  .kb-row:hover { background: rgba(255,255,255,0.026); margin: 0 -8px; padding: 9px 8px; border-radius: 5px; }
  .kb-cat { color: var(--accent); font-weight: 500; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; padding-top: 2px; }
  .kb-title { font-weight: 500; margin-bottom: 2px; font-size: 13px; }
  .kb-preview { color: var(--muted); font-size: 11px; line-height: 1.4; }
  .kb-actions { display: flex; gap: 5px; justify-content: flex-end; }
  .b-inactive { background: rgba(100,116,139,.15); color: #64748b; }
  .b-amber { background: rgba(245,158,11,.2); color: var(--amber); box-shadow: 0 0 8px rgba(245,158,11,0.14); }
  .approval-row { padding: 12px 0; border-bottom: 1px solid var(--border); }
  .approval-row:last-child { border-bottom: none; }
  .approval-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .approval-draft {
    background: rgba(8,10,16,0.75); border-left: 3px solid var(--accent); padding: 8px 10px;
    border-radius: 0 6px 6px 0; font-size: 12px; line-height: 1.5; color: #94a3b8; margin-bottom: 8px;
    white-space: pre-wrap; box-shadow: inset 0 1px 0 rgba(99,102,241,0.1), var(--sh-sm);
  }
  .approval-actions { display: flex; gap: 6px; }
  .edit-reply {
    width: 100%; padding: 6px 8px; background: rgba(8,10,16,0.6); border: 1px solid var(--border);
    border-radius: 5px; color: var(--text); font-size: 12px; resize: vertical; min-height: 56px;
    outline: none; font-family: inherit; margin-bottom: 6px; display: none;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.3); transition: border-color .15s, box-shadow .15s;
  }
  .edit-reply:focus { border-color: var(--accent); box-shadow: inset 0 2px 6px rgba(0,0,0,0.3), 0 0 0 2px rgba(99,102,241,0.18); }
  .kb-modal-form label { display: block; font-size: 11px; font-weight: 500; color: var(--muted); margin-bottom: 4px; margin-top: 12px; }
  .kb-modal-form label:first-child { margin-top: 0; }
  .kb-modal-form input, .kb-modal-form select, .kb-modal-form textarea {
    width: 100%; padding: 8px 10px; background: rgba(8,10,16,0.55); border: 1px solid var(--border);
    border-radius: 6px; color: var(--text); font-size: 13px; outline: none; font-family: inherit;
    box-shadow: inset 0 2px 5px rgba(0,0,0,0.28); transition: border-color .15s, box-shadow .15s;
  }
  .kb-modal-form input:focus, .kb-modal-form select:focus, .kb-modal-form textarea:focus { border-color: var(--accent); box-shadow: inset 0 2px 5px rgba(0,0,0,0.28), 0 0 0 2px rgba(99,102,241,0.18); }
  .kb-modal-form textarea { resize: vertical; min-height: 90px; line-height: 1.5; }
  .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.78); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
  .modal.open { display: flex; }
  .modal-box {
    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, var(--surface) 48px);
    border: 1px solid rgba(255,255,255,0.09); border-radius: 14px; padding: 24px;
    width: 580px; max-height: 80vh; overflow-y: auto;
    box-shadow: var(--sh-lg), inset 0 1px 0 rgba(255,255,255,0.07);
  }
  .modal-box h3 { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
  .msg { padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; line-height: 1.5; }
  .msg-user { background: rgba(99,102,241,.1); border-left: 3px solid var(--accent); box-shadow: inset 0 1px 0 rgba(99,102,241,0.12); }
  .msg-assistant { background: rgba(8,10,16,0.7); border-left: 3px solid var(--green); box-shadow: inset 0 1px 0 rgba(34,197,94,0.08); }
  .action-row {
    font-size: 11px; padding: 5px 10px; background: rgba(8,10,16,0.55);
    border: 1px solid rgba(255,255,255,0.04); border-radius: 4px; margin-bottom: 4px; display: flex; gap: 8px;
  }
  .action-ok { color: var(--green); }
  .action-fail { color: var(--red); }
  .tabs {
    display: flex; gap: 2px; background: rgba(8,10,16,0.6); padding: 3px; border-radius: 7px;
    margin-bottom: 14px; border: 1px solid var(--border); box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
  }
  .tab { padding: 5px 12px; border-radius: 5px; cursor: pointer; font-size: 11px; font-weight: 500; color: var(--muted); transition: all .15s; }
  .tab.active { background: var(--surface); color: var(--text); box-shadow: var(--sh-sm), var(--hi); }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .stat-box {
    background: linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(8,10,16,0.8) 100%);
    border-radius: 8px; padding: 10px 12px;
    border: 1px solid rgba(99,102,241,0.12);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), var(--sh-sm);
  }
  .stat-box .sv { font-size: 18px; font-weight: 700; }
  .stat-box .sl { font-size: 10px; color: var(--muted); margin-top: 2px; text-transform: uppercase; letter-spacing: .05em; }
  footer {
    background: linear-gradient(180deg, var(--surface) 0%, rgba(10,12,18,0.97) 100%);
    border-top: 1px solid var(--border); padding: 8px 20px; font-size: 11px; color: var(--muted);
    display: flex; justify-content: space-between;
    box-shadow: 0 -4px 14px rgba(0,0,0,0.25);
  }
  .cust-row { display: grid; grid-template-columns: 1fr 160px 80px 70px 80px; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12px; transition: background .13s; }
  .cust-row:last-child { border-bottom: none; }
  .cust-row:hover { background: rgba(255,255,255,0.026); margin: 0 -8px; padding: 8px 8px; border-radius: 5px; }
  .cust-row .cn { font-weight: 500; font-size: 13px; }
  .cust-row .ce { color: var(--muted); }
  .cust-actions { display: flex; gap: 5px; }
  .auth-row { display: grid; grid-template-columns: 180px 70px 1fr 60px; gap: 10px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 12px; transition: background .13s; }
  .auth-row:last-child { border-bottom: none; }
  .auth-row:hover { background: rgba(255,255,255,0.022); margin: 0 -8px; padding: 7px 8px; border-radius: 5px; }
  .auth-tier { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; display: inline-block; }
  .t-auto { background: rgba(34,197,94,.12); color: var(--green); box-shadow: 0 0 8px rgba(34,197,94,0.14), inset 0 1px 0 rgba(34,197,94,0.18); }
  .t-confirm { background: rgba(245,158,11,.12); color: var(--amber); box-shadow: 0 0 8px rgba(245,158,11,0.14), inset 0 1px 0 rgba(245,158,11,0.18); }
  .t-escalate { background: rgba(239,68,68,.12); color: var(--red); box-shadow: 0 0 8px rgba(239,68,68,0.14), inset 0 1px 0 rgba(239,68,68,0.18); }
  .test-messages {
    height: 240px; overflow-y: auto; padding: 10px;
    background: rgba(8,10,16,0.75); border-radius: 8px; margin-bottom: 10px;
    display: flex; flex-direction: column; gap: 8px;
    border: 1px solid var(--border); box-shadow: inset 0 2px 10px rgba(0,0,0,0.35);
  }
  .test-msg { padding: 8px 12px; border-radius: 8px; font-size: 12px; line-height: 1.5; max-width: 85%; }
  .test-msg-user {
    align-self: flex-end;
    background: linear-gradient(135deg, #7173f5 0%, #5c5fe8 100%);
    color: #fff; box-shadow: 0 2px 10px rgba(99,102,241,0.35);
  }
  .test-msg-agent {
    align-self: flex-start; background: var(--surface); border: 1px solid var(--border);
    box-shadow: var(--hi), var(--sh-sm);
  }
  .test-input-row { display: flex; gap: 8px; }
  .test-input-row input {
    flex: 1; padding: 8px 10px; background: rgba(8,10,16,0.55); border: 1px solid var(--border);
    border-radius: 6px; color: var(--text); font-size: 12px; outline: none;
    box-shadow: inset 0 2px 5px rgba(0,0,0,0.28); transition: border-color .15s, box-shadow .15s;
  }
  .test-input-row input:focus { border-color: var(--accent); box-shadow: inset 0 2px 5px rgba(0,0,0,0.28), 0 0 0 2px rgba(99,102,241,0.18); }
  .inbox-row { display: grid; grid-template-columns: 60px 1fr 80px 90px; gap: 10px; align-items: start; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 12px; cursor: pointer; transition: all .14s; }
  .inbox-row:last-child { border-bottom: none; }
  .inbox-row:hover { background: rgba(255,255,255,0.032); margin: 0 -8px; padding: 9px 8px; border-radius: 5px; box-shadow: 0 1px 5px rgba(0,0,0,0.2); }
  .ch-icon { font-size: 18px; text-align: center; padding-top: 2px; }
  .ch-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 1px 5px; border-radius: 3px; display: inline-block; margin-top: 2px; }
  .ch-email { background: rgba(59,130,246,.15); color: var(--blue); box-shadow: 0 0 5px rgba(59,130,246,0.12); }
  .ch-sms { background: rgba(34,197,94,.15); color: var(--green); box-shadow: 0 0 5px rgba(34,197,94,0.12); }
  .ch-facebook { background: rgba(99,102,241,.15); color: var(--accent); box-shadow: 0 0 5px rgba(99,102,241,0.12); }
  .ch-instagram { background: rgba(245,158,11,.15); color: var(--amber); box-shadow: 0 0 5px rgba(245,158,11,0.12); }
  .ch-twitter { background: rgba(100,116,139,.15); color: var(--muted); }
  .ch-web { background: rgba(99,102,241,.1); color: var(--accent); box-shadow: 0 0 5px rgba(99,102,241,0.1); }
  .inbox-sender { font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .inbox-subj { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .inbox-preview { font-size: 11px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .inbox-filter { display: flex; gap: 4px; margin-left: auto; }
  .ch-status-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
  .ch-status-row:last-child { border-bottom: none; }
  .ch-name { font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .ch-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .ch-on { background: var(--green); box-shadow: 0 0 7px rgba(34,197,94,0.7), 0 0 2px rgba(34,197,94,0.9); }
  .ch-off { background: #2d3748; }
  .auth-edit-form label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; margin-top: 10px; }
  .auth-edit-form label:first-child { margin-top: 0; }
  .auth-edit-form select, .auth-edit-form input {
    width: 100%; padding: 7px 9px; background: rgba(8,10,16,0.55); border: 1px solid var(--border);
    border-radius: 6px; color: var(--text); font-size: 12px; outline: none;
    box-shadow: inset 0 2px 5px rgba(0,0,0,0.28); transition: border-color .15s, box-shadow .15s;
  }
  .auth-edit-form select:focus, .auth-edit-form input:focus { border-color: var(--accent); box-shadow: inset 0 2px 5px rgba(0,0,0,0.28), 0 0 0 2px rgba(99,102,241,0.18); }
  .cust-modal-form label { display: block; font-size: 11px; font-weight: 500; color: var(--muted); margin-bottom: 4px; margin-top: 12px; }
  .cust-modal-form label:first-child { margin-top: 0; }
  .cust-modal-form input, .cust-modal-form select {
    width: 100%; padding: 8px 10px; background: rgba(8,10,16,0.55); border: 1px solid var(--border);
    border-radius: 6px; color: var(--text); font-size: 13px; outline: none;
    box-shadow: inset 0 2px 5px rgba(0,0,0,0.28); transition: border-color .15s, box-shadow .15s;
  }
  .cust-modal-form input:focus, .cust-modal-form select:focus { border-color: var(--accent); box-shadow: inset 0 2px 5px rgba(0,0,0,0.28), 0 0 0 2px rgba(99,102,241,0.18); }
</style>
</head>
<body>
<header>
  <div>
    <h1><span class="dot"></span>CX Agent</h1>
    <div class="client-sub" id="client-name">Customer Experience</div>
  </div>
  <div style="display:flex;gap:8px;align-items:center">
    <span id="last-refresh" style="font-size:11px;color:var(--muted)"></span>
    <button class="btn btn-g" onclick="refresh()">Refresh</button>
    <a id="chat-page-link" href="http://localhost:4748/chat" target="_blank" class="btn btn-p" style="text-decoration:none;padding:5px 12px;font-size:11px">💬 Chat</a>
    <a href="/settings" class="btn btn-g" style="text-decoration:none;padding:5px 10px;font-size:11px">⚙ Settings</a>
  </div>
</header>

<div class="metrics">
  <div class="mc"><div class="label">Resolution Rate</div><div class="value green" id="m-res">—</div><div class="sub">last 30 days</div></div>
  <div class="mc"><div class="label">FCR Rate</div><div class="value" id="m-fcr">—</div><div class="sub">first contact</div></div>
  <div class="mc"><div class="label">CSAT</div><div class="value" id="m-csat">—</div><div class="sub" id="m-csat-count">/ 5.0</div></div>
  <div class="mc"><div class="label">Escalation Rate</div><div class="value" id="m-esc">—</div><div class="sub" id="m-esc-total">open escalations</div></div>
  <div class="mc"><div class="label">Conversations</div><div class="value" id="m-vol">—</div><div class="sub" id="m-vol-sub">this week</div></div>
  <div class="mc"><div class="label">Avg Turns</div><div class="value" id="m-turns">—</div><div class="sub">to resolve</div></div>
</div>

<div class="layout">
  <div class="main-col">

    <!-- Unified Inbox -->
    <div class="panel">
      <h2 style="display:flex;justify-content:space-between;align-items:center">
        <span>Unified Inbox <span class="badge b-open" id="inbox-count">0</span></span>
        <div class="inbox-filter">
          <button class="btn btn-g" id="if-all" onclick="setInboxFilter('')" style="font-size:10px;padding:3px 8px">All</button>
          <button class="btn btn-g" id="if-email" onclick="setInboxFilter('email')" style="font-size:10px;padding:3px 8px">Email</button>
          <button class="btn btn-g" id="if-sms" onclick="setInboxFilter('sms')" style="font-size:10px;padding:3px 8px">SMS</button>
          <button class="btn btn-g" id="if-facebook" onclick="setInboxFilter('facebook')" style="font-size:10px;padding:3px 8px">FB/IG</button>
        </div>
      </h2>
      <div id="inbox-list"><div class="empty">No inbound messages yet</div></div>
    </div>

    <!-- Pending Approvals -->
    <div class="panel" id="approval-panel" style="display:none">
      <h2>Pending Approvals <span class="badge b-amber" id="approval-count">0</span></h2>
      <div id="approval-list"></div>
    </div>

    <!-- Escalation Queue -->
    <div class="panel">
      <h2>Escalation Queue <span class="badge b-esc" id="esc-count">0</span></h2>
      <div id="esc-list"><div class="empty">No open escalations</div></div>
    </div>

    <!-- Active Conversations -->
    <div class="panel">
      <h2>Active Conversations <span class="badge b-open" id="active-count">0</span></h2>
      <div id="active-list"><div class="empty">No active conversations</div></div>
    </div>

    <!-- Recent Conversations -->
    <div class="panel">
      <h2>Recent Conversations</h2>
      <div id="recent-list"><div class="empty">No conversations yet</div></div>
    </div>

    <!-- Knowledge Base -->
    <div class="panel">
      <h2 style="display:flex;justify-content:space-between;align-items:center">
        <span>Knowledge Base <span class="badge b-open" id="kb-count">0</span></span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-g" onclick="toggleKbImport()" id="kb-import-toggle">Import</button>
          <button class="btn btn-p" onclick="openKbModal()">+ Add Entry</button>
        </div>
      </h2>
      <div id="kb-import-panel" style="display:none;margin-bottom:12px;padding:12px;background:var(--bg);border-radius:6px;border:1px solid var(--border)">
        <p style="font-size:11px;color:var(--muted);margin-bottom:8px">Paste text below. Separate entries with <code style="background:var(--surface);padding:1px 4px;border-radius:3px">---</code> on its own line. First line of each block = title. Add <code style="background:var(--surface);padding:1px 4px;border-radius:3px">category: billing</code> as second line to set category.</p>
        <select id="kb-import-category" style="width:100%;margin-bottom:6px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:5px 8px;font-size:12px">
          <option value="general">general</option>
          <option value="billing">billing</option>
          <option value="returns">returns</option>
          <option value="delivery">delivery</option>
          <option value="technical">technical</option>
          <option value="account">account</option>
          <option value="policy">policy</option>
        </select>
        <textarea id="kb-import-text" rows="6" placeholder="Return Policy\ncategory: returns\nAll items can be returned within 30 days of purchase for a full refund.\n---\nDelivery Times\ncategory: delivery\nStandard delivery takes 3-5 business days. Express delivery is 1-2 days." style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:8px;font-size:12px;font-family:monospace;resize:vertical;box-sizing:border-box"></textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
          <button class="btn btn-g" onclick="toggleKbImport()">Cancel</button>
          <button class="btn btn-p" onclick="submitKbImport()">Import Entries</button>
        </div>
        <div id="kb-import-result" style="font-size:11px;margin-top:6px"></div>
      </div>
      <div id="kb-list"><div class="empty">No entries yet</div></div>
    </div>

    <!-- Customers -->
    <div class="panel">
      <h2 style="display:flex;justify-content:space-between;align-items:center">
        <span>Customers <span class="badge b-open" id="cust-count">0</span></span>
        <button class="btn btn-p" onclick="openCustModal()">+ Add Customer</button>
      </h2>
      <div id="cust-list"><div class="empty">No customers yet</div></div>
    </div>

    <!-- Test Agent -->
    <div class="panel">
      <h2 style="display:flex;justify-content:space-between;align-items:center">
        <span>Test Agent</span>
        <select id="test-customer" style="font-size:11px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);outline:none">
          <option value="">Select customer…</option>
        </select>
      </h2>
      <div class="test-messages" id="test-messages"><div class="empty" style="margin:auto">Select a customer above to start testing</div></div>
      <div class="test-input-row">
        <input type="text" id="test-input" placeholder="Type a message as the customer…" onkeydown="if(event.key==='Enter')sendTestMessage()" disabled>
        <button class="btn btn-p" id="test-send" onclick="sendTestMessage()" disabled style="white-space:nowrap">Send</button>
      </div>
      <div style="margin-top:8px" id="test-actions"></div>
    </div>

  </div>

  <div class="sidebar">

    <!-- Channel Status -->
    <div class="panel">
      <h2>Channels <a href="/settings" style="font-size:10px;color:var(--accent);text-decoration:none;margin-left:auto">Configure →</a></h2>
      <div id="channel-status"><div class="empty">Loading…</div></div>
    </div>

    <!-- Action Stats -->
    <div class="panel">
      <h2>Action Stats (30d)</h2>
      <div class="stats-grid" id="action-stats">
        <div class="stat-box"><div class="sv" id="as-total">—</div><div class="sl">Total Actions</div></div>
        <div class="stat-box"><div class="sv green" id="as-verified">—</div><div class="sl">Verified %</div></div>
      </div>
      <div style="margin-top:10px" id="top-actions"></div>
    </div>

    <!-- Escalation Triggers -->
    <div class="panel">
      <h2>Escalation Triggers</h2>
      <div id="esc-triggers"><div class="empty">No data</div></div>
    </div>

    <!-- CSAT Distribution -->
    <div class="panel">
      <h2>CSAT Distribution</h2>
      <div id="csat-dist"><div class="empty">No CSAT yet</div></div>
    </div>

    <!-- Learning Queue -->
    <div class="panel" id="learning-panel">
      <h2>Learning Queue <span class="badge b-amber" id="learning-count">0</span></h2>
      <div id="learning-list"><div class="empty">No items pending review</div></div>
    </div>

    <!-- Integrations -->
    <div class="panel">
      <h2 style="display:flex;justify-content:space-between;align-items:center">
        <span>Integrations</span>
        <button class="btn btn-p" onclick="openIntegrationModal()">+ Add</button>
      </h2>
      <div id="integration-list"><div class="empty">No integrations configured</div></div>
    </div>

    <!-- Authority Config -->
    <div class="panel">
      <h2>Authority Config</h2>
      <div id="authority-list"><div class="empty">Loading…</div></div>
    </div>

    <!-- Live Events -->
    <div class="panel">
      <h2>Live Events</h2>
      <div id="events-list"><div class="empty">No events</div></div>
    </div>

  </div>
</div>

<footer>
  <span>CX Agent by Dafdevs</span>
  <span id="footer-time"></span>
</footer>

<!-- Customer Create/Edit Modal -->
<div class="modal" id="cust-modal">
  <div class="modal-box">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 id="cust-modal-title">Add Customer</h3>
      <button class="btn btn-g" onclick="closeCustModal()">✕ Close</button>
    </div>
    <div class="cust-modal-form">
      <input type="hidden" id="cust-edit-id">
      <label>Full name</label>
      <input type="text" id="cust-name" placeholder="Jane Smith">
      <label>Email address</label>
      <input type="email" id="cust-email" placeholder="jane@example.com">
      <label>Phone <span style="color:var(--muted);font-weight:400">(optional)</span></label>
      <input type="text" id="cust-phone" placeholder="+44 7700 900000">
      <label>Tier</label>
      <select id="cust-tier">
        <option value="standard">Standard</option>
        <option value="vip">VIP</option>
        <option value="enterprise">Enterprise</option>
      </select>
      <div id="cust-status-row" style="display:none;margin-top:12px">
        <label>Status</label>
        <select id="cust-status">
          <option value="active">Active</option>
          <option value="locked">Locked</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
      <button class="btn btn-g" onclick="closeCustModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveCust()">Save</button>
    </div>
  </div>
</div>

<!-- Integration Modal -->
<div class="modal" id="integration-modal">
  <div class="modal-box" style="max-width:460px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 id="int-modal-title">Add Integration</h3>
      <button class="btn btn-g" onclick="closeIntegrationModal()">✕ Close</button>
    </div>
    <div class="kb-modal-form">
      <input type="hidden" id="int-edit-id">
      <label>Name <span style="color:var(--muted);font-weight:400">(used by agent, e.g. "shopify_orders")</span></label>
      <input type="text" id="int-name" placeholder="shopify_orders">
      <label>Description</label>
      <input type="text" id="int-desc" placeholder="Look up a customer order by ID">
      <label>URL <span style="color:var(--muted);font-weight:400">(use {param} for path variables)</span></label>
      <input type="text" id="int-url" placeholder="https://api.example.com/orders/{order_id}">
      <label>Method</label>
      <select id="int-method"><option value="GET">GET</option><option value="POST">POST</option></select>
      <label>Auth type</label>
      <select id="int-auth-type" onchange="toggleAuthFields()">
        <option value="none">None</option>
        <option value="bearer">Bearer token</option>
        <option value="api_key">API key header</option>
        <option value="basic">Basic auth (user:password)</option>
      </select>
      <div id="int-auth-value-row" style="display:none">
        <label id="int-auth-label">Token / credentials</label>
        <input type="password" id="int-auth-value">
      </div>
      <div id="int-auth-header-row" style="display:none">
        <label>Header name</label>
        <input type="text" id="int-auth-header" placeholder="X-API-Key">
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
      <button class="btn btn-g" onclick="closeIntegrationModal()">Cancel</button>
      <button class="btn btn-g" onclick="testIntegration()">Test</button>
      <button class="btn btn-p" onclick="saveIntegration()">Save</button>
    </div>
    <div id="int-test-result" style="font-size:12px;margin-top:8px;text-align:right"></div>
  </div>
</div>

<!-- Authority Edit Modal -->
<div class="modal" id="auth-modal">
  <div class="modal-box" style="max-width:420px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 id="auth-modal-title">Edit Authority</h3>
      <button class="btn btn-g" onclick="closeAuthModal()">✕ Close</button>
    </div>
    <div class="auth-edit-form">
      <input type="hidden" id="auth-action-name">
      <label>Authority tier</label>
      <select id="auth-tier">
        <option value="auto">auto — execute immediately</option>
        <option value="confirm">confirm — ask customer first</option>
        <option value="escalate">escalate — human only</option>
      </select>
      <label>Description</label>
      <input type="text" id="auth-desc" placeholder="What this action does">
      <div id="auth-threshold-section" style="margin-top:10px">
        <label>Threshold JSON <span style="color:var(--muted);font-weight:400">(optional)</span></label>
        <input type="text" id="auth-threshold" placeholder='{"max_gbp": 25}'>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">e.g. {"auto_under_gbp":50,"confirm_under_gbp":500}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
      <button class="btn btn-g" onclick="closeAuthModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveAuth()">Save</button>
    </div>
  </div>
</div>

<!-- KB Create/Edit Modal -->
<div class="modal" id="kb-modal">
  <div class="modal-box">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 id="kb-modal-title">Add Knowledge Base Entry</h3>
      <button class="btn btn-g" onclick="closeKbModal()">✕ Close</button>
    </div>
    <div class="kb-modal-form">
      <input type="hidden" id="kb-edit-id">
      <label>Category</label>
      <select id="kb-category">
        <option value="billing">billing</option>
        <option value="returns">returns</option>
        <option value="delivery">delivery</option>
        <option value="account">account</option>
        <option value="technical">technical</option>
        <option value="general">general</option>
      </select>
      <label>Title</label>
      <input type="text" id="kb-title" placeholder="e.g. Returns policy">
      <label>Content</label>
      <textarea id="kb-content" placeholder="Enter the full policy text or guidance..."></textarea>
      <label>Source <span style="color:var(--muted);font-weight:400">(optional)</span></label>
      <input type="text" id="kb-source" placeholder="e.g. policy_doc, pricing_page">
      <div id="kb-active-row" style="display:flex;align-items:center;gap:8px;margin-top:12px">
        <input type="checkbox" id="kb-active" checked style="width:auto;accent-color:var(--accent)">
        <label for="kb-active" style="margin:0;color:var(--text);font-size:12px">Active (visible to agent)</label>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
      <button class="btn btn-g" onclick="closeKbModal()">Cancel</button>
      <button class="btn btn-p" id="kb-save-btn" onclick="saveKbEntry()">Save Entry</button>
    </div>
  </div>
</div>

<!-- Conversation Detail Modal -->
<div class="modal" id="conv-modal">
  <div class="modal-box">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 id="modal-title">Conversation</h3>
      <button class="btn btn-g" onclick="closeModal()">✕ Close</button>
    </div>
    <div class="tabs">
      <div class="tab active" onclick="showTab('messages')">Messages</div>
      <div class="tab" onclick="showTab('actions')">Actions</div>
    </div>
    <div id="tab-messages"></div>
    <div id="tab-actions" style="display:none"></div>
    <div style="margin-top:16px;display:flex;gap:8px" id="modal-actions"></div>
  </div>
</div>

<script>
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function fmt(iso) { if (!iso) return '—'; try { return new Date(iso).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'}) } catch { return iso } }
function fmtTime(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) } catch { return '' } }

function tierBadge(tier) {
  if (!tier) return ''
  const cls = tier==='enterprise' ? 'b-ent' : tier==='vip' ? 'b-vip' : ''
  return cls ? \`<span class="badge \${cls}">\${tier}</span>\` : \`<span style="color:var(--muted);font-size:11px">\${tier}</span>\`
}

// ── Approval queue ────────────────────────────────────────────────────────────

function renderApprovals(items) {
  const panel = document.getElementById('approval-panel')
  const el    = document.getElementById('approval-list')
  document.getElementById('approval-count').textContent = items.length
  panel.style.display = items.length ? '' : 'none'
  if (!items.length) return

  el.innerHTML = items.map(m => {
    const name    = m.customer_name || m.sender_name || m.sender_id
    const chIcon  = CH_ICON?.[m.channel] || '📩'
    const preview = (m.body || '').slice(0, 120)
    return \`<div class="approval-row" id="arow-\${m.id}">
      <div class="approval-header">
        <span>\${chIcon}</span>
        <strong>\${esc(name)}</strong>
        \${m.subject ? \`<span style="font-size:11px;color:var(--muted)">· \${esc(m.subject)}</span>\` : ''}
        <span style="font-size:10px;color:var(--muted);margin-left:auto">\${fmt(m.created_at)}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;padding-left:4px">\${esc(preview)}</div>
      <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Agent draft</div>
      <div class="approval-draft" id="draft-\${m.id}">\${esc(m.agent_reply || '')}</div>
      <textarea class="edit-reply" id="edit-\${m.id}" rows="3"></textarea>
      <div class="approval-actions">
        <button class="btn btn-p" style="font-size:11px" onclick="approveReply('\${m.id}')">Approve &amp; Send</button>
        <button class="btn btn-g" style="font-size:11px" onclick="toggleEdit('\${m.id}')">Edit</button>
        <button class="btn btn-r" style="font-size:11px" onclick="discardReply('\${m.id}')">Discard</button>
      </div>
    </div>\`
  }).join('')
}

function toggleEdit(id) {
  const draft = document.getElementById('draft-' + id)
  const edit  = document.getElementById('edit-' + id)
  const showing = edit.style.display !== 'none'
  if (showing) {
    edit.style.display = 'none'
    draft.style.display = ''
  } else {
    edit.value = draft.textContent
    edit.style.display = ''
    draft.style.display = 'none'
    edit.focus()
  }
}

async function approveReply(id) {
  const editEl = document.getElementById('edit-' + id)
  const body   = editEl && editEl.style.display !== 'none' ? { reply: editEl.value.trim() } : {}
  const res = await fetch(\`/api/inbox/\${id}/approve\`, {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body),
  })
  const d = await res.json()
  if (!res.ok) { alert(d.error || 'Failed to send'); return }
  document.getElementById('arow-' + id)?.remove()
  const remaining = document.querySelectorAll('[id^="arow-"]').length
  document.getElementById('approval-count').textContent = String(remaining)
  if (!remaining) document.getElementById('approval-panel').style.display = 'none'
}

async function discardReply(id) {
  if (!confirm('Discard this draft reply? The message will be marked as handled without a response.')) return
  await fetch(\`/api/inbox/\${id}/discard\`, { method: 'POST' })
  document.getElementById('arow-' + id)?.remove()
  const remaining = document.querySelectorAll('[id^="arow-"]').length
  document.getElementById('approval-count').textContent = String(remaining)
  if (!remaining) document.getElementById('approval-panel').style.display = 'none'
}

// ── Inbox ─────────────────────────────────────────────────────────────────────

let _inboxFilter = ''
function setInboxFilter(ch) {
  _inboxFilter = ch
  document.querySelectorAll('[id^="if-"]').forEach(b => b.classList.remove('btn-p'))
  document.getElementById(ch ? 'if-' + ch.replace('instagram','facebook') : 'if-all')?.classList.add('btn-p')
  refresh()
}

const CH_ICON = { email:'✉️', sms:'📱', facebook:'📘', instagram:'📷', twitter:'🐦', web:'💬' }
const CH_LABEL = { email:'email', sms:'sms', facebook:'fb', instagram:'ig', twitter:'x', web:'web' }

function renderInbox(messages) {
  const el = document.getElementById('inbox-list')
  const filtered = _inboxFilter ? messages.filter(m => m.channel === _inboxFilter || ((_inboxFilter === 'facebook') && (m.channel === 'facebook' || m.channel === 'instagram'))) : messages
  document.getElementById('inbox-count').textContent = filtered.length
  if (!filtered.length) { el.innerHTML = '<div class="empty">No messages' + (_inboxFilter ? ' for this channel' : '') + '</div>'; return }

  el.innerHTML = filtered.map(m => {
    const name = m.customer_name || m.sender_name || m.sender_id
    const preview = m.agent_reply ? '↩ ' + m.agent_reply.slice(0, 60) : m.body.slice(0, 80)
    const statusBadge = m.status === 'escalated'
      ? '<span class="badge b-esc">escalated</span>'
      : m.status === 'handled'
        ? '<span class="badge b-res">handled</span>'
        : m.status === 'error'
          ? '<span class="badge" style="background:rgba(239,68,68,.15);color:var(--red)">error</span>'
          : '<span class="badge b-open">pending</span>'
    const sent = m.agent_reply_sent ? ' ✓' : m.agent_reply ? ' (queued)' : ''
    return \`<div class="inbox-row" onclick="openConv('\${m.conversation_id}')">
      <div class="ch-icon">\${CH_ICON[m.channel] || '📩'}<br><span class="ch-badge ch-\${m.channel}">\${CH_LABEL[m.channel] || m.channel}</span></div>
      <div>
        <div class="inbox-sender">\${esc(name)}</div>
        \${m.subject ? \`<div class="inbox-subj">\${esc(m.subject)}</div>\` : ''}
        <div class="inbox-preview">\${esc(preview)}\${sent}</div>
      </div>
      <div>\${statusBadge}</div>
      <div style="font-size:10px;color:var(--muted);text-align:right">\${fmt(m.created_at)}</div>
    </div>\`
  }).join('')
}

function renderChannelStatus(status) {
  if (!status) return
  const el = document.getElementById('channel-status')
  const channels = [
    { key: 'email',     label: 'Email',     icon: '✉️',  detail: status.email?.user },
    { key: 'sms',       label: 'SMS',       icon: '📱',  detail: status.sms?.phone },
    { key: 'facebook',  label: 'Facebook',  icon: '📘',  detail: status.facebook?.configured ? 'connected' : null },
    { key: 'instagram', label: 'Instagram', icon: '📷',  detail: status.instagram?.configured ? 'connected' : null },
    { key: 'web',       label: 'Web Widget',icon: '💬',  detail: status.web?.configured ? 'active' : null },
  ]
  el.innerHTML = channels.map(c => {
    const on = status[c.key]?.configured
    return \`<div class="ch-status-row">
      <div class="ch-name">
        <span class="ch-dot \${on ? 'ch-on' : 'ch-off'}"></span>
        \${c.icon} \${c.label}
      </div>
      <div style="font-size:11px;color:\${on ? 'var(--green)' : 'var(--muted)'}">
        \${on ? (c.detail || 'connected') : 'not configured'}
      </div>
    </div>\`
  }).join('')
}

async function refresh() {
  const state = await fetch('/api/state').then(r=>r.json()).catch(()=>null)
  if (!state) return
  if (state.clientName) document.getElementById('client-name').textContent = state.clientName + ' — Customer Experience'
  renderMetrics(state.metrics)
  renderApprovals(state.pendingApprovals || [])
  renderInbox(state.inbox || [])
  renderChannelStatus(state.channelStatus)
  renderEscalations(state.openEscalations)
  renderActive(state.activeConversations)
  renderRecent(state.recentConversations)
  renderActionStats(state.metrics)
  renderEscTriggers(state.metrics)
  renderCsatDist(state.metrics)
  renderEvents(state.recentEvents)
  renderKb(state.knowledgeBase || [])
  renderCustomers(state.customers || [])
  renderAuthority(state.authorityConfig || [])
  renderIntegrations(state.integrations || [])
  renderLearningQueue(state.learningQueue || [])
  populateTestDropdown(state.customers || [])
  if (state.chatPort) {
    window._chatPort = state.chatPort
    document.getElementById('chat-page-link').href = \`http://localhost:\${state.chatPort}/chat\`
  }
  document.getElementById('last-refresh').textContent = 'Updated ' + fmtTime(new Date().toISOString())
  document.getElementById('footer-time').textContent = new Date().toLocaleString('en-GB')
}

function renderMetrics(m) {
  if (!m) return
  const r = m.resolution, s = m.sentiment, v = m.volume, e = m.escalations
  const resEl = document.getElementById('m-res')
  resEl.textContent = r.resolution_rate_pct + '%'
  resEl.className = 'value ' + (r.resolution_rate_pct >= 80 ? 'green' : r.resolution_rate_pct >= 60 ? 'amber' : 'red')
  document.getElementById('m-fcr').textContent = r.fcr_rate_pct + '%'
  const csatEl = document.getElementById('m-csat')
  csatEl.textContent = s.avg_csat ?? '—'
  if (s.avg_csat) csatEl.className = 'value ' + (s.avg_csat >= 4 ? 'green' : s.avg_csat >= 3 ? 'amber' : 'red')
  document.getElementById('m-csat-count').textContent = s.csat_count + ' ratings'
  const escEl = document.getElementById('m-esc')
  escEl.textContent = e.escalation_rate_pct + '%'
  escEl.className = 'value ' + (e.escalation_rate_pct <= 10 ? 'green' : e.escalation_rate_pct <= 25 ? 'amber' : 'red')
  document.getElementById('m-esc-total').textContent = e.total_escalations + ' total'
  document.getElementById('m-vol').textContent = v.this_week
  document.getElementById('m-vol-sub').textContent = \`\${v.today} today · \${v.this_month} month\`
  document.getElementById('m-turns').textContent = r.avg_turns_to_resolve || '—'
}

function renderEscalations(escs) {
  const el = document.getElementById('esc-list')
  document.getElementById('esc-count').textContent = escs.length
  if (!escs.length) { el.innerHTML = '<div class="empty">No open escalations — all clear</div>'; return }
  el.innerHTML = escs.map(e => {
    const ctx = e.full_context_json ? JSON.parse(e.full_context_json) : {}
    return \`<div class="row">
      <div style="min-width:60px">
        <div style="font-size:11px;font-weight:700;color:var(--red);\${ctx.priority==='critical'?'color:var(--red)':ctx.priority==='urgent'?'color:var(--amber)':''}">\${(ctx.priority||'normal').toUpperCase()}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">\${e.trigger||'unknown'}</div>
      </div>
      <div class="row-info">
        <div class="title">\${esc(e.customer_name||'Unknown')} \${tierBadge(e.customer_tier)}</div>
        <div class="meta">\${esc(e.summary||'').slice(0,100)}</div>
        <div class="meta" style="margin-top:2px">\${fmt(e.created_at)}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn btn-g" onclick="openConv('\${e.conversation_id}')">View</button>
        <button class="btn btn-r" onclick="resolveEsc('\${e.id}')">Resolve</button>
      </div>
    </div>\`
  }).join('')
}

function renderActive(convs) {
  const el = document.getElementById('active-list')
  document.getElementById('active-count').textContent = convs.length
  if (!convs.length) { el.innerHTML = '<div class="empty">No active conversations</div>'; return }
  el.innerHTML = convs.map(c => \`
    <div class="row">
      <div class="row-info">
        <div class="title">\${esc(c.customer_name)} \${tierBadge(c.customer_tier)}</div>
        <div class="meta">\${c.turn_count} turns · last active \${fmt(c.last_activity_at)}</div>
      </div>
      <button class="btn btn-g" onclick="openConv('\${c.id}')">View</button>
    </div>\`).join('')
}

function renderRecent(convs) {
  const el = document.getElementById('recent-list')
  if (!convs.length) { el.innerHTML = '<div class="empty">No conversations yet</div>'; return }
  el.innerHTML = convs.map(c => {
    const statusBadge = c.escalated
      ? '<span class="badge b-esc">escalated</span>'
      : c.status==='resolved' ? '<span class="badge b-res">resolved</span>' : '<span class="badge b-open">open</span>'
    return \`<div class="row">
      <div class="row-info">
        <div class="title">\${esc(c.customer_name)} \${tierBadge(c.customer_tier)} \${statusBadge}</div>
        <div class="meta">\${c.turn_count} turns · \${c.resolution_method || 'in progress'} · \${fmt(c.started_at)}</div>
      </div>
      <button class="btn btn-g" onclick="openConv('\${c.id}')">View</button>
    </div>\`
  }).join('')
}

function renderActionStats(m) {
  if (!m?.actions) return
  document.getElementById('as-total').textContent = m.actions.total_actions
  document.getElementById('as-verified').textContent = m.actions.verified_pct + '%'
  const el = document.getElementById('top-actions')
  el.innerHTML = (m.actions.by_type||[]).slice(0,5).map(a =>
    \`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span style="color:var(--muted)">\${a.action_name}</span>
      <span>\${a.count}× <span style="color:var(--green)">\${a.verified_pct}%</span></span>
    </div>\`
  ).join('')
}

function renderEscTriggers(m) {
  const el = document.getElementById('esc-triggers')
  const triggers = m?.escalations?.by_trigger || []
  if (!triggers.length) { el.innerHTML = '<div class="empty">No escalations</div>'; return }
  const max = Math.max(...triggers.map(t => t.count))
  el.innerHTML = triggers.map(t => \`
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0">
      <div style="width:90px;font-size:11px;color:var(--muted)">\${t.trigger}</div>
      <div style="flex:1;height:4px;background:var(--border);border-radius:2px">
        <div style="height:100%;background:var(--red);border-radius:2px;width:\${(t.count/max)*100}%"></div>
      </div>
      <div style="font-size:12px;font-weight:600;width:20px;text-align:right">\${t.count}</div>
    </div>\`).join('')
}

function renderCsatDist(m) {
  const el = document.getElementById('csat-dist')
  const dist = m?.sentiment?.csat_distribution || []
  if (!dist.length) { el.innerHTML = '<div class="empty">No CSAT scores yet</div>'; return }
  const max = Math.max(...dist.map(d => d.count))
  const cols = { 5:'var(--green)', 4:'var(--green)', 3:'var(--amber)', 2:'var(--red)', 1:'var(--red)' }
  el.innerHTML = [5,4,3,2,1].map(score => {
    const d = dist.find(x => x.score === score) || { count: 0 }
    return \`<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
      <div style="width:16px;font-size:12px;font-weight:600;color:\${cols[score]}">\${score}</div>
      <div style="flex:1;height:6px;background:var(--border);border-radius:3px">
        <div style="height:100%;background:\${cols[score]};border-radius:3px;width:\${max>0?(d.count/max)*100:0}%"></div>
      </div>
      <div style="width:24px;text-align:right;font-size:11px">\${d.count}</div>
    </div>\`
  }).join('')
}

function renderEvents(events) {
  const el = document.getElementById('events-list')
  if (!events.length) { el.innerHTML = '<div class="empty">No events yet</div>'; return }
  el.innerHTML = events.slice(0,25).map(e => \`
    <div class="event-row">
      <span class="e-time">\${fmtTime(e.created_at)}</span>
      <span class="e-type">\${esc(e.type)}</span>
      <span style="color:var(--muted)">\${esc((e.description||'').slice(0,50))}</span>
    </div>\`).join('')
}

// Conversation modal
let currentConvId = null
async function openConv(id) {
  currentConvId = id
  document.getElementById('conv-modal').classList.add('open')
  document.getElementById('modal-title').textContent = 'Loading...'
  document.getElementById('tab-messages').innerHTML = '<div class="empty"><span class="spinner"></span></div>'
  document.getElementById('tab-actions').innerHTML = ''
  document.getElementById('modal-actions').innerHTML = ''

  const data = await fetch(\`/api/conversations/\${id}\`).then(r=>r.json())
  const c = data.conversation
  document.getElementById('modal-title').textContent = \`\${c.customer_name} (\${c.customer_tier}) · \${c.turn_count} turns · \${c.status}\`

  document.getElementById('tab-messages').innerHTML = (data.messages||[]).map(m => \`
    <div class="msg msg-\${m.role}">
      <div style="font-size:10px;color:var(--muted);margin-bottom:4px">\${m.role.toUpperCase()} · \${fmt(m.created_at)}\${m.frustration_flag?'  ⚠ frustration':''}</div>
      \${esc(m.content)}
    </div>\`).join('') || '<div class="empty">No messages</div>'

  document.getElementById('tab-actions').innerHTML = (data.actions||[]).map(a => \`
    <div class="action-row">
      <span class="\${a.verified && a.success ? 'action-ok' : 'action-fail'}">\${a.success ? '✓' : '✗'}</span>
      <span style="font-weight:500">\${a.action_name}</span>
      <span style="color:var(--muted)">\${a.authority_tier}</span>
      <span style="color:var(--muted)">\${a.verified ? 'verified' : 'unverified'}</span>
      <span style="color:var(--muted)">\${fmt(a.created_at)}</span>
    </div>\`).join('') || '<div class="empty">No actions taken</div>'

  const actions = document.getElementById('modal-actions')
  if (data.escalation && !data.escalation.resolved_at) {
    actions.innerHTML = \`<button class="btn btn-r" onclick="resolveEsc('\${data.escalation.id}')">Resolve Escalation</button>\`
  }
}

function closeModal() {
  document.getElementById('conv-modal').classList.remove('open')
  currentConvId = null
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  event.target.classList.add('active')
  document.getElementById('tab-messages').style.display = name==='messages' ? '' : 'none'
  document.getElementById('tab-actions').style.display = name==='actions' ? '' : 'none'
}

async function resolveEsc(id) {
  const notes = prompt('Resolution notes (optional):') ?? ''
  await fetch(\`/api/escalations/\${id}/resolve\`, {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ notes })
  })
  closeModal()
  refresh()
}

document.getElementById('conv-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal()
})
document.getElementById('kb-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeKbModal()
})
document.getElementById('cust-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeCustModal()
})
document.getElementById('auth-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeAuthModal()
})
document.getElementById('integration-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeIntegrationModal()
})

// Knowledge Base
function renderKb(entries) {
  const el = document.getElementById('kb-list')
  document.getElementById('kb-count').textContent = entries.length
  if (!entries.length) { el.innerHTML = '<div class="empty">No entries — add your first policy or FAQ</div>'; return }
  el.innerHTML = entries.map(e => \`
    <div class="kb-row">
      <div><span class="kb-cat">\${esc(e.category)}</span>\${!e.active ? '<br><span class="badge b-inactive" style="margin-top:3px">inactive</span>' : ''}</div>
      <div>
        <div class="kb-title">\${esc(e.title)}</div>
        <div class="kb-preview">\${esc((e.content||'').slice(0,120))}\${e.content?.length > 120 ? '…' : ''}</div>
        \${e.usage_count > 0 ? \`<div style="font-size:10px;color:var(--accent);margin-top:3px">Used \${e.usage_count}× by agent</div>\` : ''}
      </div>
      <div class="kb-actions">
        <button class="btn btn-g" onclick='editKbEntry(\${JSON.stringify(e).replace(/'/g,"&#39;")})' style="font-size:10px;padding:4px 9px">Edit</button>
        <button class="btn btn-r" onclick="deleteKbEntry('\${e.id}')" style="font-size:10px;padding:4px 9px">Del</button>
      </div>
    </div>\`).join('')
}

function openKbModal(entry) {
  document.getElementById('kb-modal-title').textContent = entry ? 'Edit Entry' : 'Add Knowledge Base Entry'
  document.getElementById('kb-edit-id').value = entry?.id ?? ''
  document.getElementById('kb-category').value = entry?.category ?? 'billing'
  document.getElementById('kb-title').value = entry?.title ?? ''
  document.getElementById('kb-content').value = entry?.content ?? ''
  document.getElementById('kb-source').value = entry?.source ?? ''
  document.getElementById('kb-active').checked = entry ? Boolean(entry.active) : true
  document.getElementById('kb-modal').classList.add('open')
}

function editKbEntry(entry) { openKbModal(entry) }

function toggleKbImport() {
  const panel = document.getElementById('kb-import-panel')
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none'
}

async function submitKbImport() {
  const raw = document.getElementById('kb-import-text').value.trim()
  const category = document.getElementById('kb-import-category').value
  const resultEl = document.getElementById('kb-import-result')
  if (!raw) { resultEl.textContent = 'No text to import.'; resultEl.style.color = 'var(--red)'; return }

  resultEl.textContent = 'Importing…'; resultEl.style.color = 'var(--muted)'
  const r = await fetch('/api/kb/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw, category }),
  })
  const d = await r.json()
  if (d.created > 0) {
    resultEl.textContent = \`✓ Imported \${d.created} entr\${d.created === 1 ? 'y' : 'ies'}.\`
    resultEl.style.color = 'var(--green)'
    document.getElementById('kb-import-text').value = ''
    await refresh()
  } else {
    resultEl.textContent = d.error ?? \`No entries found. \${d.errors?.join(', ') ?? ''}\`
    resultEl.style.color = 'var(--red)'
  }
}

function closeKbModal() {
  document.getElementById('kb-modal').classList.remove('open')
}

async function saveKbEntry() {
  const id = document.getElementById('kb-edit-id').value
  const body = {
    category: document.getElementById('kb-category').value,
    title: document.getElementById('kb-title').value.trim(),
    content: document.getElementById('kb-content').value.trim(),
    source: document.getElementById('kb-source').value.trim() || 'manual',
    active: document.getElementById('kb-active').checked,
  }
  if (!body.title || !body.content) { alert('Title and content are required.'); return }

  const btn = document.getElementById('kb-save-btn')
  btn.disabled = true
  btn.textContent = 'Saving...'

  try {
    const url = id ? \`/api/kb/\${id}\` : '/api/kb'
    const method = id ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
    if (!res.ok) throw new Error('Save failed')
    closeKbModal()
    refresh()
  } catch {
    alert('Failed to save. Try again.')
  }
  btn.disabled = false
  btn.textContent = 'Save Entry'
}

async function deleteKbEntry(id) {
  if (!confirm('Delete this knowledge base entry?')) return
  await fetch(\`/api/kb/\${id}\`, { method: 'DELETE' })
  refresh()
}

// ── Customers ────────────────────────────────────────────────────────────────

function renderCustomers(custs) {
  const el = document.getElementById('cust-list')
  document.getElementById('cust-count').textContent = custs.length
  if (!custs.length) { el.innerHTML = '<div class="empty">No customers — add your first one</div>'; return }
  el.innerHTML = custs.map(c => \`
    <div class="cust-row">
      <div>
        <div class="cn">\${esc(c.name)}</div>
        <div class="ce">\${esc(c.email)}</div>
      </div>
      <div style="color:var(--muted)">\${esc(c.email)}</div>
      <div>\${tierBadge(c.tier)}</div>
      <div style="font-size:11px;color:\${c.account_status==='active'?'var(--green)':'var(--amber)'}">\${c.account_status}</div>
      <div class="cust-actions">
        <button class="btn btn-g" onclick='editCust(\${JSON.stringify(c).replace(/'/g,"&#39;")})' style="font-size:10px;padding:4px 8px">Edit</button>
        <button class="btn btn-r" onclick="deleteCust('\${c.id}')" style="font-size:10px;padding:4px 8px">Del</button>
      </div>
    </div>\`).join('')
}

function openCustModal(c) {
  document.getElementById('cust-modal-title').textContent = c ? 'Edit Customer' : 'Add Customer'
  document.getElementById('cust-edit-id').value = c?.id ?? ''
  document.getElementById('cust-name').value = c?.name ?? ''
  document.getElementById('cust-email').value = c?.email ?? ''
  document.getElementById('cust-phone').value = c?.phone ?? ''
  document.getElementById('cust-tier').value = c?.tier ?? 'standard'
  document.getElementById('cust-status').value = c?.account_status ?? 'active'
  document.getElementById('cust-status-row').style.display = c ? '' : 'none'
  document.getElementById('cust-email').disabled = Boolean(c)
  document.getElementById('cust-modal').classList.add('open')
}

function editCust(c) { openCustModal(c) }
function closeCustModal() { document.getElementById('cust-modal').classList.remove('open') }

async function saveCust() {
  const id = document.getElementById('cust-edit-id').value
  const body = {
    name:           document.getElementById('cust-name').value.trim(),
    email:          document.getElementById('cust-email').value.trim(),
    phone:          document.getElementById('cust-phone').value.trim() || null,
    tier:           document.getElementById('cust-tier').value,
    account_status: document.getElementById('cust-status').value,
  }
  if (!body.name || !body.email) { alert('Name and email are required.'); return }
  const url    = id ? \`/api/customers/\${id}\` : '/api/customers'
  const method = id ? 'PUT' : 'POST'
  const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
  const d = await res.json()
  if (!res.ok) { alert(d.error || 'Save failed'); return }
  closeCustModal()
  refresh()
}

async function deleteCust(id) {
  if (!confirm('Remove this customer? Their conversation history will be preserved.')) return
  await fetch(\`/api/customers/\${id}\`, { method: 'DELETE' })
  refresh()
}

// ── Authority config ──────────────────────────────────────────────────────────

function renderAuthority(config) {
  const el = document.getElementById('authority-list')
  if (!config.length) { el.innerHTML = '<div class="empty">No config</div>'; return }
  const tierClass = t => t==='auto' ? 't-auto' : t==='confirm' ? 't-confirm' : 't-escalate'
  el.innerHTML = config.map(a => \`
    <div class="auth-row">
      <div style="font-size:11px;font-weight:500;color:var(--muted)">\${a.action_name}</div>
      <div><span class="auth-tier \${tierClass(a.tier)}">\${a.tier}</span></div>
      <div style="font-size:11px;color:var(--muted)">\${esc((a.description||'').slice(0,50))}</div>
      <button class="btn btn-g" style="font-size:10px;padding:3px 8px" onclick='openAuthModal(\${JSON.stringify(a).replace(/'/g,"&#39;")})'>Edit</button>
    </div>\`).join('')
}

function openAuthModal(a) {
  document.getElementById('auth-modal-title').textContent = 'Edit: ' + a.action_name
  document.getElementById('auth-action-name').value = a.action_name
  document.getElementById('auth-tier').value = a.tier
  document.getElementById('auth-desc').value = a.description ?? ''
  document.getElementById('auth-threshold').value = a.threshold ? JSON.stringify(a.threshold) : ''
  document.getElementById('auth-modal').classList.add('open')
}

function closeAuthModal() { document.getElementById('auth-modal').classList.remove('open') }

async function saveAuth() {
  const name = document.getElementById('auth-action-name').value
  const tier = document.getElementById('auth-tier').value
  const desc = document.getElementById('auth-desc').value.trim()
  const threshRaw = document.getElementById('auth-threshold').value.trim()
  let threshold = null
  if (threshRaw) {
    try { threshold = JSON.parse(threshRaw) } catch { alert('Invalid threshold JSON'); return }
  }
  await fetch(\`/api/authority/\${name}\`, {
    method: 'PATCH',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ tier, description: desc, threshold_json: threshold }),
  })
  closeAuthModal()
  refresh()
}

// ── Test tool ─────────────────────────────────────────────────────────────────

let _testConvId = null
let _testEmail  = null

function populateTestDropdown(custs) {
  const sel = document.getElementById('test-customer')
  const cur = sel.value
  sel.innerHTML = '<option value="">Select customer…</option>' +
    custs.map(c => \`<option value="\${esc(c.email)}">\${esc(c.name)} (\${esc(c.tier)})</option>\`).join('')
  if (cur) sel.value = cur
}

document.getElementById('test-customer').addEventListener('change', function() {
  _testEmail  = this.value || null
  _testConvId = null
  const input = document.getElementById('test-input')
  const btn   = document.getElementById('test-send')
  input.disabled = !_testEmail
  btn.disabled   = !_testEmail
  document.getElementById('test-messages').innerHTML = _testEmail
    ? '<div class="empty" style="margin:auto">Send a message to start</div>'
    : '<div class="empty" style="margin:auto">Select a customer above to start testing</div>'
  document.getElementById('test-actions').innerHTML = ''
})

async function sendTestMessage() {
  const input = document.getElementById('test-input')
  const msg   = input.value.trim()
  if (!msg || !_testEmail) return

  input.value    = ''
  input.disabled = true
  document.getElementById('test-send').disabled = true

  appendTestMsg('user', msg)

  const port = window._chatPort || 4748
  const res = await fetch(\`http://localhost:\${port}/api/chat\`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email: _testEmail, message: msg, conversation_id: _testConvId }),
  }).catch(() => null)

  if (!res) {
    appendTestMsg('agent', '⚠ Could not reach chat API. Is the server running?')
  } else {
    const d = await res.json()
    if (d.conversation_id) _testConvId = d.conversation_id
    appendTestMsg('agent', d.response || d.error || '(no response)')
    if (d.actionsTaken?.length) {
      document.getElementById('test-actions').innerHTML =
        \`<div style="font-size:10px;color:var(--green);padding:4px 0">Actions: \${d.actionsTaken.join(', ')}</div>\`
    } else {
      document.getElementById('test-actions').innerHTML = ''
    }
  }

  input.disabled = false
  document.getElementById('test-send').disabled = false
  input.focus()
}

function appendTestMsg(role, text) {
  const el = document.getElementById('test-messages')
  const empty = el.querySelector('.empty')
  if (empty) empty.remove()
  const div = document.createElement('div')
  div.className = 'test-msg test-msg-' + role
  div.textContent = text
  el.appendChild(div)
  el.scrollTop = el.scrollHeight
}

// ── Integrations ─────────────────────────────────────────────────────────────

function renderIntegrations(items) {
  const el = document.getElementById('integration-list')
  if (!items.length) { el.innerHTML = '<div class="empty">No integrations — connect an external API for live data access</div>'; return }
  el.innerHTML = items.map(i => \`
    <div class="row">
      <div class="row-info">
        <div class="title">\${esc(i.name)}</div>
        <div class="meta">\${i.method} · \${esc(i.url.length > 50 ? i.url.slice(0,50) + '...' : i.url)}</div>
        \${i.description ? '<div class="meta">' + esc(i.description) + '</div>' : ''}
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0">
        <button class="btn btn-g" style="font-size:10px;padding:4px 8px" onclick='openIntegrationModal(\${JSON.stringify(i).replace(/'/g,"&#39;")})'>Edit</button>
        <button class="btn btn-r" style="font-size:10px;padding:4px 8px" onclick="deleteIntegration('\${i.id}')">Del</button>
      </div>
    </div>\`).join('')
}

function openIntegrationModal(entry) {
  document.getElementById('int-modal-title').textContent = entry ? 'Edit Integration' : 'Add Integration'
  document.getElementById('int-edit-id').value    = entry?.id          ?? ''
  document.getElementById('int-name').value        = entry?.name        ?? ''
  document.getElementById('int-desc').value        = entry?.description ?? ''
  document.getElementById('int-url').value         = entry?.url         ?? ''
  document.getElementById('int-method').value      = entry?.method      ?? 'GET'
  document.getElementById('int-auth-type').value   = entry?.auth_type   ?? 'none'
  document.getElementById('int-auth-value').value  = ''
  document.getElementById('int-auth-header').value = entry?.auth_header ?? ''
  document.getElementById('int-test-result').textContent = ''
  toggleAuthFields()
  document.getElementById('integration-modal').classList.add('open')
}

function closeIntegrationModal() {
  document.getElementById('integration-modal').classList.remove('open')
}

function toggleAuthFields() {
  const type      = document.getElementById('int-auth-type').value
  const valueRow  = document.getElementById('int-auth-value-row')
  const headerRow = document.getElementById('int-auth-header-row')
  const label     = document.getElementById('int-auth-label')
  valueRow.style.display  = type === 'none' ? 'none' : ''
  headerRow.style.display = type === 'api_key' ? '' : 'none'
  if (label) {
    if (type === 'bearer')  label.textContent = 'Bearer token'
    if (type === 'basic')   label.textContent = 'Credentials (user:password)'
    if (type === 'api_key') label.textContent = 'API key value'
  }
}

async function saveIntegration() {
  const id   = document.getElementById('int-edit-id').value
  const name = document.getElementById('int-name').value.trim()
  const url  = document.getElementById('int-url').value.trim()
  if (!name || !url) { alert('Name and URL are required.'); return }
  const body = {
    name,
    description: document.getElementById('int-desc').value.trim() || undefined,
    url,
    method:      document.getElementById('int-method').value,
    auth_type:   document.getElementById('int-auth-type').value,
    auth_value:  document.getElementById('int-auth-value').value.trim() || undefined,
    auth_header: document.getElementById('int-auth-header').value.trim() || undefined,
  }
  const res = await fetch(id ? \`/api/integrations/\${id}\` : '/api/integrations', {
    method:  id ? 'PUT' : 'POST',
    headers: {'Content-Type':'application/json'},
    body:    JSON.stringify(body),
  })
  const d = await res.json()
  if (!res.ok) { alert(d.error || 'Save failed'); return }
  closeIntegrationModal()
  refresh()
}

async function testIntegration() {
  const id       = document.getElementById('int-edit-id').value
  const resultEl = document.getElementById('int-test-result')
  if (!id) { resultEl.textContent = 'Save the integration first, then test it.'; resultEl.style.color = 'var(--muted)'; return }
  resultEl.textContent = 'Testing…'; resultEl.style.color = 'var(--muted)'
  const res = await fetch(\`/api/integrations/\${id}/test\`, { method: 'POST' })
  const d   = await res.json()
  resultEl.textContent = d.ok ? ('✓ ' + (d.message || 'Connection OK')) : ('✗ ' + (d.error || 'Test failed'))
  resultEl.style.color = d.ok ? 'var(--green)' : 'var(--red)'
}

async function deleteIntegration(id) {
  if (!confirm('Remove this integration? The agent will no longer be able to call it.')) return
  await fetch(\`/api/integrations/\${id}\`, { method: 'DELETE' })
  refresh()
}

// ── Learning Queue ────────────────────────────────────────────────────────────

function renderLearningQueue(items) {
  const el      = document.getElementById('learning-list')
  const pending = (items || []).filter(i => i.status === 'pending')
  document.getElementById('learning-count').textContent = String(pending.length)
  if (!pending.length) { el.innerHTML = '<div class="empty">No items pending review</div>'; return }
  el.innerHTML = pending.map(item => {
    const typeColor = item.improvement_type === 'escalation' ? 'var(--red)' : 'var(--amber)'
    return \`<div class="row" id="lq-\${item.id}" style="flex-direction:column;align-items:stretch;gap:5px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:\${typeColor}">\${esc(item.improvement_type||'review')}</span>
        <span style="font-size:10px;color:var(--muted)">\${fmt(item.created_at)}</span>
        \${item.customer_name ? '<span style="font-size:10px;color:var(--muted)">· ' + esc(item.customer_name) + '</span>' : ''}
      </div>
      <div style="font-size:12px;line-height:1.4"><span style="color:var(--muted)">Customer: </span>\${esc((item.customer_message||'').slice(0,100))}</div>
      <div style="font-size:12px;line-height:1.4"><span style="color:var(--muted)">Agent: </span>\${esc((item.agent_response||'').slice(0,100))}</div>
      <div id="lq-edit-\${item.id}" style="display:none;margin-top:4px">
        <textarea id="lq-text-\${item.id}" rows="2" placeholder="Corrected response (optional — leave blank to just approve)" style="width:100%;padding:6px 8px;background:var(--bg);border:1px solid var(--accent);border-radius:5px;color:var(--text);font-size:12px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;margin-bottom:6px"></textarea>
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-bottom:6px;cursor:pointer">
          <input type="checkbox" id="lq-kb-\${item.id}" style="accent-color:var(--accent);width:auto" onchange="toggleLqKbTitle('\${item.id}')"> Also add to Knowledge Base
        </label>
        <div id="lq-kb-title-\${item.id}" style="display:none;margin-bottom:6px">
          <input type="text" id="lq-kb-text-\${item.id}" placeholder="KB entry title" style="width:100%;padding:6px 8px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:12px;outline:none;box-sizing:border-box">
        </div>
        <div style="display:flex;gap:5px">
          <button class="btn btn-p" style="font-size:10px;padding:4px 10px" onclick="confirmApproveLearn('\${item.id}')">Confirm</button>
          <button class="btn btn-g" style="font-size:10px;padding:4px 10px" onclick="cancelLearnEdit('\${item.id}')">Cancel</button>
        </div>
      </div>
      <div id="lq-btns-\${item.id}" style="display:flex;gap:5px">
        <button class="btn btn-p" style="font-size:10px;padding:4px 10px" onclick="approveLearnItem('\${item.id}')">Approve</button>
        <button class="btn btn-r" style="font-size:10px;padding:4px 10px" onclick="rejectLearnItem('\${item.id}')">Reject</button>
      </div>
    </div>\`
  }).join('')
}

function approveLearnItem(id) {
  document.getElementById('lq-edit-' + id).style.display = ''
  document.getElementById('lq-btns-' + id).style.display = 'none'
}

function cancelLearnEdit(id) {
  document.getElementById('lq-edit-' + id).style.display = 'none'
  document.getElementById('lq-btns-' + id).style.display = 'flex'
}

function toggleLqKbTitle(id) {
  const checked = document.getElementById('lq-kb-' + id).checked
  document.getElementById('lq-kb-title-' + id).style.display = checked ? '' : 'none'
}

async function confirmApproveLearn(id) {
  const correction = document.getElementById('lq-text-' + id)?.value?.trim()
  const createKb   = document.getElementById('lq-kb-'   + id)?.checked
  const kbTitle    = document.getElementById('lq-kb-text-' + id)?.value?.trim()
  await fetch(\`/api/learning-queue/\${id}/approve\`, {
    method:  'POST',
    headers: {'Content-Type':'application/json'},
    body:    JSON.stringify({ correction: correction || undefined, create_kb: createKb || undefined, kb_title: kbTitle || undefined }),
  })
  refresh()
}

async function rejectLearnItem(id) {
  await fetch(\`/api/learning-queue/\${id}/reject\`, { method: 'POST' })
  refresh()
}

refresh()
setInterval(refresh, 30000)
</script>
</body>
</html>`
}
