import { createClient } from '@/lib/server'

/** Charge les listes nécessaires à l'éditeur de devis (RLS-scopées). */
export async function loadEditorData() {
  const supabase = await createClient()
  const [{ data: clients }, { data: catalogItems }, { data: discounts }] = await Promise.all([
    supabase.from('clients').select('id, name, company_name').order('name', { ascending: true }),
    supabase
      .from('catalog_items')
      .select('id, label, unit, unit_price, vat_rate, category')
      .order('label', { ascending: true }),
    supabase.from('discounts').select('id, label, kind, value').order('label', { ascending: true }),
  ])
  return {
    clients: clients ?? [],
    catalogItems: catalogItems ?? [],
    discounts: discounts ?? [],
  }
}
