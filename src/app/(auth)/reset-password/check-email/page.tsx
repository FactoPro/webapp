import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetCheckEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vérifiez votre boîte mail</CardTitle>
        <CardDescription>
          Si un compte est associé à cette adresse, un lien de réinitialisation vient d&apos;être
          envoyé. Il expire au bout d&apos;une heure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login" className="text-sm text-foreground underline underline-offset-4">
          Retour à la connexion
        </Link>
      </CardContent>
    </Card>
  )
}
