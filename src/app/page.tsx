import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background text-foreground">
      <h1 className="text-2xl font-semibold">FactoPro</h1>
      <div className="flex items-center gap-4">
        <Button>Nouveau devis</Button>
        <ModeToggle />
      </div>
    </div>
  )
}
