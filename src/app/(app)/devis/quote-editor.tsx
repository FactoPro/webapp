'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { DiscountKind } from '@/lib/calculations'
import { type QuoteInput, quoteSchema } from '@/lib/validations/quote'
import type { Tables } from '@/types/database'

import { saveQuote } from './actions'
import { LineItemsEditor } from './line-items-editor'
import { QuoteTotals } from './quote-totals'

type Quote = Tables<'quotes'>
type Client = Pick<Tables<'clients'>, 'id' | 'name' | 'company_name'>
type CatalogItem = Pick<
  Tables<'catalog_items'>,
  'id' | 'label' | 'unit' | 'unit_price' | 'vat_rate' | 'category'
>
type Discount = Pick<Tables<'discounts'>, 'id' | 'label' | 'kind' | 'value'>

interface QuoteItem {
  label: string
  quantity: number
  unit: string
  unit_price: number
  vat_rate: number
  catalog_item_id: string | null
}

function plusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function toFormValues(quote: Quote | undefined): QuoteInput {
  if (!quote) {
    return {
      client_id: '',
      title: '',
      description: '',
      valid_until: plusDays(30),
      notes: '',
      items: [
        {
          label: '',
          quantity: '1',
          unit: 'u',
          unit_price: '',
          vat_rate: '20',
          catalog_item_id: null,
        },
      ],
      discount_mode: 'none',
      discount_preset_id: '',
      discount_kind: 'percent',
      discount_value: '',
      discount_label: '',
    }
  }
  const items = (Array.isArray(quote.items) ? (quote.items as unknown as QuoteItem[]) : []).map(
    (item) => ({
      label: item.label ?? '',
      quantity: String(item.quantity ?? ''),
      unit: (item.unit as QuoteInput['items'][number]['unit']) ?? 'u',
      unit_price: String(item.unit_price ?? ''),
      vat_rate: String(item.vat_rate ?? '20'),
      catalog_item_id: item.catalog_item_id ?? null,
    })
  )
  return {
    client_id: quote.client_id ?? '',
    title: quote.title ?? '',
    description: quote.description ?? '',
    valid_until: quote.valid_until ?? '',
    notes: quote.notes ?? '',
    items: items.length
      ? items
      : [
          {
            label: '',
            quantity: '1',
            unit: 'u',
            unit_price: '',
            vat_rate: '20',
            catalog_item_id: null,
          },
        ],
    discount_mode: quote.discount_kind ? 'custom' : 'none',
    discount_preset_id: '',
    discount_kind: quote.discount_kind === 'fixed' ? 'fixed' : 'percent',
    discount_value: quote.discount_value != null ? String(quote.discount_value) : '',
    discount_label: quote.discount_label ?? '',
  }
}

interface QuoteEditorProps {
  quote?: Quote
  clients: Client[]
  catalogItems: CatalogItem[]
  discounts: Discount[]
}

export function QuoteEditor({ quote, clients, catalogItems, discounts }: QuoteEditorProps) {
  const router = useRouter()
  const isEdit = Boolean(quote)
  const [isPending, startTransition] = React.useTransition()

  const form = useForm<QuoteInput>({
    resolver: zodResolver(quoteSchema),
    defaultValues: toFormValues(quote),
  })

  const watchedItems = useWatch({ control: form.control, name: 'items' }) ?? []
  const discountMode = useWatch({ control: form.control, name: 'discount_mode' })
  const discountPresetId = useWatch({ control: form.control, name: 'discount_preset_id' })
  const discountKind = useWatch({ control: form.control, name: 'discount_kind' })
  const discountValue = useWatch({ control: form.control, name: 'discount_value' })

  const preview: { kind: DiscountKind | null; value: number | string | null; label: string } =
    React.useMemo(() => {
      if (discountMode === 'preset') {
        const preset = discounts.find((d) => d.id === discountPresetId)
        return preset
          ? {
              kind: preset.kind === 'fixed' ? 'fixed' : 'percent',
              value: preset.value,
              label: preset.label,
            }
          : { kind: null, value: null, label: '' }
      }
      if (discountMode === 'custom') {
        return { kind: discountKind, value: discountValue || 0, label: 'Remise' }
      }
      return { kind: null, value: null, label: '' }
    }, [discountMode, discountPresetId, discountKind, discountValue, discounts])

  function onSubmit(values: QuoteInput) {
    startTransition(async () => {
      const result = await saveQuote(values, quote?.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(isEdit ? 'Devis enregistré.' : 'Devis créé.')
      if (isEdit) form.reset(values)
      else router.push(`/devis/${result.id}`)
    })
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start"
      >
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-heading text-xl font-semibold">
              {isEdit ? 'Modifier le devis' : 'Nouveau devis'}
            </h1>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled title="Bientôt disponible (FAC-21)">
                Générer avec l&apos;IA
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le devis'}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <NativeSelect {...field}>
                        <option value="">— Sélectionner —</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                            {client.company_name ? ` · ${client.company_name}` : ''}
                          </option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valable jusqu&apos;au</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Titre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Rénovation salle de bain" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prestations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <LineItemsEditor catalogItems={catalogItems} />
              {form.formState.errors.items?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Remise</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="discount_mode"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['none', 'Aucune'],
                          ['preset', 'Prédéfinie'],
                          ['custom', 'Libre'],
                        ] as const
                      ).map(([value, label]) => (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={field.value === value ? 'default' : 'outline'}
                          onClick={() => field.onChange(value)}
                          disabled={value === 'preset' && discounts.length === 0}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              {discountMode === 'preset' && (
                <FormField
                  control={form.control}
                  name="discount_preset_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remise prédéfinie</FormLabel>
                      <FormControl>
                        <NativeSelect {...field}>
                          <option value="">— Choisir —</option>
                          {discounts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.label} ({d.kind === 'fixed' ? `${d.value} €` : `${d.value} %`})
                            </option>
                          ))}
                        </NativeSelect>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {discountMode === 'custom' && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="discount_kind"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <NativeSelect {...field}>
                            <option value="percent">Pourcentage</option>
                            <option value="fixed">Montant fixe</option>
                          </NativeSelect>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discount_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {discountKind === 'fixed' ? 'Montant (€)' : 'Pourcentage'}
                        </FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discount_label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Libellé</FormLabel>
                        <FormControl>
                          <Input placeholder="Remise" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea rows={3} placeholder="Conditions, précisions…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:w-80">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Totaux</p>
          <QuoteTotals
            items={watchedItems.map((i) => ({
              quantity: i?.quantity ?? 0,
              unit_price: i?.unit_price ?? 0,
              vat_rate: i?.vat_rate ?? 0,
            }))}
            discountKind={preview.kind}
            discountValue={preview.value}
            discountLabel={preview.label}
          />
        </div>
      </form>
    </FormProvider>
  )
}
