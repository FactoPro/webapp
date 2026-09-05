import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="font-heading text-lg font-semibold">Lien invalide ou expiré</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ce lien a déjà été utilisé ou n&apos;est plus valide. Relancez l&apos;opération depuis la
        page de connexion.
      </p>
      <Link href="/login" className="text-sm text-foreground underline underline-offset-4">
        Retour à la connexion
      </Link>
    </div>
  )
}
