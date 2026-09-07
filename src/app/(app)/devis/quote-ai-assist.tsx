'use client'

import { Sparkles } from 'lucide-react'
import * as React from 'react'
import { useFormContext } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { QuoteInput } from '@/lib/validations/quote'

import { generateQuoteFromText, suggestQuoteItems } from './ai-actions'

export function QuoteAiAssist() {
  const form = useFormContext<QuoteInput>()
  const [prompt, setPrompt] = React.useState('')
  const [pending, setPending] = React.useState<null | 'generate' | 'suggest'>(null)

  async function generate() {
    setPending('generate')
    const res = await generateQuoteFromText(prompt)
    setPending(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    form.reset({
      ...form.getValues(),
      title: res.title,
      items: res.items,
      notes: res.notes ?? form.getValues('notes'),
    })
    toast.success('Devis généré — relisez et ajustez les lignes avant validation.')
  }

  async function suggest() {
    const items = form.getValues('items').filter((i) => i.label.trim())
    if (items.length === 0) {
      toast.error('Ajoutez au moins une ligne au devis.')
      return
    }
    const context = [
      form.getValues('title'),
      ...items.map((i) => `- ${i.label} (${i.quantity} ${i.unit}, ${i.unit_price} € HT)`),
    ]
      .filter(Boolean)
      .join('\n')

    setPending('suggest')
    const res = await suggestQuoteItems(context)
    setPending(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    form.reset({
      ...form.getValues(),
      items: [...form.getValues('items'), ...res.items],
    })
    toast.success(
      `${res.items.length} ligne${res.items.length > 1 ? 's' : ''} ajoutée${res.items.length > 1 ? 's' : ''}.`
    )
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Assistant IA
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Décrivez les travaux comme sur le chantier, l&apos;IA structure le devis pour vous.
        </p>
        <Textarea
          rows={3}
          placeholder={'Ex. « pose carrelage salle de bain 25 m², fourniture comprise »'}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending !== null || prompt.trim().length < 3}
            onClick={generate}
          >
            {pending === 'generate' ? 'Génération…' : 'Générer le devis'}
          </Button>
          <Button type="button" variant="outline" disabled={pending !== null} onClick={suggest}>
            {pending === 'suggest' ? 'Analyse…' : 'Suggérer des oublis'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
