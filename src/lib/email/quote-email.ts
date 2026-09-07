import 'server-only'

import { Resend } from 'resend'

const FROM = process.env.QUOTE_EMAIL_FROM || 'onboarding@resend.dev'

export type EmailResult = { sent: true } | { sent: false; reason: string }

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}

async function fetchPdf(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

interface SendQuoteArgs {
  to: string
  issuerName: string
  quoteNumber: string
  publicUrl: string
  pdfUrl: string | null
}

/** Envoie le devis au client (lien vers la page publique + PDF en pièce jointe). */
export async function sendQuoteToClient(args: SendQuoteArgs): Promise<EmailResult> {
  const client = resend()
  if (!client) return { sent: false, reason: 'RESEND_API_KEY manquante' }

  const pdf = args.pdfUrl ? await fetchPdf(args.pdfUrl) : null

  const { error } = await client.emails.send({
    from: `${args.issuerName} <${FROM}>`,
    to: args.to,
    subject: `Votre devis ${args.quoteNumber}`,
    html: `<p>Bonjour,</p>
      <p>${args.issuerName} vous a adressé le devis <strong>${args.quoteNumber}</strong>.</p>
      <p>Vous pouvez le consulter, l'accepter ou le refuser en ligne :<br/>
      <a href="${args.publicUrl}">${args.publicUrl}</a></p>
      <p>Cordialement,<br/>${args.issuerName}</p>`,
    attachments: pdf ? [{ filename: `devis-${args.quoteNumber}.pdf`, content: pdf }] : undefined,
  })

  return error ? { sent: false, reason: error.message } : { sent: true }
}
