'use client'

import Papa from 'papaparse'
import * as React from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { importClients } from './actions'
import {
  buildRow,
  type ColumnMapping,
  guessMapping,
  IMPORT_FIELDS,
  type ParsedRow,
} from './csv-import'

interface ImportClientsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportClientsDialog({ open, onOpenChange }: ImportClientsDialogProps) {
  const [headers, setHeaders] = React.useState<string[]>([])
  const [rawRows, setRawRows] = React.useState<Record<string, string>[]>([])
  const [mapping, setMapping] = React.useState<ColumnMapping | null>(null)
  const [fileName, setFileName] = React.useState('')
  const [isPending, startTransition] = React.useTransition()

  function reset() {
    setHeaders([])
    setRawRows([])
    setMapping(null)
    setFileName('')
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const cols = result.meta.fields ?? []
        setHeaders(cols)
        setRawRows(result.data)
        setMapping(guessMapping(cols))
      },
      error: () => toast.error('Impossible de lire le fichier CSV.'),
    })
    event.target.value = ''
  }

  const parsedRows = React.useMemo<ParsedRow[]>(() => {
    if (!mapping) return []
    return rawRows.map((raw, index) => buildRow(raw, mapping, index + 2))
  }, [rawRows, mapping])

  const validRows = parsedRows.filter((row) => row.valid)
  const invalidCount = parsedRows.length - validRows.length

  function handleImport() {
    startTransition(async () => {
      const result = await importClients(validRows.map((row) => row.values))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        `${result.inserted} client${result.inserted > 1 ? 's' : ''} importé${
          result.inserted > 1 ? 's' : ''
        }.` + (invalidCount > 0 ? ` ${invalidCount} ligne(s) ignorée(s).` : '')
      )
      handleOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des clients depuis un CSV</DialogTitle>
          <DialogDescription>
            Le fichier doit contenir une ligne d&apos;en-têtes. Les lignes invalides sont ignorées,
            les autres importées.
          </DialogDescription>
        </DialogHeader>

        {!mapping ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input p-8 text-center text-sm text-muted-foreground hover:bg-muted/50">
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            <span className="font-medium text-foreground">Choisir un fichier CSV</span>
            <span>colonnes reconnues : nom, type, e-mail, téléphone, adresse, siret</span>
          </label>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {IMPORT_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                  </label>
                  <NativeSelect
                    value={mapping[field.key]}
                    onChange={(event) =>
                      setMapping({ ...mapping, [field.key]: event.target.value })
                    }
                  >
                    <option value="">— Ignorer —</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Badge variant="default">{validRows.length} valides</Badge>
              {invalidCount > 0 && <Badge variant="destructive">{invalidCount} ignorées</Badge>}
              <span className="text-muted-foreground">· {fileName}</span>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ligne</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 100).map((row) => (
                    <TableRow key={row.line}>
                      <TableCell className="text-muted-foreground">{row.line}</TableCell>
                      <TableCell>{row.values.name || '—'}</TableCell>
                      <TableCell>{row.values.type}</TableCell>
                      <TableCell>{row.values.email || '—'}</TableCell>
                      <TableCell>
                        {row.valid ? (
                          <span className="text-muted-foreground">OK</span>
                        ) : (
                          <span className="text-destructive">{row.error}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedRows.length > 100 && (
              <p className="text-xs text-muted-foreground">
                Aperçu limité à 100 lignes ; l&apos;import traitera les {parsedRows.length}.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          {mapping && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={isPending || validRows.length === 0}
            >
              {isPending ? 'Import…' : `Importer ${validRows.length} client(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
