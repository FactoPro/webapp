export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'refused', 'expired'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
  expired: 'Expiré',
}

export const QUOTE_STATUS_VARIANTS: Record<QuoteStatus, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  sent: 'default',
  accepted: 'default',
  refused: 'destructive',
  expired: 'secondary',
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function normalize(status: string): QuoteStatus {
  return (QUOTE_STATUSES as readonly string[]).includes(status) ? (status as QuoteStatus) : 'draft'
}

/**
 * Statut « effectif » pour l'affichage : un devis encore `sent` dont la date de
 * validité est dépassée est présenté comme `expired`. La bascule réelle en base
 * est faite par le cron (FAC-34).
 */
export function effectiveStatus(status: string, validUntil: string | null): QuoteStatus {
  const s = normalize(status)
  if (s === 'sent' && validUntil && validUntil < today()) return 'expired'
  return s
}

/** L'éditeur n'autorise la modification que tant que le devis est un brouillon. */
export function isEditable(status: string): boolean {
  return normalize(status) === 'draft'
}

/**
 * Transitions déclenchables depuis l'interface artisan.
 * `accepted` / `refused` ne s'obtiennent que par la page publique (FAC-26).
 */
export const ARTISAN_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['draft'],
  expired: ['draft'],
  accepted: [],
  refused: [],
}

export function canTransition(from: string, to: QuoteStatus): boolean {
  return (ARTISAN_TRANSITIONS[normalize(from)] ?? []).includes(to)
}
