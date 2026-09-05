'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import {
  CATALOG_UNIT_LABELS,
  CATALOG_UNITS,
  type CatalogItemInput,
  catalogItemSchema,
} from '@/lib/validations/catalog-item'
import type { Tables } from '@/types/database'

import { saveCatalogItem } from './actions'

type CatalogItem = Tables<'catalog_items'>

function toFormValues(item?: CatalogItem): CatalogItemInput {
  return {
    label: item?.label ?? '',
    unit: (item?.unit as CatalogItemInput['unit']) ?? 'u',
    unit_price: item ? String(item.unit_price) : '',
    vat_rate: item ? String(item.vat_rate) : '20',
    category: item?.category ?? '',
  }
}

interface CatalogItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: CatalogItem
}

export function CatalogItemDialog({ open, onOpenChange, item }: CatalogItemDialogProps) {
  const isEdit = Boolean(item)
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<CatalogItemInput>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: toFormValues(item),
  })

  React.useEffect(() => {
    if (open) form.reset(toFormValues(item))
  }, [open, item, form])

  function onSubmit(values: CatalogItemInput) {
    startTransition(async () => {
      const result = await saveCatalogItem(values, item?.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(isEdit ? 'Prestation mise à jour.' : 'Prestation ajoutée.')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la prestation' : 'Nouvelle prestation'}</DialogTitle>
          <DialogDescription>
            Une prestation réutilisable dans les devis et factures.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix unitaire (€ HT)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité</FormLabel>
                    <FormControl>
                      <NativeSelect {...field}>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="vat_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TVA (%)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" placeholder="Optionnel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
