import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { type CalcLineItem, vatBreakdown } from '@/lib/calculations'

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

// Helvetica (police PDF par défaut) n'a pas l'espace fine insécable (U+202F)
// utilisée par Intl comme séparateur de milliers → on la remplace par un espace normal.
const currency = { format: (n: number) => eur.format(n).replace(/[\u202f\u00a0]/g, ' ') }

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d).replace(/[\u202f\u00a0]/g, ' ')
}

export interface InvoicePdfLine {
  label: string
  quantity: number
  unit: string
  unit_price: number
  vat_rate: number
}

export interface InvoicePdfData {
  number: string | null
  kind: string
  title: string | null
  notes: string | null
  status: string
  created_at: string
  due_date: string | null
  paid_at: string | null
  payment_method: string | null
  items: InvoicePdfLine[]
  subtotal: number
  discount_amount: number
  discount_label: string | null
  vat_amount: number
  total: number
  amount_paid: number
  deposit_deducted: number
  deposit_reference: string | null
  client: {
    name: string | null
    company_name: string | null
    siret: string | null
    address: string | null
    email: string | null
  } | null
  issuer: {
    name: string | null
    address: string | null
    siret: string | null
    vat_number: string | null
    iban: string | null
    bic: string | null
    logo_url: string | null
    legal_mentions: string | null
    pdf_color: string
    payment_terms: number
  }
}

/**
 * Mentions légales obligatoires sur les factures (art. L441-10 du Code de
 * commerce), + mentions perso de l'artisan, conditions de règlement, IBAN/BIC,
 * et l'art. 293 B du CGI si l'artisan n'est pas assujetti à la TVA.
 * Reproduit `_default_legal_mentions` + le pied de `invoice.html` de l'ancien backend.
 */
export function invoiceLegalText(data: InvoicePdfData): string {
  const i = data.issuer
  const parts = [
    "En cas de retard de paiement, pénalités égales à 3 fois le taux d'intérêt légal et " +
      'indemnité forfaitaire de recouvrement de 40 € (art. L441-10 du Code de commerce).',
    "Pas d'escompte pour règlement anticipé.",
  ]
  if (i.legal_mentions) parts.push(i.legal_mentions)
  parts.push(
    `Paiement à ${i.payment_terms} jours` +
      (data.payment_method ? ` — mode de règlement : ${data.payment_method}` : '') +
      '.'
  )
  if (i.iban) parts.push(`IBAN : ${i.iban}` + (i.bic ? ` — BIC : ${i.bic}` : '') + '.')
  if (!i.vat_number) parts.push('TVA non applicable, art. 293 B du CGI.')
  return parts.join(' ')
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, color: '#1f2937', fontFamily: 'Helvetica', lineHeight: 1.4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  logo: { width: 90, maxHeight: 48, objectFit: 'contain', marginBottom: 6 },
  issuerName: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  muted: { color: '#6b7280' },
  docTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginBottom: 4 },
  clientBox: {
    marginBottom: 14,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  docTitleLine: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  section: { marginBottom: 12 },
  table: { borderTopWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 4 },
  th: { fontFamily: 'Helvetica-Bold', paddingVertical: 4 },
  cLabel: { flex: 1, paddingRight: 6 },
  cNum: { width: 60, textAlign: 'right' },
  cQty: { width: 55, textAlign: 'right' },
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end' },
  totals: { width: 275 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  totalLabel: { flex: 1, paddingRight: 6, color: '#6b7280' },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    paddingTop: 4,
    marginTop: 2,
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  paidBanner: {
    marginTop: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 4,
    color: '#15803d',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  footer: { position: 'absolute', bottom: 28, left: 40, right: 40, fontSize: 7, color: '#6b7280' },
})

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const color = /^#[0-9a-fA-F]{6}$/.test(data.issuer.pdf_color) ? data.issuer.pdf_color : '#13283C'
  const isCredit = data.kind === 'credit_note'
  const heading = isCredit ? 'AVOIR' : 'FACTURE'

  const calcLines: CalcLineItem[] = data.items.map((l) => ({
    quantity: l.quantity,
    unit_price: l.unit_price,
    vat_rate: l.vat_rate,
  }))
  const breakdown = vatBreakdown(calcLines, 'fixed', data.discount_amount)
  const totalHt = data.subtotal - data.discount_amount
  const alreadyPaid = data.amount_paid - data.deposit_deducted
  const remaining = data.total - data.amount_paid

  return (
    <Document title={`${heading} ${data.number ?? ''}`.trim()}>
      <Page size="A4" style={styles.page}>
        <View style={[styles.headerRow, { borderTopWidth: 3, borderColor: color, paddingTop: 12 }]}>
          <View>
            {data.issuer.logo_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- <Image> react-pdf, pas un <img> HTML
              <Image src={data.issuer.logo_url} style={styles.logo} />
            ) : null}
            <Text style={[styles.issuerName, { color }]}>
              {data.issuer.name || 'Votre entreprise'}
            </Text>
            {data.issuer.address ? <Text style={styles.muted}>{data.issuer.address}</Text> : null}
            {data.issuer.siret ? <Text style={styles.muted}>SIRET {data.issuer.siret}</Text> : null}
            {data.issuer.vat_number ? (
              <Text style={styles.muted}>TVA {data.issuer.vat_number}</Text>
            ) : null}
          </View>
          <View>
            <Text style={[styles.docTitle, { color }]}>
              {heading} {data.number ?? '(brouillon)'}
            </Text>
            <Text style={[styles.muted, { textAlign: 'right' }]}>
              Date : {fmtDate(data.created_at)}
            </Text>
            {data.due_date ? (
              <Text style={[styles.muted, { textAlign: 'right' }]}>
                Échéance : {fmtDate(data.due_date)}
              </Text>
            ) : null}
          </View>
        </View>

        {data.client ? (
          <View style={styles.clientBox}>
            <Text style={styles.muted}>Client</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>
              {data.client.name || '—'}
              {data.client.company_name ? ` — ${data.client.company_name}` : ''}
            </Text>
            {data.client.address ? <Text>{data.client.address}</Text> : null}
            {data.client.siret ? <Text>SIRET : {data.client.siret}</Text> : null}
            {data.client.email ? <Text>{data.client.email}</Text> : null}
          </View>
        ) : null}

        {data.title ? <Text style={styles.docTitleLine}>{data.title}</Text> : null}

        <View style={styles.table}>
          <View style={[styles.tr, { borderBottomWidth: 1 }]}>
            <Text style={[styles.cLabel, styles.th, { color }]}>Désignation</Text>
            <Text style={[styles.cQty, styles.th, { color }]}>Qté</Text>
            <Text style={[styles.cNum, styles.th, { color }]}>P.U. HT</Text>
            <Text style={[styles.cNum, styles.th, { color }]}>TVA</Text>
            <Text style={[styles.cNum, styles.th, { color }]}>Total HT</Text>
          </View>
          {data.items.map((l, idx) => (
            <View key={idx} style={styles.tr}>
              <Text style={styles.cLabel}>{l.label}</Text>
              <Text style={styles.cQty}>
                {l.quantity} {l.unit}
              </Text>
              <Text style={styles.cNum}>{currency.format(l.unit_price)}</Text>
              <Text style={styles.cNum}>{l.vat_rate} %</Text>
              <Text style={styles.cNum}>{currency.format(l.quantity * l.unit_price)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totals}>
            {data.discount_amount > 0 ? (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Sous-total HT</Text>
                  <Text>{currency.format(data.subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Remise{data.discount_label ? ` — ${data.discount_label}` : ''}
                  </Text>
                  <Text>- {currency.format(data.discount_amount)}</Text>
                </View>
              </>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total HT</Text>
              <Text>{currency.format(totalHt)}</Text>
            </View>
            {breakdown.map((b) => (
              <View key={b.rate} style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  TVA {b.rate} % (sur {currency.format(b.base)})
                </Text>
                <Text>{currency.format(b.vat)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total à payer TTC</Text>
              <Text>{currency.format(data.total)}</Text>
            </View>
            {data.deposit_deducted > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Acompte(s) déduit(s)
                  {data.deposit_reference ? ` — réf. ${data.deposit_reference}` : ''}
                </Text>
                <Text>- {currency.format(data.deposit_deducted)}</Text>
              </View>
            ) : null}
            {alreadyPaid > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Déjà réglé</Text>
                <Text>- {currency.format(alreadyPaid)}</Text>
              </View>
            ) : null}
            <View style={[styles.grandTotal, { color }]}>
              <Text>{isCredit ? 'Net' : 'Net à payer'}</Text>
              <Text>{currency.format(remaining)}</Text>
            </View>
          </View>
        </View>

        {data.status === 'paid' ? (
          <Text style={styles.paidBanner}>
            FACTURE SOLDÉE{data.paid_at ? ` — payée le ${fmtDate(data.paid_at)}` : ''}
          </Text>
        ) : null}

        {data.notes ? <Text style={[styles.section, styles.muted]}>{data.notes}</Text> : null}

        <Text style={styles.footer}>{invoiceLegalText(data)}</Text>
      </Page>
    </Document>
  )
}
