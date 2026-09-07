'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { markInvoiceSent } from './actions'

export function InvoiceStatusActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  if (status !== 'draft') return null

  function send() {
    startTransition(async () => {
      const result = await markInvoiceSent(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Facture finalisée et numérotée.')
      router.refresh()
    })
  }

  return (
    <Button type="button" size="sm" disabled={isPending} onClick={send}>
      {isPending ? 'Finalisation…' : 'Marquer comme envoyée'}
    </Button>
  )
}
