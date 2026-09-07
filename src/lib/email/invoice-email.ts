import 'server-only'

import { Resend } from 'resend'

const FROM =
  process.env.INVOICE_EMAIL_FROM || process.env.QUOTE_EMAIL_FROM || 'onboarding@resend.dev'

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

interface SendInvoiceArgs {
  to: string
  issuerName: string
  invoiceNumber: string
  isCreditNote: boolean
  pdfUrl: string | null
}

/** Envoie la facture (ou l'avoir) au client, PDF en pièce jointe. */
export async function sendInvoiceToClient(args: SendInvoiceArgs): Promise<EmailResult> {
  const client = resend()
  if (!client) return { sent: false, reason: 'RESEND_API_KEY manquante' }

  const noun = args.isCreditNote ? 'avoir' : 'facture'
  const pdf = args.pdfUrl ? await fetchPdf(args.pdfUrl) : null

  const { error } = await client.emails.send({
    from: `${args.issuerName} <${FROM}>`,
    to: args.to,
    subject: `Votre ${noun} ${args.invoiceNumber}`,
    html: `<p>Bonjour,</p>
      <p>${args.issuerName} vous adresse ${args.isCreditNote ? "l'avoir" : 'la facture'}
      <strong>${args.invoiceNumber}</strong>, jointe à ce message au format PDF.</p>
      <p>Cordialement,<br/>${args.issuerName}</p>`,
    attachments: pdf
      ? [{ filename: `${noun}-${args.invoiceNumber}.pdf`, content: pdf }]
      : undefined,
  })

  return error ? { sent: false, reason: error.message } : { sent: true }
}
