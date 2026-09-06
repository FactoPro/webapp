import Decimal from 'decimal.js'

// Arrondi commercial : 2 décimales, ROUND_HALF_UP (0,005 → 0,01).
Decimal.set({ rounding: Decimal.ROUND_HALF_UP })

export type DiscountKind = 'percent' | 'fixed'

/** Ligne de devis/facture — seuls les champs nécessaires aux calculs. */
export interface CalcLineItem {
  quantity: number | string
  unit_price: number | string
  vat_rate: number | string
}

export interface Totals {
  subtotal: number
  discountAmount: number
  vatAmount: number
  total: number
}

export interface VatBreakdownRow {
  rate: number
  base: number
  vat: number
}

function round2(value: Decimal): number {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
}

function lineTotalHT(item: CalcLineItem): Decimal {
  return new Decimal(item.quantity || 0).times(item.unit_price || 0)
}

/** Montant de remise brut (non arrondi), borné à [0, subtotal]. */
function rawDiscount(
  subtotal: Decimal,
  discountKind: DiscountKind | null | undefined,
  discountValue: number | string | null | undefined
): Decimal {
  if (!discountKind || !discountValue) return new Decimal(0)
  const value = new Decimal(discountValue)
  const amount = discountKind === 'percent' ? subtotal.times(value).dividedBy(100) : value
  return Decimal.max(0, Decimal.min(amount, subtotal))
}

/** Ratio (net après remise / brut) appliqué au prorata à chaque ligne. */
function discountRatio(subtotal: Decimal, discount: Decimal): Decimal {
  if (subtotal.isZero()) return new Decimal(0)
  return subtotal.minus(discount).dividedBy(subtotal)
}

/**
 * Port TypeScript de `backend/app/services/calculations.py::compute_totals`.
 *
 * - subtotal   = Σ(quantité × prix unitaire HT)
 * - discount   = subtotal × valeur/100 (percent) ou valeur fixe, borné à [0, subtotal]
 * - ratio      = (subtotal − discount) / subtotal  (0 si subtotal = 0)
 * - vat        = Σ ligne (quantité × PU × ratio × taux/100)
 * - total      = (subtotal − discount) + vat
 * Résultats arrondis à 2 décimales, ROUND_HALF_UP.
 */
export function computeTotals(
  items: CalcLineItem[],
  discountKind: DiscountKind | null | undefined,
  discountValue: number | string | null | undefined
): Totals {
  const subtotal = items.reduce((acc, item) => acc.plus(lineTotalHT(item)), new Decimal(0))
  const discount = rawDiscount(subtotal, discountKind, discountValue)
  const ratio = discountRatio(subtotal, discount)

  const vat = items.reduce(
    (acc, item) =>
      acc.plus(
        lineTotalHT(item)
          .times(ratio)
          .times(new Decimal(item.vat_rate || 0).dividedBy(100))
      ),
    new Decimal(0)
  )

  const total = subtotal.minus(discount).plus(vat)

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discount),
    vatAmount: round2(vat),
    total: round2(total),
  }
}

/**
 * Port TypeScript de `backend/app/services/calculations.py::vat_breakdown`.
 * Regroupe les lignes par taux de TVA après remise au prorata.
 * Renvoie une liste `{ rate, base, vat }` triée par taux croissant.
 */
export function vatBreakdown(
  items: CalcLineItem[],
  discountKind: DiscountKind | null | undefined,
  discountValue: number | string | null | undefined
): VatBreakdownRow[] {
  const subtotal = items.reduce((acc, item) => acc.plus(lineTotalHT(item)), new Decimal(0))
  const discount = rawDiscount(subtotal, discountKind, discountValue)
  const ratio = discountRatio(subtotal, discount)

  const byRate = new Map<string, { rate: Decimal; base: Decimal }>()
  for (const item of items) {
    const rate = new Decimal(item.vat_rate || 0)
    const key = rate.toString()
    const base = lineTotalHT(item).times(ratio)
    const existing = byRate.get(key)
    if (existing) existing.base = existing.base.plus(base)
    else byRate.set(key, { rate, base })
  }

  return [...byRate.values()]
    .sort((a, b) => a.rate.comparedTo(b.rate))
    .map(({ rate, base }) => ({
      rate: rate.toNumber(),
      base: round2(base),
      vat: round2(base.times(rate).dividedBy(100)),
    }))
}
