import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function ClientNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div>
        <h1 className="font-heading text-lg font-semibold">Client introuvable</h1>
        <p className="text-sm text-muted-foreground">
          Ce client n&apos;existe pas ou ne vous appartient pas.
        </p>
      </div>
      <Button render={<Link href="/clients" />}>Retour aux clients</Button>
    </div>
  )
}
