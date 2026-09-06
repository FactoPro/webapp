import { loadEditorData } from '../editor-data'
import { QuoteEditor } from '../quote-editor'

export const metadata = { title: 'Nouveau devis · FactoPro' }

export default async function NewQuotePage() {
  const { clients, catalogItems, discounts } = await loadEditorData()
  return <QuoteEditor clients={clients} catalogItems={catalogItems} discounts={discounts} />
}
