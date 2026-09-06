'use client'

import { Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { CATALOG_UNIT_LABELS, CATALOG_UNITS } from '@/lib/validations/catalog-item'
import { type LineItemInput, type QuoteInput, VAT_RATES } from '@/lib/validations/quote'

type CatalogItem = {
  id: string
  label: string
  unit: string
  unit_price: number
  vat_rate: number
  category: string | null
}

const emptyLine: LineItemInput = {
  label: '',
  quantity: '1',
  unit: 'u',
  unit_price: '',
  vat_rate: '20',
  catalog_item_id: null,
}

export function LineItemsEditor({ catalogItems }: { catalogItems: CatalogItem[] }) {
  const { control } = useFormContext<QuoteInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  function addFromCatalog(id: string) {
    const item = catalogItems.find((c) => c.id === id)
    if (!item) return
    append({
      label: item.label,
      quantity: '1',
      unit: (CATALOG_UNITS as readonly string[]).includes(item.unit)
        ? (item.unit as LineItemInput['unit'])
        : 'u',
      unit_price: String(item.unit_price),
      vat_rate: String(item.vat_rate),
      catalog_item_id: item.id,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FormLabel>Lignes</FormLabel>
        <div className="flex gap-2">
          {catalogItems.length > 0 && (
            <NativeSelect
              className="h-8 w-52"
              value=""
              onChange={(event) => {
                if (event.target.value) addFromCatalog(event.target.value)
                event.target.value = ''
              }}
            >
              <option value="">+ Depuis le catalogue…</option>
              {catalogItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </NativeSelect>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine)}>
            + Ligne
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_5rem_7rem_7rem_6rem_auto] sm:items-start"
          >
            <FormField
              control={control}
              name={`items.${index}.label`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground sm:hidden">Libellé</FormLabel>
                  <FormControl>
                    <Input placeholder="Prestation" {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.quantity`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground sm:hidden">Qté</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="Qté" {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.unit`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground sm:hidden">Unité</FormLabel>
                  <FormControl>
                    <NativeSelect {...f}>
                      {CATALOG_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {CATALOG_UNIT_LABELS[unit]}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.unit_price`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground sm:hidden">PU HT</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="PU HT" {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.vat_rate`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground sm:hidden">TVA %</FormLabel>
                  <FormControl>
                    <NativeSelect {...f}>
                      {VAT_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate} %
                        </option>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 justify-self-end text-muted-foreground"
              aria-label="Supprimer la ligne"
              onClick={() => remove(index)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Aucune ligne. Ajoutez-en une manuellement ou depuis le catalogue.
          </p>
        )}
      </div>
    </div>
  )
}
