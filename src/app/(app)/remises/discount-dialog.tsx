'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import * as React from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import { type DiscountInput, discountSchema } from '@/lib/validations/discount'
import type { Tables } from '@/types/database'

import { saveDiscount } from './actions'

type Discount = Tables<'discounts'>

function toFormValues(discount?: Discount): DiscountInput {
  return {
    label: discount?.label ?? '',
    kind: (discount?.kind as DiscountInput['kind']) ?? 'percent',
    value: discount ? String(discount.value) : '',
  }
}

interface DiscountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  discount?: Discount
}

export function DiscountDialog({ open, onOpenChange, discount }: DiscountDialogProps) {
  const isEdit = Boolean(discount)
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<DiscountInput>({
    resolver: zodResolver(discountSchema),
    defaultValues: toFormValues(discount),
  })

  React.useEffect(() => {
    if (open) form.reset(toFormValues(discount))
  }, [open, discount, form])

  function onSubmit(values: DiscountInput) {
    startTransition(async () => {
      const result = await saveDiscount(values, discount?.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(isEdit ? 'Remise mise à jour.' : 'Remise ajoutée.')
      onOpenChange(false)
    })
  }

  const kind = useWatch({ control: form.control, name: 'kind' })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la remise' : 'Nouvelle remise'}</DialogTitle>
          <DialogDescription>
            Une remise prédéfinie applicable aux devis et factures.
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
                    <Input autoComplete="off" placeholder="Remise fidélité" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'percent' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => field.onChange('percent')}
                    >
                      Pourcentage
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'fixed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => field.onChange('fixed')}
                    >
                      Montant fixe
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{kind === 'percent' ? 'Pourcentage (%)' : 'Montant (€ HT)'}</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      placeholder={kind === 'percent' ? '10' : '50,00'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
