import { ImapFlow } from 'imapflow'
import { simpleParser, type ParsedMail } from 'mailparser'
import { getConfig } from '../lib/config.js'
import { sendEmail } from '../lib/email.js'
import { logEvent } from '../lib/events.js'
import { run } from '../lib/db.js'
import { processInbound, type MediaAttachment } from '../agent/channel-handler.js'
// email replies always go directly (not via sendReply) to preserve subject threading

let isPolling = false

function buildClient(): ImapFlow | null {
  const host = getConfig('IMAP_HOST') ?? deriveImapHost()
  const user = getConfig('IMAP_USER') ?? getConfig('SMTP_USER')
  const pass = getConfig('IMAP_PASS') ?? getConfig('SMTP_PASS')
  if (!host || !user || !pass) return null

  return new ImapFlow({
    host,
    port: parseInt(getConfig('IMAP_PORT') ?? '993'),
    secure: getConfig('IMAP_TLS') !== 'false',
    auth: { user, pass },
    logger: false,
  })
}

function deriveImapHost(): string | undefined {
  const smtp = getConfig('SMTP_HOST')
  if (!smtp) return undefined
  if (smtp.startsWith('smtp.')) return smtp.replace('smtp.', 'imap.')
  return smtp
}

export async function pollEmailInbox(): Promise<void> {
  if (isPolling) return
  isPolling = true

  const client = buildClient()
  if (!client) { isPolling = false; return }

  const ourEmail = (getConfig('IMAP_USER') ?? getConfig('SMTP_USER') ?? '').toLowerCase()

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      const searchResult = await client.search({ seen: false }, { uid: true })
      const uids = Array.isArray(searchResult) ? searchResult : []
      if (!uids.length) return

      for await (const msg of client.fetch(uids, { envelope: true, source: true }, { uid: true })) {
        if (!msg.envelope || !msg.source) continue

        try {
          const from = msg.envelope.from?.[0]
          if (!from) continue

          const senderEmail = from.address ?? ''
          if (!senderEmail || senderEmail.toLowerCase() === ourEmail) continue

          const parsed: ParsedMail = await simpleParser(msg.source)
          const bodyText = (parsed.text ?? '').trim()
            || (typeof parsed.html === 'string' ? parsed.html : '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          if (!bodyText) continue

          const subject = msg.envelope.subject ?? '(no subject)'

          // Extract image attachments from email MIME
          const emailAttachments: MediaAttachment[] = []
          for (const att of (parsed.attachments ?? [])) {
            const ct = att.contentType ?? ''
            if (ct.startsWith('image/') && att.content) {
              const mediaType = ct.split(';')[0].trim() as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
              const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType)
              if (supported) {
                emailAttachments.push({
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: att.content.toString('base64') },
                })
              }
            }
          }

          const result = await processInbound({
            channel: 'email',
            senderId: senderEmail,
            senderName: from.name ?? null,
            body: bodyText,
            attachments: emailAttachments.length ? emailAttachments : undefined,
            metadata: {
              subject,
              externalId: String(msg.uid),
            },
          })

          if (result.autoSend && result.response) {
            const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`
            await sendEmail(senderEmail, replySubject, result.response)
            run(`UPDATE inbound_messages SET agent_reply_sent = 1 WHERE id = ?`, result.messageId)
          }

          if (msg.uid !== undefined) {
            await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'])
          }
          logEvent('email_handled', senderEmail, `${result.status} — ${subject.slice(0, 60)}`)

        } catch (msgErr) {
          console.error(`[email-poller] message error:`, msgErr)
          logEvent('email_error', 'message', String(msgErr).slice(0, 200))
        }
      }
    } finally {
      lock.release()
    }

    await client.logout()

  } catch (err) {
    const msg = String(err)
    if (!msg.includes('ECONNREFUSED') && !msg.includes('Not connected') && !msg.includes('ENOTFOUND')) {
      console.error(`[email-poller] IMAP error:`, msg)
      logEvent('email_error', 'imap', msg.slice(0, 200))
    }
  } finally {
    isPolling = false
  }
}
