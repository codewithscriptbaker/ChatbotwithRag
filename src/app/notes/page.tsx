'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { SideBar } from '@/components/chat/sidebar'
import { ConfirmActionDialog } from '@/components/common/confirm-action-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useNotesStore, type NoteItem } from '@/store/notes-store'
import { Download, Ellipsis, FileText, Plus, Search, Share2, StickyNote, Trash2 } from 'lucide-react'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function NoteCard({
  note,
  onDelete,
  onDownload,
  onShare
}: {
  note: NoteItem
  onDelete: (id: string) => void
  onDownload: (id: string) => void
  onShare: (id: string) => void
}) {
  const preview = stripHtml(note.content)
  const wordCount = preview ? preview.split(/\s+/).filter(Boolean).length : 0

  return (
    <li className="group relative">
      <Link
        href={`/notes/new?noteId=${note.id}`}
        className="bg-card hover:bg-muted/50 border-border/60 focus-visible:ring-ring/50 flex flex-col gap-2.5 rounded-xl border p-4 transition-all duration-150 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="bg-accent/70 text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-foreground truncate text-sm font-semibold leading-tight">
              {note.title || 'Untitled note'}
            </h3>
          </div>
        </div>

        {preview ? (
          <p className="text-muted-foreground line-clamp-2 text-[13px] leading-relaxed">
            {preview}
          </p>
        ) : (
          <p className="text-muted-foreground/60 text-[13px] italic">Empty note</p>
        )}

        <div className="text-muted-foreground/70 flex items-center gap-3 text-[11px]">
          <span>{formatRelativeDate(note.updatedAt)}</span>
          <span className="bg-border/60 size-0.5 rounded-full" />
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        </div>
      </Link>

      <div className="absolute top-3 right-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground hover:bg-background/80 size-7 rounded-full"
              aria-label="Note options"
              onClick={(event) => event.preventDefault()}
            >
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(event) => {
                event.preventDefault()
                onDownload(note.id)
              }}
            >
              <Download className="size-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.preventDefault()
                onShare(note.id)
              }}
            >
              <Share2 className="size-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                onDelete(note.id)
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

export default function NotesPage(): React.JSX.Element {
  const notes = useNotesStore((state) => state.notes)
  const isHydrated = useNotesStore((state) => state.isHydrated)
  const hydrate = useNotesStore((state) => state.hydrate)
  const deleteNote = useNotesStore((state) => state.deleteNote)
  const [query, setQuery] = useState('')
  const [notePendingDeleteId, setNotePendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return notes
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(normalized) ||
        note.content.toLowerCase().includes(normalized)
    )
  }, [notes, query])

  const handleDownload = (noteId: string) => {
    const note = notes.find((item) => item.id === noteId)
    if (!note) return

    const text = stripHtml(note.content) || 'No content yet'
    const blob = new Blob([`${note.title}\n\n${text}`], { type: 'text/plain;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `${note.title || 'note'}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  }

  const handleShare = async (noteId: string) => {
    const note = notes.find((item) => item.id === noteId)
    if (!note) return
    const shareUrl = `${window.location.origin}/notes/new?noteId=${note.id}`
    const text = stripHtml(note.content) || 'No content yet'

    if (navigator.share) {
      try {
        await navigator.share({ title: note.title, text, url: shareUrl })
        return
      } catch {
        // fall back to clipboard
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  const confirmDeleteNote = () => {
    if (!notePendingDeleteId) return
    deleteNote(notePendingDeleteId)
    setNotePendingDeleteId(null)
  }

  return (
    <SidebarProvider className="min-h-0 flex-1">
      <SideBar />
      <div
        data-slot="sidebar-inset"
        className="bg-background relative flex w-full flex-1 flex-col min-h-0 overflow-hidden"
      >
        <main className="min-h-0 flex-1">
          <section className="bg-background flex min-h-full w-full flex-col px-4 py-5 md:px-6 md:py-6">
            <header className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-foreground text-xl font-semibold tracking-tight">Notes</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {isHydrated ? (
                    notes.length === 0 ? 'No notes yet' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`
                  ) : (
                    'Loading...'
                  )}
                </p>
              </div>
              <Button asChild size="sm" className="rounded-full px-4 shadow-sm">
                <Link href="/notes/new">
                  <Plus className="size-4" />
                  New Note
                </Link>
              </Button>
            </header>

            {notes.length > 0 && (
              <div className="mb-4">
                <div className="border-border/70 bg-card text-muted-foreground flex h-10 w-full max-w-sm items-center gap-2.5 rounded-xl border px-3.5 shadow-sm">
                  <Search className="size-4 shrink-0" />
                  <Input
                    className="h-full w-full border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Search notes..."
                    aria-label="Search notes"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>
            )}

            {filteredNotes.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <div className="bg-muted/50 text-muted-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl">
                    <StickyNote className="size-7" />
                  </div>
                  <p className="text-foreground text-sm font-medium">
                    {query ? 'No notes found' : 'No notes yet'}
                  </p>
                  <p className="text-muted-foreground mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed">
                    {query
                      ? 'Try a different search term.'
                      : 'Create your first note to start organizing your thoughts.'}
                  </p>
                  {!query && (
                    <div className="mt-5">
                      <Button asChild size="sm" className="rounded-full px-5 shadow-sm">
                        <Link href="/notes/new">
                          <Plus className="size-4" />
                          Create Note
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={setNotePendingDeleteId}
                    onDownload={handleDownload}
                    onShare={(id) => void handleShare(id)}
                  />
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
      <ConfirmActionDialog
        open={notePendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setNotePendingDeleteId(null)
        }}
        title="Delete this note?"
        description="This note will be removed permanently from local storage."
        confirmLabel="Delete note"
        confirmVariant="destructive"
        onConfirm={confirmDeleteNote}
      />
    </SidebarProvider>
  )
}
