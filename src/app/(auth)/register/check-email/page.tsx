import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vérifiez votre boîte mail</CardTitle>
        <CardDescription>
          Un lien de confirmation vient de vous être envoyé. Cliquez dessus pour activer votre
          compte, puis connectez-vous.
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
