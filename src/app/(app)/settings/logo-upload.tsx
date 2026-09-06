'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/client'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

interface LogoUploadProps {
  userId: string
  value: string
  onChange: (url: string) => void
}

export function LogoUpload({ userId, value, onChange }: LogoUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!ACCEPTED.includes(file.type)) {
      toast.error('Format accepté : PNG, JPEG, WebP ou SVG.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Le logo ne doit pas dépasser 2 Mo.')
      return
    }

    setIsUploading(true)
    const supabase = createClient()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${userId}/logo-${Date.now()}.${extension}`

    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    setIsUploading(false)

    if (error) {
      toast.error("L'upload du logo a échoué.")
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('logos').getPublicUrl(path)
    onChange(publicUrl)
    toast.success('Logo mis à jour. Pensez à enregistrer.')
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo distant (Supabase Storage), pas d'optimisation utile ici
          <img src={value} alt="Logo" className="size-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Aucun</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={handleFile}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? 'Envoi…' : value ? 'Changer' : 'Ajouter un logo'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => onChange('')}
            >
              Retirer
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPEG, WebP ou SVG · 2 Mo max</p>
      </div>
    </div>
  )
}
