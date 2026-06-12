import { getConfig } from './config.js'
import { logEvent } from './events.js'
import { sendEmail } from './email.js'

async function fbPost(path: string, body: Record<string, unknown>): Promise<void> {
  const token = getConfig('FB_PAGE_ACCESS_TOKEN')
  if (!token) return
  await fetch(`https://graph.facebook.com/v19.0${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).catch(e => logEvent('facebook_error', path, String(e).slice(0, 200)))
}

async function twilioSms(to: string, body: string): Promise<void> {
  const sid  = getConfig('TWILIO_ACCOUNT_SID')
  const auth = getConfig('TWILIO_AUTH_TOKEN')
  const from = getConfig('TWILIO_PHONE_NUMBER')
  if (!sid || !auth || !from) return
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
  }).catch(e => logEvent('sms_error', 'send', String(e).slice(0, 200)))
}

export interface ReplyParams {
  channel: string
  senderId: string
  replyType: string       // 'direct' | 'fb_comment'
  externalId: string | null
  subject: string | null  // email subject line
  text: string
}

export async function sendReply(p: ReplyParams): Promise<void> {
  switch (p.channel) {
    case 'email': {
      const subj = p.subject
        ? (p.subject.startsWith('Re:') ? p.subject : `Re: ${p.subject}`)
        : 'Re: Your message'
      await sendEmail(p.senderId, subj, p.text)
      break
    }
    case 'sms':
      await twilioSms(p.senderId, p.text)
      break
    case 'facebook':
    case 'instagram':
      if (p.replyType === 'fb_comment' && p.externalId) {
        await fbPost(`/${p.externalId}/comments`, { message: p.text })
      } else {
        await fbPost('/me/messages', { recipient: { id: p.senderId }, message: { text: p.text } })
      }
      break
    // 'web' replies are synchronous HTTP responses — no async send needed
  }
}
