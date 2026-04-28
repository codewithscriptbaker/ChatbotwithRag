import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowUpRight,
  Brain,
  Clock3,
  Filter,
  Plus,
  Search,
  SlidersHorizontal
} from 'lucide-react'

export default function WorkspacePage(): React.JSX.Element {
  return (
    <main className="bg-background min-h-dvh">
      <div className="from-background via-background to-muted/20 min-h-dvh bg-gradient-to-br">
        <header className="border-border/60 flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-7">
            <Link href="/chat" className="flex items-center gap-2">
              <span className="bg-primary/20 text-primary inline-flex size-5 items-center justify-center rounded-full">
                <Brain className="size-3" />
              </span>
              <span className="text-sm font-semibold">Workspace</span>
            </Link>
            <nav aria-label="Workspace tabs" className="flex items-center gap-2">
              <button
                type="button"
                className="bg-muted/70 text-foreground rounded-full px-3 py-1.5 text-xs font-medium"
              >
                All
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-xs transition-colors"
              >
                My notebooks
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-xs transition-colors"
              >
                Featured notebooks
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" className="size-8 rounded-full">
              <Search className="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" className="size-8 rounded-full">
              <Filter className="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" className="size-8 rounded-full">
              <SlidersHorizontal className="size-4" />
            </Button>
            <Button asChild size="sm" className="h-8 rounded-full px-3 text-xs">
              <Link href="/workspace/notebook">
                <Plus className="size-3.5" />
                Create new
              </Link>
            </Button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1220px] space-y-10 px-6 py-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium tracking-tight">Featured notebooks</h2>
              <Button variant="ghost" size="sm" className="text-muted-foreground h-8 rounded-full text-xs">
                See all
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
            <div className="text-muted-foreground border-border/70 bg-card/40 flex min-h-[168px] items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-sm">
              No featured notebooks yet.
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium tracking-tight">Recent notebooks</h2>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Clock3 className="size-3.5" />
                Most recent
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Link
                href="/workspace/notebook"
                className="border-border/70 hover:border-primary/45 bg-card group flex min-h-[168px] flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center transition-colors"
              >
                <span className="bg-primary/20 text-primary mb-3 inline-flex size-11 items-center justify-center rounded-full">
                  <Plus className="size-5" />
                </span>
                <span className="text-sm font-medium">Create new notebook</span>
              </Link>
              <div className="text-muted-foreground border-border/70 bg-card/40 flex min-h-[168px] items-center justify-center rounded-2xl border border-dashed p-4 text-center text-sm md:col-span-1 lg:col-span-4">
                No recent notebooks yet.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
