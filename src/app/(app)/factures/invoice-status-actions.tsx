'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { markInvoiceSent, regenerateInvoicePdf } from './actions'

interface Props {
  id: string
  status: string
  pdfUrl: string | null
}

export function InvoiceStatusActions({ id, status, pdfUrl }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error ?? 'Échec.')
        return
      }
      toast.success(success)
      router.refresh()
    })
  }

  if (status === 'draft') {
    return (
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={() => run(() => markInvoiceSent(id), 'Facture finalisée et numérotée.')}
      >
        {isPending ? 'Finalisation…' : 'Marquer comme envoyée'}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {pdfUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              Télécharger le PDF
            </a>
          }
        />
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => run(() => regenerateInvoicePdf(id), 'PDF régénéré.')}
      >
        {isPending ? 'Génération…' : 'Régénérer le PDF'}
      </Button>
    </div>
  )
}
