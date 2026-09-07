export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'partial',
  'overdue',
  'paid',
  'cancelled',
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  partial: 'Acompte réglé',
  overdue: 'En retard',
  paid: 'Payée',
  cancelled: 'Annulée',
}

export const INVOICE_STATUS_VARIANTS: Record<
  InvoiceStatus,
  'default' | 'secondary' | 'destructive'
> = {
  draft: 'secondary',
  sent: 'default',
  partial: 'default',
  overdue: 'destructive',
  paid: 'default',
  cancelled: 'secondary',
}

export const INVOICE_KINDS = ['invoice', 'deposit', 'credit_note'] as const
export type InvoiceKind = (typeof INVOICE_KINDS)[number]

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  invoice: 'Facture',
  deposit: 'Acompte',
  credit_note: 'Avoir',
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function normalize(status: string): InvoiceStatus {
  return (INVOICE_STATUSES as readonly string[]).includes(status)
    ? (status as InvoiceStatus)
    : 'draft'
}

/**
 * Statut « effectif » pour l'affichage : une facture `sent` ou `partial` dont
 * l'échéance est dépassée est présentée comme `overdue`. La bascule réelle en
 * base est faite par le cron (FAC-35).
 */
export function effectiveInvoiceStatus(status: string, dueDate: string | null): InvoiceStatus {
  const s = normalize(status)
  if ((s === 'sent' || s === 'partial') && dueDate && dueDate < today()) return 'overdue'
  return s
}
