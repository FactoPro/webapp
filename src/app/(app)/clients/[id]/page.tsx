import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/lib/server'
import { CLIENT_TYPE_LABELS } from '@/lib/validations/client'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('clients').select('name').eq('id', id).maybeSingle()
  return { title: data ? `${data.name} · FactoPro` : 'Client · FactoPro' }
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
  expired: 'Expiré',
  paid: 'Payée',
  partial: 'Partielle',
  overdue: 'En retard',
  cancelled: 'Annulée',
  active: 'En cours',
  completed: 'Terminé',
  on_hold: 'En pause',
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant="secondary">{STATUS_LABELS[status] ?? status}</Badge>
}

interface HistoryRow {
  id: string
  href: string
  number: string | null
  title: string | null
  status: string
  date: string | null
  total: number | null
}

function HistorySection({
  title,
  emptyLabel,
  rows,
  dateHeader,
}: {
  title: string
  emptyLabel: string
  rows: HistoryRow[]
  dateHeader: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-muted-foreground">({rows.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>{dateHeader}</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={row.href}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {row.number ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-52 truncate">{row.title ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>{formatDate(row.date)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
  if (!client) notFound()

  const [{ data: quotes }, { data: invoices }, { data: projects }] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, number, title, status, total, created_at')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, number, title, status, total, due_date, created_at')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name, status, budget, start_date, created_at')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
  ])

  const contactLines = [
    client.company_name,
    client.email,
    client.phone,
    client.address,
    client.siret ? `SIRET ${client.siret}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Link href="/clients" className="text-sm text-muted-foreground hover:text-foreground">
          ← Clients
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-xl font-semibold">{client.name}</h1>
          <Badge variant={client.type === 'company' ? 'default' : 'secondary'}>
            {CLIENT_TYPE_LABELS[client.type as keyof typeof CLIENT_TYPE_LABELS] ?? client.type}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
        </CardHeader>
        <CardContent>
          {contactLines.length ? (
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {contactLines.map((line) => (
                <li key={line} className="text-muted-foreground">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune coordonnée renseignée.</p>
          )}
        </CardContent>
      </Card>

      <HistorySection
        title="Devis"
        emptyLabel="Aucun devis pour ce client."
        dateHeader="Créé le"
        rows={(quotes ?? []).map((q) => ({
          id: q.id,
          href: `/devis/${q.id}`,
          number: q.number,
          title: q.title,
          status: q.status,
          date: q.created_at,
          total: q.total,
        }))}
      />

      <HistorySection
        title="Factures"
        emptyLabel="Aucune facture pour ce client."
        dateHeader="Échéance"
        rows={(invoices ?? []).map((inv) => ({
          id: inv.id,
          href: `/factures/${inv.id}`,
          number: inv.number,
          title: inv.title,
          status: inv.status,
          date: inv.due_date,
          total: inv.total,
        }))}
      />

      <HistorySection
        title="Chantiers"
        emptyLabel="Aucun chantier pour ce client."
        dateHeader="Début"
        rows={(projects ?? []).map((p) => ({
          id: p.id,
          href: `/chantiers/${p.id}`,
          number: p.name,
          title: null,
          status: p.status,
          date: p.start_date,
          total: p.budget,
        }))}
      />
    </div>
  )
}
