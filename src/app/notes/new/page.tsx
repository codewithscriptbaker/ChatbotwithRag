'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { SideBar } from '@/components/chat/sidebar'
import { Header } from '@/components/header/header'
import { Button } from '@/components/ui/button'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useNotesStore } from '@/store/notes-store'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Check,
  Eraser,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Palette,
  Save,
  Type,
  Underline
} from 'lucide-react'

type ToolbarAction = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  action: () => void
}

function ToolbarButton({ icon: Icon, label, action }: ToolbarAction) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="notes-toolbar-btn text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-lg transition-colors"
            onClick={action}
            aria-label={label}
          >
            <Icon className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ToolbarDivider() {
  return <div className="bg-border/60 mx-0.5 h-5 w-px" />
}

export default function NewNotePage(): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const noteId = searchParams.get('noteId') ?? undefined
  const editorRef = useRef<HTMLDivElement | null>(null)
  const colorInputRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState('Untitled note')
  const [saved, setSaved] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const hydrate = useNotesStore((state) => state.hydrate)
  const getNoteById = useNotesStore((state) => state.getNoteById)
  const saveNote = useNotesStore((state) => state.saveNote)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!noteId) return
    const note = getNoteById(noteId)
    if (!note) return
    setTitle(note.title || 'Untitled note')
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content || ''
      updateWordCount()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getNoteById, noteId])

  useEffect(() => {
    requestAnimationFrame(() => {
      editorRef.current?.focus()
    })
  }, [])

  const updateWordCount = useCallback(() => {
    if (!editorRef.current) return
    const text = editorRef.current.textContent?.trim() ?? ''
    setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0)
  }, [])

  const runCommand = useCallback((command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
  }, [])

  const applyFontSize = useCallback((px: string) => {
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (range.collapsed) return

    const span = document.createElement('span')
    span.style.fontSize = `${px}px`
    span.appendChild(range.extractContents())
    range.insertNode(span)

    selection.removeAllRanges()
    const updatedRange = document.createRange()
    updatedRange.selectNodeContents(span)
    selection.addRange(updatedRange)
  }, [])

  const handleSave = useCallback(() => {
    const content = editorRef.current?.innerHTML ?? ''
    const savedId = saveNote({ id: noteId, title, content })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (!noteId) {
      router.push(`/notes/new?noteId=${savedId}`)
    }
  }, [noteId, router, saveNote, title])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  return (
    <SidebarProvider className="min-h-0 flex-1">
      <SideBar />
      <div
        data-slot="sidebar-inset"
        className="bg-background relative flex w-full flex-1 flex-col min-h-0 overflow-hidden"
      >
        <Header />
        <main className="min-h-0 flex-1 flex flex-col">
          <div className="flex min-h-full w-full flex-1 flex-col">
            {/* Top bar */}
            <header className="border-border/60 flex items-center justify-between gap-3 border-b px-4 py-2.5 md:px-6">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                  asChild
                >
                  <Link href="/notes" aria-label="Back to notes">
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>

                <div className="bg-border/50 h-5 w-px" />

                <div
                  role="textbox"
                  aria-label="Note title"
                  contentEditable
                  suppressContentEditableWarning
                  className="text-foreground min-w-0 flex-1 rounded-sm bg-transparent text-base font-semibold outline-none"
                  onBlur={(event) => {
                    const next = event.currentTarget.textContent?.trim()
                    setTitle(next && next.length > 0 ? next : 'Untitled note')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      ;(event.currentTarget as HTMLDivElement).blur()
                    }
                  }}
                >
                  {title}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/70 hidden text-xs sm:inline">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </span>
                <Button
                  size="sm"
                  className={cn(
                    'rounded-full px-4 shadow-sm transition-all',
                    saved && 'bg-emerald-600 hover:bg-emerald-600'
                  )}
                  onClick={handleSave}
                >
                  {saved ? (
                    <>
                      <Check className="size-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </header>

            {/* Toolbar */}
            <div className="border-border/60 bg-card/50 flex flex-wrap items-center gap-0.5 border-b px-4 py-1.5 md:px-6">
              <ToolbarButton icon={Bold} label="Bold" action={() => runCommand('bold')} />
              <ToolbarButton icon={Italic} label="Italic" action={() => runCommand('italic')} />
              <ToolbarButton icon={Underline} label="Underline" action={() => runCommand('underline')} />

              <ToolbarDivider />

              <ToolbarButton icon={Heading2} label="Heading 2" action={() => runCommand('formatBlock', 'h2')} />
              <ToolbarButton icon={Heading3} label="Heading 3" action={() => runCommand('formatBlock', 'h3')} />

              <ToolbarDivider />

              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={400}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Type className="text-muted-foreground size-4 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          className="bg-transparent text-muted-foreground hover:text-foreground h-8 cursor-pointer appearance-none rounded-lg pl-7 pr-2 text-xs transition-colors focus:outline-none"
                          defaultValue="16"
                          onChange={(event) => applyFontSize(event.target.value)}
                          aria-label="Font size"
                        >
                          <option value="12">12</option>
                          <option value="14">14</option>
                          <option value="16">16</option>
                          <option value="18">18</option>
                          <option value="22">22</option>
                          <option value="28">28</option>
                        </select>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Font size</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={400}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="notes-toolbar-btn text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-lg transition-colors"
                        onClick={() => colorInputRef.current?.click()}
                        aria-label="Text color"
                      >
                        <Palette className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Text color</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input
                  ref={colorInputRef}
                  type="color"
                  className="invisible absolute size-0"
                  onChange={(event) => runCommand('foreColor', event.target.value)}
                  aria-label="Text color picker"
                />
              </div>

              <ToolbarDivider />

              <ToolbarButton icon={List} label="Bullet list" action={() => runCommand('insertUnorderedList')} />
              <ToolbarButton icon={ListOrdered} label="Numbered list" action={() => runCommand('insertOrderedList')} />

              <ToolbarDivider />

              <ToolbarButton icon={AlignLeft} label="Align left" action={() => runCommand('justifyLeft')} />
              <ToolbarButton icon={AlignCenter} label="Align center" action={() => runCommand('justifyCenter')} />
              <ToolbarButton icon={AlignRight} label="Align right" action={() => runCommand('justifyRight')} />

              <ToolbarDivider />

              <ToolbarButton icon={Eraser} label="Clear formatting" action={() => runCommand('removeFormat')} />
            </div>

            {/* Editor area */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="w-full px-4 py-6 md:px-6 md:py-8">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Notes editor"
                  className="notes-editor prose prose-sm dark:prose-invert max-w-none min-h-[60vh] text-[15px] leading-7 outline-none focus-visible:ring-0"
                  data-placeholder="Start writing your notes..."
                  onInput={updateWordCount}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
