import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowUpRight,
  Brain,
  Clock3,
  Compass,
  EllipsisVertical,
  Filter,
  Plus,
  Search,
  SlidersHorizontal
} from 'lucide-react'

const featuredNotebooks = [
  {
    id: 'featured-1',
    title: 'Earnings Reports For Top 50 Corporations',
    meta: 'Apr 18, 2025 - 267 sources'
  },
  {
    id: 'featured-2',
    title: "OpenStax's Biology",
    meta: 'Jul 31, 2025 - 13 sources'
  },
  {
    id: 'featured-3',
    title: 'The World Ahead 2026',
    meta: 'Dec 19, 2025 - 70 sources'
  },
  {
    id: 'featured-4',
    title: "Bracket Guide To Men's College",
    meta: 'Feb 26, 2026 - 161 sources'
  }
]

const recentNotebooks = [
  {
    id: 'recent-1',
    title: 'Deep Learning: Neural Networks and ML Foundations',
    meta: 'Dec 9, 2025 - 2 sources'
  },
  {
    id: 'recent-2',
    title: 'Untitled notebook',
    meta: 'Apr 8, 2026 - 0 sources'
  },
  {
    id: 'recent-3',
    title: 'Research notebook',
    meta: 'Apr 8, 2026 - 0 sources'
  },
  {
    id: 'recent-4',
    title: 'Deep Learning and Natural Language',
    meta: 'Dec 9, 2025 - 1 source'
  }
]

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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              {featuredNotebooks.map((notebook) => (
                <Link
                  key={notebook.id}
                  href="/workspace/notebook"
                  className="from-card to-muted/50 border-border/70 hover:border-primary/40 group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-colors"
                >
                  <div className="bg-primary/12 text-primary mb-12 inline-flex size-8 items-center justify-center rounded-full">
                    <Compass className="size-4" />
                  </div>
                  <h3 className="line-clamp-2 text-base font-medium leading-snug">{notebook.title}</h3>
                  <p className="text-muted-foreground mt-2 text-xs">{notebook.meta}</p>
                  <span className="bg-background/75 border-border/70 absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-full border opacity-0 transition-opacity group-hover:opacity-100">
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </Link>
              ))}
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
              {recentNotebooks.map((notebook) => (
                <Link
                  key={notebook.id}
                  href="/workspace/notebook"
                  className="bg-card border-border/70 hover:border-primary/45 group min-h-[168px] rounded-2xl border p-4 transition-colors"
                >
                  <div className="mb-7 flex items-start justify-between">
                    <span className="bg-muted/75 inline-flex size-8 items-center justify-center rounded-lg text-sm">
                      📝
                    </span>
                    <EllipsisVertical className="text-muted-foreground size-4" />
                  </div>
                  <h3 className="line-clamp-2 text-base leading-snug font-medium">{notebook.title}</h3>
                  <p className="text-muted-foreground mt-2 text-xs">{notebook.meta}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
