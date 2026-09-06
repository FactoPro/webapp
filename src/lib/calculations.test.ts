import { describe, expect, it } from 'vitest'

import { type CalcLineItem, computeTotals, vatBreakdown } from './calculations'

const line = (quantity: number, unit_price: number, vat_rate: number): CalcLineItem => ({
  quantity,
  unit_price,
  vat_rate,
})

describe('computeTotals', () => {
  it('devis vide → tout à zéro', () => {
    expect(computeTotals([], null, null)).toEqual({
      subtotal: 0,
      discountAmount: 0,
      vatAmount: 0,
      total: 0,
    })
  })

  it('une ligne, TVA 20 %, sans remise', () => {
    expect(computeTotals([line(2, 100, 20)], null, null)).toEqual({
      subtotal: 200,
      discountAmount: 0,
      vatAmount: 40,
      total: 240,
    })
  })

  it('TVA mixte 10 % / 20 % sans remise', () => {
    const items = [line(1, 1000, 20), line(1, 500, 10)]
    expect(computeTotals(items, null, null)).toEqual({
      subtotal: 1500,
      discountAmount: 0,
      vatAmount: 250, // 1000*0.20 + 500*0.10
      total: 1750,
    })
  })

  it('TVA mixte avec remise 10 % appliquée au prorata', () => {
    const items = [line(1, 1000, 20), line(1, 500, 10)]
    // ratio = (1500 - 150) / 1500 = 0.9
    // vat = 1000*0.9*0.20 + 500*0.9*0.10 = 180 + 45 = 225
    expect(computeTotals(items, 'percent', 10)).toEqual({
      subtotal: 1500,
      discountAmount: 150,
      vatAmount: 225,
      total: 1575, // (1500 - 150) + 225
    })
  })

  it('remise fixe supérieure au sous-total → bornée au sous-total (remise 100 %)', () => {
    const items = [line(1, 1000, 20), line(1, 500, 10)]
    expect(computeTotals(items, 'fixed', 99999)).toEqual({
      subtotal: 1500,
      discountAmount: 1500,
      vatAmount: 0, // ratio = 0
      total: 0,
    })
  })

  it('remise 100 % en pourcentage → TVA nulle', () => {
    expect(computeTotals([line(3, 80, 20)], 'percent', 100)).toEqual({
      subtotal: 240,
      discountAmount: 240,
      vatAmount: 0,
      total: 0,
    })
  })

  it('remise négative ignorée (bornée à 0)', () => {
    expect(computeTotals([line(1, 100, 20)], 'fixed', -50)).toMatchObject({
      discountAmount: 0,
      total: 120,
    })
  })

  it('arrondi ROUND_HALF_UP à 2 décimales', () => {
    // 1 × 10,125 × 0,20 = 2,025 → 2,03 (half-up, pas half-even)
    expect(computeTotals([line(1, 10.125, 20)], null, null)).toEqual({
      subtotal: 10.13, // 10,125 → 10,13
      discountAmount: 0,
      vatAmount: 2.03,
      total: 12.15, // (10,125) + 2,025 = 12,15
    })
  })

  it('quantités décimales (m², heures…)', () => {
    // 12,5 m² × 45,90 = 573,75 HT ; TVA 10 % = 57,375 → 57,38
    expect(computeTotals([line(12.5, 45.9, 10)], null, null)).toEqual({
      subtotal: 573.75,
      discountAmount: 0,
      vatAmount: 57.38,
      total: 631.13, // 573,75 + 57,375 = 631,125 → 631,13
    })
  })

  it('accepte des valeurs sous forme de chaîne', () => {
    const items = [{ quantity: '2', unit_price: '100', vat_rate: '20' }]
    expect(computeTotals(items, 'percent', '25')).toMatchObject({
      subtotal: 200,
      discountAmount: 50,
      total: 180, // 150 + 150*0.20
    })
  })
})

describe('vatBreakdown', () => {
  it('regroupe et trie par taux', () => {
    const items = [line(1, 1000, 20), line(1, 500, 10), line(1, 200, 20)]
    expect(vatBreakdown(items, null, null)).toEqual([
      { rate: 10, base: 500, vat: 50 },
      { rate: 20, base: 1200, vat: 240 },
    ])
  })

  it('applique la remise au prorata sur chaque base', () => {
    const items = [line(1, 1000, 20), line(1, 500, 10)]
    // ratio 0.9 → bases 900 / 450
    expect(vatBreakdown(items, 'percent', 10)).toEqual([
      { rate: 10, base: 450, vat: 45 },
      { rate: 20, base: 900, vat: 180 },
    ])
  })

  it('devis vide → liste vide', () => {
    expect(vatBreakdown([], null, null)).toEqual([])
  })

  it('remise 100 % → bases et TVA nulles', () => {
    expect(vatBreakdown([line(1, 1000, 20)], 'percent', 100)).toEqual([
      { rate: 20, base: 0, vat: 0 },
    ])
  })
})
