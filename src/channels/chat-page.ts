export function getChatHtml(clientName: string): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${clientName} — Support</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#0d0f14;color:#e2e8f0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}
    .chat-wrap{width:100%;max-width:480px;height:100vh;max-height:680px;display:flex;flex-direction:column;background:#161922;border:1px solid #252a35;border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.5)}
    @media(max-width:520px){.chat-wrap{border-radius:0;max-height:100vh;border:none}}
    .chat-header{padding:16px 20px;border-bottom:1px solid #252a35;display:flex;align-items:center;gap:12px;flex-shrink:0}
    .avatar{width:36px;height:36px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
    .header-info .name{font-size:14px;font-weight:600}
    .header-info .status{font-size:11px;color:#22c55e;display:flex;align-items:center;gap:4px}
    .header-info .status::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e}
    .messages{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px}
    .messages::-webkit-scrollbar{width:4px}
    .messages::-webkit-scrollbar-track{background:transparent}
    .messages::-webkit-scrollbar-thumb{background:#252a35;border-radius:2px}
    .msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-wrap:break-word}
    .msg-agent{align-self:flex-start;background:#1e2330;border-bottom-left-radius:4px;color:#e2e8f0}
    .msg-user{align-self:flex-end;background:#6366f1;border-bottom-right-radius:4px;color:#fff}
    .msg-time{font-size:10px;color:#475569;margin-top:3px}
    .msg-agent .msg-time{text-align:left}
    .msg-user .msg-time{text-align:right;color:rgba(255,255,255,.5)}
    .typing{align-self:flex-start;background:#1e2330;border-radius:12px;border-bottom-left-radius:4px;padding:12px 16px;display:none}
    .typing span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#475569;animation:blink 1.4s infinite;margin:0 2px}
    .typing span:nth-child(2){animation-delay:.2s}
    .typing span:nth-child(3){animation-delay:.4s}
    @keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
    .input-area{padding:12px 16px;border-top:1px solid #252a35;display:flex;gap:8px;flex-shrink:0}
    .input-area textarea{flex:1;background:#0d0f14;border:1px solid #252a35;border-radius:8px;padding:9px 12px;color:#e2e8f0;font-size:13px;outline:none;resize:none;height:40px;max-height:120px;line-height:1.4;font-family:inherit;transition:border-color .15s}
    .input-area textarea:focus{border-color:#6366f1}
    .input-area textarea::placeholder{color:#374151}
    .send-btn{width:40px;height:40px;background:#6366f1;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s}
    .send-btn:hover{opacity:.9}
    .send-btn:disabled{opacity:.4;cursor:not-allowed}
    .send-btn svg{width:16px;height:16px;fill:white}

    /* Email gate */
    .gate{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
    .gate-icon{font-size:36px;margin-bottom:16px}
    .gate-title{font-size:17px;font-weight:600;margin-bottom:6px}
    .gate-sub{font-size:13px;color:#64748b;margin-bottom:24px;line-height:1.5}
    .gate input{width:100%;padding:10px 12px;background:#0d0f14;border:1px solid #252a35;border-radius:8px;color:#e2e8f0;font-size:14px;outline:none;margin-bottom:10px;transition:border-color .15s}
    .gate input:focus{border-color:#6366f1}
    .gate-btn{width:100%;padding:11px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s}
    .gate-btn:hover{opacity:.9}
    .gate-btn:disabled{opacity:.4;cursor:not-allowed}
    .gate-err{font-size:12px;color:#ef4444;margin-top:8px}

    .chat-view{display:none;flex:1;flex-direction:column;overflow:hidden}
    .chat-view.active{display:flex}
  </style>
</head>
<body>
<div class="chat-wrap">
  <div class="chat-header">
    <div class="avatar">🎧</div>
    <div class="header-info">
      <div class="name" id="header-name">${clientName} Support</div>
      <div class="status">Online — typically replies instantly</div>
    </div>
  </div>

  <!-- Email gate -->
  <div class="gate" id="gate">
    <div class="gate-icon">👋</div>
    <div class="gate-title">Hi there!</div>
    <div class="gate-sub">Enter the email address on your account and we'll pull up your details.</div>
    <input type="email" id="gate-email" placeholder="your@email.com" autocomplete="email">
    <button class="gate-btn" id="gate-btn" onclick="startChat()">Start conversation</button>
    <div class="gate-err" id="gate-err"></div>
  </div>

  <!-- Chat view -->
  <div class="chat-view" id="chat-view">
    <div class="messages" id="messages">
      <div class="typing" id="typing">
        <span></span><span></span><span></span>
      </div>
    </div>
    <div class="input-area">
      <textarea id="msg-input" placeholder="Type a message…" rows="1" onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
      <button class="send-btn" id="send-btn" onclick="sendMessage()">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  </div>
</div>

<script>
const API = ''   // same origin
let email = ''
let convId = null

function fmt(d) {
  try { return new Date(d).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) } catch { return '' }
}

function appendMsg(role, text) {
  const msgs = document.getElementById('messages')
  const typing = document.getElementById('typing')
  const div = document.createElement('div')
  div.className = 'msg msg-' + role
  div.innerHTML = \`<div>\${esc(text)}</div><div class="msg-time">\${fmt(new Date())}</div>\`
  msgs.insertBefore(div, typing)
  msgs.scrollTop = msgs.scrollHeight
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>')
}

function setTyping(on) {
  document.getElementById('typing').style.display = on ? 'block' : 'none'
  const msgs = document.getElementById('messages')
  msgs.scrollTop = msgs.scrollHeight
}

async function startChat() {
  const input = document.getElementById('gate-email')
  const err   = document.getElementById('gate-err')
  const btn   = document.getElementById('gate-btn')
  email = input.value.trim()
  if (!email) return

  btn.disabled = true
  btn.textContent = 'Starting…'
  err.textContent = ''

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email }),
    })
    const d = await res.json()
    if (!d.found) {
      err.textContent = d.error || "We couldn't find an account with that email. Please check and try again."
      btn.disabled = false
      btn.textContent = 'Start conversation'
      return
    }
    // Switch to chat view
    document.getElementById('gate').style.display = 'none'
    document.getElementById('chat-view').classList.add('active')
    document.getElementById('msg-input').focus()

    appendMsg('agent', \`Hi \${d.name?.split(' ')[0] || 'there'}! How can I help you today?\`)
  } catch {
    err.textContent = 'Connection error. Please try again.'
    btn.disabled = false
    btn.textContent = 'Start conversation'
  }
}

async function sendMessage() {
  const input = document.getElementById('msg-input')
  const text = input.value.trim()
  if (!text) return

  input.value = ''
  input.style.height = '40px'
  document.getElementById('send-btn').disabled = true

  appendMsg('user', text)
  setTyping(true)

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, message: text, conversation_id: convId }),
    })
    const d = await res.json()
    setTyping(false)

    if (d.conversation_id) convId = d.conversation_id

    if (d.error) {
      appendMsg('agent', d.escalated
        ? 'You have been transferred to our support team who will be in touch shortly.'
        : 'Sorry, something went wrong. Please try again.')
    } else {
      appendMsg('agent', d.response)
    }
  } catch {
    setTyping(false)
    appendMsg('agent', 'Connection lost. Please refresh and try again.')
  }

  document.getElementById('send-btn').disabled = false
  document.getElementById('msg-input').focus()
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
}

function autoResize(el) {
  el.style.height = '40px'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

document.getElementById('gate-email').addEventListener('keydown', e => {
  if (e.key === 'Enter') startChat()
})
</script>
</body>
</html>`
}

export function getWidgetJs(port: number): string {
  return `(function(){
  if(window.__cxWidget)return;
  window.__cxWidget=true;
  var PORT=${port};
  var s=document.createElement('style');
  s.textContent='.cx-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#6366f1;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(99,102,241,.4);display:flex;align-items:center;justify-content:center;z-index:9998;transition:transform .2s}.cx-btn:hover{transform:scale(1.08)}.cx-btn svg{width:24px;height:24px;fill:white}.cx-frame{position:fixed;bottom:92px;right:24px;width:400px;height:600px;border:none;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.4);z-index:9999;display:none;transition:opacity .2s}.cx-frame.open{display:block}@media(max-width:480px){.cx-frame{width:100vw;height:100vh;bottom:0;right:0;border-radius:0}}';
  document.head.appendChild(s);
  var btn=document.createElement('button');
  btn.className='cx-btn';
  btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  var frame=document.createElement('iframe');
  frame.className='cx-frame';
  frame.src='http://localhost:'+PORT+'/chat';
  document.body.appendChild(frame);
  document.body.appendChild(btn);
  btn.addEventListener('click',function(){
    frame.classList.toggle('open');
    btn.innerHTML=frame.classList.contains('open')
      ?'<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
      :'<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  });
})();`
}
