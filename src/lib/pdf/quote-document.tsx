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

export interface QuotePdfLine {
  label: string
  quantity: number
  unit: string
  unit_price: number
  vat_rate: number
}

export interface QuotePdfData {
  number: string | null
  title: string | null
  description: string | null
  valid_until: string | null
  notes: string | null
  items: QuotePdfLine[]
  subtotal: number
  discount_amount: number
  discount_label: string | null
  vat_amount: number
  total: number
  signature_name: string | null
  accepted_at: string | null
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
  }
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, color: '#1f2937', fontFamily: 'Helvetica', lineHeight: 1.4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo: { width: 90, maxHeight: 48, objectFit: 'contain', marginBottom: 6 },
  issuerName: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  muted: { color: '#6b7280' },
  docTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginBottom: 4 },
  quoteTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  section: { marginBottom: 14 },
  table: { borderTopWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 4,
  },
  th: { fontFamily: 'Helvetica-Bold', paddingVertical: 4 },
  cLabel: { flex: 1, paddingRight: 6 },
  cNum: { width: 60, textAlign: 'right' },
  cQty: { width: 55, textAlign: 'right' },
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end' },
  totals: { width: 265 },
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
  footer: { position: 'absolute', bottom: 32, left: 40, right: 40, fontSize: 7 },
  signatureBox: {
    marginTop: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
})

export function QuoteDocument({ data }: { data: QuotePdfData }) {
  const color = /^#[0-9a-fA-F]{6}$/.test(data.issuer.pdf_color) ? data.issuer.pdf_color : '#13283C'
  const calcLines: CalcLineItem[] = data.items.map((l) => ({
    quantity: l.quantity,
    unit_price: l.unit_price,
    vat_rate: l.vat_rate,
  }))
  const breakdown = vatBreakdown(calcLines, 'fixed', data.discount_amount)

  return (
    <Document title={`Devis ${data.number ?? ''}`.trim()}>
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
            <Text style={[styles.docTitle, { color }]}>DEVIS {data.number ?? ''}</Text>
            {data.valid_until ? (
              <Text style={[styles.muted, { textAlign: 'right' }]}>
                Valable jusqu&apos;au {fmtDate(data.valid_until)}
              </Text>
            ) : null}
          </View>
        </View>

        {data.title ? <Text style={styles.quoteTitle}>{data.title}</Text> : null}
        {data.description ? (
          <Text style={[styles.section, styles.muted]}>{data.description}</Text>
        ) : null}

        <View style={styles.table}>
          <View style={[styles.tr, { borderBottomWidth: 1 }]}>
            <Text style={[styles.cLabel, styles.th, { color }]}>Prestation</Text>
            <Text style={[styles.cQty, styles.th, { color }]}>Qté</Text>
            <Text style={[styles.cNum, styles.th, { color }]}>P.U. HT</Text>
            <Text style={[styles.cNum, styles.th, { color }]}>TVA</Text>
            <Text style={[styles.cNum, styles.th, { color }]}>Total HT</Text>
          </View>
          {data.items.map((l, i) => (
            <View key={i} style={styles.tr}>
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
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total HT</Text>
              <Text>{currency.format(data.subtotal)}</Text>
            </View>
            {data.discount_amount > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Remise{data.discount_label ? ` — ${data.discount_label}` : ''}
                </Text>
                <Text>- {currency.format(data.discount_amount)}</Text>
              </View>
            ) : null}
            {breakdown.map((b) => (
              <View key={b.rate} style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  TVA {b.rate} % (sur {currency.format(b.base)})
                </Text>
                <Text>{currency.format(b.vat)}</Text>
              </View>
            ))}
            <View style={[styles.grandTotal, { color }]}>
              <Text>Total TTC</Text>
              <Text>{currency.format(data.total)}</Text>
            </View>
          </View>
        </View>

        {data.notes ? <Text style={[styles.section, styles.muted]}>{data.notes}</Text> : null}

        {data.signature_name ? (
          <View style={styles.signatureBox}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Devis accepté</Text>
            <Text style={styles.muted}>
              Signé électroniquement par {data.signature_name}
              {data.accepted_at ? ` le ${fmtDate(data.accepted_at)}` : ''}.
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          {data.issuer.iban || data.issuer.bic ? (
            <Text style={styles.muted}>
              {data.issuer.iban ? `IBAN ${data.issuer.iban}` : ''}
              {data.issuer.iban && data.issuer.bic ? ' · ' : ''}
              {data.issuer.bic ? `BIC ${data.issuer.bic}` : ''}
            </Text>
          ) : null}
          {data.issuer.legal_mentions ? (
            <Text style={styles.muted}>{data.issuer.legal_mentions}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  )
}
