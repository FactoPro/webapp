'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { acceptPublicQuote, refusePublicQuote } from './actions'

export function AcceptRefuseForm({ token }: { token: string }) {
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [agreed, setAgreed] = React.useState(false)
  const [confirmRefuse, setConfirmRefuse] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  function accept() {
    startTransition(async () => {
      const result = await acceptPublicQuote(token, name)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Devis accepté. Merci !')
      router.refresh()
    })
  }

  function refuse() {
    startTransition(async () => {
      const result = await refusePublicQuote(token)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Devis refusé.')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="grid gap-2">
        <label htmlFor="signature" className="text-sm font-medium">
          Votre nom (signature électronique)
        </label>
        <Input
          id="signature"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prénom Nom"
          autoComplete="name"
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          J&apos;accepte ce devis et je reconnais que cette signature électronique vaut engagement.
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={accept}
          disabled={isPending || !agreed || name.trim().length < 2}
        >
          {isPending ? 'Envoi…' : 'Accepter le devis'}
        </Button>
        {confirmRefuse ? (
          <>
            <Button type="button" variant="destructive" onClick={refuse} disabled={isPending}>
              Confirmer le refus
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmRefuse(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmRefuse(true)}
            disabled={isPending}
          >
            Refuser
          </Button>
        )}
      </div>
    </div>
  )
}
