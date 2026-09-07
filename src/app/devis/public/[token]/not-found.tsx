export default function PublicQuoteNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="font-heading text-lg font-semibold">Devis introuvable</h1>
      <p className="text-sm text-muted-foreground">
        Ce lien n&apos;est pas valide ou le devis n&apos;existe plus.
      </p>
    </div>
  )
}
