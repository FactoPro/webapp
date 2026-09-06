'use client'

import type { ProfileInput } from '@/lib/validations/profile'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** Aperçu statique d'un en-tête de devis, reflétant les réglages en temps réel. */
export function PdfPreview({ values }: { values: ProfileInput }) {
  const color = /^#[0-9a-fA-F]{6}$/.test(values.pdf_color) ? values.pdf_color : '#13283C'
  const identity = values.company_name || `${values.first_name} ${values.last_name}`.trim()
  const vatRate = Number(values.default_vat_rate.replace(',', '.')) || 0

  return (
    <div className="overflow-hidden rounded-lg border bg-white text-[11px] text-neutral-800 shadow-sm">
      <div
        className="flex items-start justify-between gap-4 p-4"
        style={{ borderTop: `4px solid ${color}` }}
      >
        <div className="flex items-center gap-3">
          {values.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu, logo distant
            <img src={values.logo_url} alt="" className="h-10 w-auto object-contain" />
          ) : null}
          <div>
            <p className="font-semibold" style={{ color }}>
              {identity || 'Votre entreprise'}
            </p>
            {values.address && (
              <p className="whitespace-pre-line text-neutral-500">{values.address}</p>
            )}
            {values.siret && <p className="text-neutral-500">SIRET {values.siret}</p>}
            {values.vat_number && <p className="text-neutral-500">TVA {values.vat_number}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color }}>
            DEVIS
          </p>
          <p className="text-neutral-500">Nº 2026-0001</p>
        </div>
      </div>

      <div className="px-4">
        <div
          className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b py-1 font-medium"
          style={{ color }}
        >
          <span>Prestation</span>
          <span className="text-right">Qté</span>
          <span className="text-right">P.U. HT</span>
          <span className="text-right">Total HT</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 py-1">
          <span>Exemple de prestation</span>
          <span className="text-right">1</span>
          <span className="text-right">{currency.format(100)}</span>
          <span className="text-right">{currency.format(100)}</span>
        </div>
      </div>

      <div className="flex justify-end px-4 py-2">
        <div className="w-40 space-y-0.5">
          <div className="flex justify-between">
            <span className="text-neutral-500">Total HT</span>
            <span>{currency.format(100)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">TVA {vatRate} %</span>
            <span>{currency.format(vatRate)}</span>
          </div>
          <div className="flex justify-between font-semibold" style={{ color }}>
            <span>Total TTC</span>
            <span>{currency.format(100 + vatRate)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1 border-t px-4 py-2 text-neutral-500">
        <p>Règlement à {values.payment_terms || '30'} jours.</p>
        {(values.iban || values.bic) && (
          <p>
            {values.iban && <>IBAN {values.iban} </>}
            {values.bic && <>· BIC {values.bic}</>}
          </p>
        )}
        {values.legal_mentions && <p className="whitespace-pre-line">{values.legal_mentions}</p>}
      </div>
    </div>
  )
}
