import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max)

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(200),
  type: z.enum(['individual', 'company']),
  company_name: optionalText(200),
  email: optionalText(200).refine(
    (value) => value === '' || z.email().safeParse(value).success,
    'Adresse e-mail invalide'
  ),
  phone: optionalText(30),
  address: optionalText(500),
  siret: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^\d{14}$/.test(value),
      'Le SIRET doit comporter 14 chiffres'
    ),
})

export type ClientInput = z.infer<typeof clientSchema>

export const CLIENT_TYPE_LABELS: Record<ClientInput['type'], string> = {
  individual: 'Particulier',
  company: 'Entreprise',
}
