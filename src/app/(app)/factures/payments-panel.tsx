'use client'

import { Trash2 } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate } from '@/lib/format'
import { PAYMENT_METHODS } from '@/lib/validations/payment'

import { deletePayment, recordPayment } from './actions'

export interface PaymentRow {
  id: string
  amount: number
  payment_method: string | null
  paid_at: string
  notes: string | null
}

interface Props {
  invoiceId: string
  status: string
  remaining: number
  payments: PaymentRow[]
}

export function PaymentsPanel({ invoiceId, status, remaining, payments }: Props) {
  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState('')
  const [method, setMethod] = React.useState('Virement')
  const [notes, setNotes] = React.useState('')
  const [isPending, startTransition] = React.useTransition()

  const settled = status === 'paid'
  const canPay = !settled && status !== 'draft' && status !== 'cancelled'

  function submit() {
    startTransition(async () => {
      const result = await recordPayment(invoiceId, {
        amount: amount.trim(),
        payment_method: method,
        notes: notes.trim(),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Paiement enregistré.')
      setOpen(false)
      setAmount('')
      setNotes('')
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deletePayment(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Paiement annulé.')
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold">Paiements</h2>
        {canPay && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button type="button" size="sm" />}>
              Enregistrer un paiement
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enregistrer un paiement</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    Montant (€) — vide = solde ({formatCurrency(remaining)})
                  </span>
                  <Input
                    inputMode="decimal"
                    placeholder={remaining.toFixed(2)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Mode de règlement</span>
                  <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Note (facultatif)</span>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button type="button" onClick={submit} disabled={isPending}>
                  {isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {settled ? 'Facture soldée.' : 'Aucun paiement enregistré.'}
        </p>
      ) : (
        <ul className="divide-y text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · {formatDate(p.paid_at)}
                  {p.payment_method ? ` · ${p.payment_method}` : ''}
                </span>
                {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Annuler ce paiement"
                className="text-muted-foreground"
                disabled={isPending}
                onClick={() => remove(p.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
