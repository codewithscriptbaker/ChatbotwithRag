'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowRight,
  BadgeHelp,
  BookMarked,
  ChevronRight,
  Clipboard,
  FileBarChart2,
  FileText,
  Grid3x3,
  Globe,
  GripHorizontal,
  Laptop2,
  Link2,
  Map,
  Plus,
  Presentation,
  RectangleEllipsis,
  Search,
  Sparkles,
  Table2,
  Upload,
  Youtube
} from 'lucide-react'

const studioTiles = [
  {
    label: 'Audio Overview',
    icon: RectangleEllipsis,
    style: 'bg-violet-500/10 text-violet-200 border-violet-400/25 hover:bg-violet-500/20'
  },
  {
    label: 'Study Guide',
    icon: BookMarked,
    style: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/25 hover:bg-emerald-500/20'
  },
  {
    label: 'Video Overview',
    icon: Presentation,
    style: 'bg-sky-500/10 text-sky-200 border-sky-400/25 hover:bg-sky-500/20'
  },
  {
    label: 'Mind Map',
    icon: Map,
    style: 'bg-amber-500/10 text-amber-200 border-amber-400/25 hover:bg-amber-500/20'
  },
  {
    label: 'Reports',
    icon: FileBarChart2,
    style: 'bg-rose-500/10 text-rose-200 border-rose-400/25 hover:bg-rose-500/20'
  },
  {
    label: 'Flashcards',
    icon: Grid3x3,
    style: 'bg-cyan-500/10 text-cyan-200 border-cyan-400/25 hover:bg-cyan-500/20'
  },
  {
    label: 'Quiz',
    icon: BadgeHelp,
    style: 'bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-400/25 hover:bg-fuchsia-500/20'
  },
  {
    label: 'Infographic',
    icon: Sparkles,
    style: 'bg-lime-500/10 text-lime-200 border-lime-400/25 hover:bg-lime-500/20'
  },
  {
    label: 'Data Table',
    icon: Table2,
    style: 'bg-indigo-500/10 text-indigo-200 border-indigo-400/25 hover:bg-indigo-500/20'
  }
]

export default function WorkspaceNotebookPage(): React.JSX.Element {
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false)

  return (
    <main className="bg-background min-h-dvh">
      <div className="bg-muted/20 border-border/70 flex min-h-dvh w-full flex-col border">
        <header className="border-border/60 flex items-center justify-between border-b px-4 py-2.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <nav aria-label="Breadcrumb" className="text-muted-foreground flex items-center text-xs">
              <Link href="/chat" className="hover:text-foreground transition-colors">
                Main chat
              </Link>
              <ChevronRight className="mx-1 size-3" aria-hidden="true" />
              <Link href="/workspace" className="hover:text-foreground transition-colors">
                Workspace
              </Link>
              <ChevronRight className="mx-1 size-3" aria-hidden="true" />
              <span className="text-foreground">Notebook</span>
            </nav>
            <div className="flex min-w-0 items-center gap-2">
              <span className="bg-foreground text-background inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold">
                W
              </span>
              <h1 className="truncate text-sm font-medium md:text-base">
                Deep Learning: Neural Networks and ML Foundations
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => setIsSourceDialogOpen(true)}
            >
              <Plus className="size-3.5" />
              Create notebook
            </Button>
            <Button size="sm" variant="ghost" className="h-8 rounded-full px-3 text-xs">
              Share
            </Button>
            <Button size="sm" variant="ghost" className="h-8 rounded-full px-3 text-xs">
              Settings
            </Button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 xl:grid-cols-[1fr_1.9fr_1fr]">
          <aside className="bg-card border-border/70 flex min-h-0 flex-col rounded-2xl border">
            <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-medium">Sources</h2>
              <GripHorizontal className="text-muted-foreground size-4" />
            </div>
            <div className="space-y-3 p-3">
              <Button
                variant="outline"
                className="h-9 w-full justify-center rounded-full text-xs"
                onClick={() => setIsSourceDialogOpen(true)}
              >
                <Plus className="size-4" />
                Add sources
              </Button>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  className="h-9 rounded-full pl-9"
                  placeholder="Search the web for new sources"
                  aria-label="Search sources"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="h-7 rounded-full text-xs">
                  <Globe className="size-3.5" />
                  Web
                </Button>
                <Button variant="secondary" size="sm" className="h-7 rounded-full text-xs">
                  <Sparkles className="size-3.5" />
                  Fast Research
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-auto px-2 pb-2">
              <div className="text-muted-foreground flex h-full min-h-40 flex-col items-center justify-end px-4 pb-6 text-center">
                <FileText className="mb-2 size-4 opacity-70" />
                <p className="text-xs font-medium">Saved sources will appear here</p>
                <p className="mt-2 text-[11px] leading-relaxed opacity-85">
                  Click Add source above to add PDFs, websites, text, videos, or audio files.
                </p>
              </div>
            </div>
          </aside>

          <section className="bg-card border-border/70 flex min-h-0 flex-col rounded-2xl border">
            <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-medium">Chat</span>
              <GripHorizontal className="text-muted-foreground size-4" />
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
              <div className="text-muted-foreground flex h-full min-h-44 flex-col items-center justify-center text-center">
                <span className="bg-primary/15 text-primary mb-2 inline-flex size-8 items-center justify-center rounded-full">
                  <Upload className="size-4" />
                </span>
                <h2 className="text-foreground text-2xl font-medium tracking-tight">
                  Add a source to get started
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 rounded-full px-4 text-xs"
                  onClick={() => setIsSourceDialogOpen(true)}
                >
                  Upload a source
                </Button>
              </div>
            </div>
            <div className="border-border/60 border-t p-3">
              <div className="bg-background/50 border-border/70 flex min-h-16 items-center gap-2 rounded-[1.35rem] border px-5 py-3">
                <div className="min-w-0 flex-1">
                  <input
                    className="placeholder:text-muted-foreground/85 block w-full min-w-0 border-0 bg-transparent text-sm shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Upload a source to get started"
                    aria-label="Start typing"
                  />
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-3">
                  <span className="text-muted-foreground/85 text-xs">0 sources</span>
                  <Button
                    size="icon-sm"
                    className="bg-muted text-muted-foreground hover:bg-muted size-10 rounded-full"
                  >
                    <ArrowRight className="size-5" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <aside className="bg-card border-border/70 flex min-h-0 flex-col rounded-2xl border">
            <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-medium">Studio</h2>
              <GripHorizontal className="text-muted-foreground size-4" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {studioTiles.map((tile) => (
                <button
                  key={tile.label}
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${tile.style}`}
                >
                  <span className="flex items-center gap-2">
                    <tile.icon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tile.label}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="text-muted-foreground flex min-h-0 flex-1 items-end px-4 pb-4">
              <div className="w-full text-center">
                <Laptop2 className="mx-auto mb-2 size-4 opacity-70" />
                <p className="text-xs font-medium">Studio output will be saved here.</p>
                <p className="mt-2 text-[11px] leading-relaxed opacity-85">
                  After adding sources, click to add Audio Overview, Study Guide, Mind Map, and
                  more.
                </p>
              </div>
            </div>
            <div className="p-3">
              <Button className="w-full rounded-full">Add note</Button>
            </div>
          </aside>
        </section>
      </div>
      <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
        <DialogContent className="bg-card border-border/70 w-full max-w-3xl rounded-2xl p-0 shadow-2xl">
          <DialogHeader className="relative border-border/60 border-b px-6 pt-6 pb-4 text-center">
            <DialogTitle className="text-3xl font-medium tracking-tight text-balance">
              Create Audio and Video Overviews from websites
            </DialogTitle>
            <DialogDescription className="sr-only">
              Add sources by web search or upload to start your workspace notebook.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 p-6">
            <div className="border-primary/70 bg-background rounded-2xl border p-4 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  className="h-11 rounded-xl border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Search the web for new sources"
                  aria-label="Search the web for new sources"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs">
                    <Globe className="size-3.5" />
                    Web
                  </Button>
                  <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs">
                    <Sparkles className="size-3.5" />
                    Fast Research
                  </Button>
                </div>
                <Button size="icon-sm" className="bg-muted text-muted-foreground size-9 rounded-full">
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="bg-muted/25 border-border/70 space-y-5 rounded-2xl border border-dashed px-6 py-8">
              <div className="text-center">
                <h3 className="text-foreground text-3xl font-medium">or drop your files</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  pdf, images, docs, audio, <span className="underline underline-offset-4">and more</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" className="h-10 rounded-full px-4">
                  <Upload className="size-4" />
                  Upload files
                </Button>
                <Button variant="outline" className="h-10 rounded-full px-4">
                  <Youtube className="size-4" />
                  Websites
                </Button>
                <Button variant="outline" className="h-10 rounded-full px-4">
                  <Link2 className="size-4" />
                  Drive
                </Button>
                <Button variant="outline" className="h-10 rounded-full px-4">
                  <Clipboard className="size-4" />
                  Copied text
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
