import nodemailer from 'nodemailer'

let transport: nodemailer.Transporter | null = null

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transport
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[email] (unconfigured) To: ${to} | Subject: ${subject}`)
    return
  }
  await getTransport().sendMail({
    from: `"CX Agent" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
  })
  console.log(`[email] Sent to ${to}: ${subject}`)
}
