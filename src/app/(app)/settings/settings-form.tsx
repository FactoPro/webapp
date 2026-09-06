'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import * as React from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatReminderDays, type ProfileInput, profileSchema } from '@/lib/validations/profile'
import type { Tables } from '@/types/database'

import { updateProfile } from './actions'
import { LogoUpload } from './logo-upload'
import { PdfPreview } from './pdf-preview'

type Profile = Tables<'profiles'>

function toFormValues(profile: Profile): ProfileInput {
  return {
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    company_name: profile.company_name ?? '',
    siret: profile.siret ?? '',
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    vat_number: profile.vat_number ?? '',
    iban: profile.iban ?? '',
    bic: profile.bic ?? '',
    pdf_color: profile.pdf_color ?? '#13283C',
    legal_mentions: profile.legal_mentions ?? '',
    logo_url: profile.logo_url ?? '',
    default_vat_rate: String(profile.default_vat_rate ?? '20'),
    payment_terms: String(profile.payment_terms ?? '30'),
    micro_enterprise: profile.micro_enterprise ?? true,
    urssaf_period: (profile.urssaf_period as ProfileInput['urssaf_period']) ?? 'monthly',
    urssaf_rate: String(profile.urssaf_rate ?? '21.2'),
    versement_liberatoire: profile.versement_liberatoire ?? false,
    income_tax_rate: String(profile.income_tax_rate ?? '1.7'),
    reminder_days: formatReminderDays(profile.reminder_days) || '7, 14, 30',
    reminder_repeat_days: String(profile.reminder_repeat_days ?? '30'),
  }
}

const YES_NO = [
  { value: true, label: 'Oui' },
  { value: false, label: 'Non' },
]

export function SettingsForm({ profile, userId }: { profile: Profile; userId: string }) {
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(profile),
  })

  const values = useWatch({ control: form.control }) as ProfileInput

  function onSubmit(input: ProfileInput) {
    startTransition(async () => {
      const result = await updateProfile(input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Paramètres enregistrés.')
      form.reset(input)
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-6">
          <div>
            <h1 className="font-heading text-xl font-semibold">Paramètres</h1>
            <p className="text-sm text-muted-foreground">
              Identité et personnalisation de vos devis et factures.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Identité</CardTitle>
              <CardDescription>
                Ces informations apparaissent en en-tête des documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Raison sociale</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="siret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SIRET</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="14 chiffres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vat_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº TVA intracommunautaire</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" placeholder="FR..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input type="tel" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Adresse</FormLabel>
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
              <CardTitle>Coordonnées bancaires</CardTitle>
              <CardDescription>Affichées sur les factures pour le règlement.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="iban"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>IBAN</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" placeholder="FR76 ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BIC</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personnalisation PDF</CardTitle>
              <CardDescription>Logo, couleur d&apos;accent et mentions légales.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="logo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo</FormLabel>
                    <FormControl>
                      <LogoUpload userId={userId} value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pdf_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couleur d&apos;accent</FormLabel>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(field.value) ? field.value : '#13283C'}
                        onChange={(event) => field.onChange(event.target.value)}
                        className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent"
                        aria-label="Sélecteur de couleur"
                      />
                      <FormControl>
                        <Input className="max-w-32 font-mono" {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legal_mentions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mentions légales</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Ex. TVA non applicable, art. 293 B du CGI. Pénalités de retard…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facturation par défaut</CardTitle>
              <CardDescription>Valeurs pré-remplies sur les nouveaux documents.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="default_vat_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taux de TVA par défaut (%)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Délai de paiement (jours)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormDescription>0 = paiement à réception.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Régime micro-entreprise / URSSAF</CardTitle>
              <CardDescription>
                Utilisé par le futur module de calcul des cotisations.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="micro_enterprise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Micro-entreprise</FormLabel>
                    <div className="flex gap-2">
                      {YES_NO.map((option) => (
                        <Button
                          key={option.label}
                          type="button"
                          size="sm"
                          variant={field.value === option.value ? 'default' : 'outline'}
                          onClick={() => field.onChange(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="urssaf_period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Périodicité de déclaration</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={field.value === 'monthly' ? 'default' : 'outline'}
                        onClick={() => field.onChange('monthly')}
                      >
                        Mensuelle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={field.value === 'quarterly' ? 'default' : 'outline'}
                        onClick={() => field.onChange('quarterly')}
                      >
                        Trimestrielle
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="urssaf_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taux de cotisations URSSAF (%)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="income_tax_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taux d&apos;impôt sur le revenu (%)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="versement_liberatoire"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Versement libératoire de l&apos;impôt sur le revenu</FormLabel>
                    <div className="flex gap-2">
                      {YES_NO.map((option) => (
                        <Button
                          key={option.label}
                          type="button"
                          size="sm"
                          variant={field.value === option.value ? 'default' : 'outline'}
                          onClick={() => field.onChange(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Relances de paiement</CardTitle>
              <CardDescription>
                Jours après échéance où une relance est proposée pour les factures impayées.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="reminder_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jours de relance</FormLabel>
                    <FormControl>
                      <Input placeholder="7, 14, 30" {...field} />
                    </FormControl>
                    <FormDescription>
                      Liste d&apos;entiers séparés par des virgules. Vide = aucune relance.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reminder_repeat_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Répétition (jours)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormDescription>
                      0 = pas de répétition après la dernière relance.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !form.formState.isDirty}
              onClick={() => form.reset()}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !form.formState.isDirty}>
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="lg:sticky lg:top-6 lg:w-[22rem]">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Aperçu</p>
        <PdfPreview values={values} />
      </div>
    </div>
  )
}
