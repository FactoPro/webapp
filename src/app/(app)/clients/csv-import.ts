import { type ClientInput, clientSchema } from '@/lib/validations/client'

export const IMPORT_FIELDS = [
  { key: 'name', label: 'Nom', required: true },
  { key: 'type', label: 'Type', required: false },
  { key: 'email', label: 'E-mail', required: false },
  { key: 'phone', label: 'Téléphone', required: false },
  { key: 'address', label: 'Adresse', required: false },
  { key: 'siret', label: 'SIRET', required: false },
] as const

export type ImportField = (typeof IMPORT_FIELDS)[number]['key']
export type ColumnMapping = Record<ImportField, string>

const FIELD_ALIASES: Record<ImportField, string[]> = {
  name: ['name', 'nom', 'nom complet', 'contact', 'client', 'raison sociale'],
  type: ['type', 'catégorie', 'categorie'],
  email: ['email', 'e-mail', 'mail', 'courriel'],
  phone: ['phone', 'téléphone', 'telephone', 'tel', 'tél', 'mobile', 'portable'],
  address: ['address', 'adresse'],
  siret: ['siret', 'siren'],
}

const normalize = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Devine le mapping colonne→champ à partir des en-têtes du CSV. */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping = {} as ColumnMapping
  for (const field of IMPORT_FIELDS) {
    const aliases = FIELD_ALIASES[field.key].map(normalize)
    const match = headers.find((header) => aliases.includes(normalize(header)))
    mapping[field.key] = match ?? ''
  }
  return mapping
}

const COMPANY_VALUES = new Set(['company', 'entreprise', 'pro', 'societe', 'société', 'b2b'])
const INDIVIDUAL_VALUES = new Set(['individual', 'particulier', 'perso', 'b2c', 'client'])

function normalizeType(raw: string): string {
  const value = normalize(raw)
  if (value === '') return 'individual'
  if (COMPANY_VALUES.has(value)) return 'company'
  if (INDIVIDUAL_VALUES.has(value)) return 'individual'
  return raw.trim() // laissé tel quel → zod le rejettera
}

export interface ParsedRow {
  line: number
  values: ClientInput
  valid: boolean
  error: string | null
}

/** Applique le mapping à une ligne CSV et la valide. */
export function buildRow(
  raw: Record<string, string>,
  mapping: ColumnMapping,
  line: number
): ParsedRow {
  const pick = (field: ImportField) => (mapping[field] ? (raw[mapping[field]] ?? '').trim() : '')

  const candidate = {
    name: pick('name'),
    type: normalizeType(pick('type')),
    company_name: '',
    email: pick('email'),
    phone: pick('phone'),
    address: pick('address'),
    siret: pick('siret'),
  }

  const result = clientSchema.safeParse(candidate)
  return {
    line,
    values: candidate as ClientInput,
    valid: result.success,
    error: result.success ? null : (result.error.issues[0]?.message ?? 'Ligne invalide'),
  }
}
