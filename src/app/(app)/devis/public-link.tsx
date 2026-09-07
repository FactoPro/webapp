'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export function PublicLink({ token }: { token: string }) {
  async function copy() {
    const url = `${window.location.origin}/devis/public/${token}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien copié dans le presse-papiers.')
    } catch {
      toast.error('Copie impossible — sélectionnez le lien manuellement.')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="truncate rounded bg-background px-2 py-1 text-xs">
        /devis/public/{token}
      </code>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <Copy />
        Copier
      </Button>
    </div>
  )
}
