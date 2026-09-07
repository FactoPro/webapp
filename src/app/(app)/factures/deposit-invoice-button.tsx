'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import { createDepositInvoice } from './actions'

export function DepositInvoiceButton({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [percent, setPercent] = React.useState('30')
  const [isPending, startTransition] = React.useTransition()

  function submit() {
    startTransition(async () => {
      const result = await createDepositInvoice(quoteId, percent)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Facture d’acompte créée (brouillon).')
      setOpen(false)
      router.push(`/factures/${result.id}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        Facture d&apos;acompte
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Facture d&apos;acompte</DialogTitle>
          <DialogDescription>
            Génère une facture d&apos;acompte (pourcentage du devis), à déduire de la facture
            finale.
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Pourcentage du devis (%)</span>
          <Input inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
        </label>
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
            {isPending ? 'Création…' : 'Créer l’acompte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
