import { type RefCallback, type RefObject, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppIconButton } from '@/components/common/app-button'
import { ButtonWithTooltip } from '@/components/common/button-with-tooltip'
import { ATTACHMENTS_ACCEPT } from '@/lib/chat-attachments'
import { cn } from '@/lib/utils'
import type { NoteItem } from '@/store/notes-store'
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  Lightbulb,
  Mic,
  MicOff,
  Plus,
  Search,
  Square
} from 'lucide-react'

interface ComposerToolbarProps {
  canInteract: boolean
  isSending: boolean
  canSend: boolean
  isListening: boolean
  isVoiceButtonInView: boolean
  voiceButtonRef: RefCallback<HTMLButtonElement>
  fileInputRef: RefObject<HTMLInputElement | null>
  notes: NoteItem[]
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onInsertNote: (note: NoteItem) => Promise<void>
  onVoiceToggle: () => void
  onSend: (e: React.SyntheticEvent) => void
  onStop: () => void
}

export function ComposerToolbar({
  canInteract,
  isSending,
  canSend,
  isListening,
  isVoiceButtonInView,
  voiceButtonRef,
  fileInputRef,
  notes,
  onFileUpload,
  onInsertNote,
  onVoiceToggle,
  onSend,
  onStop
}: ComposerToolbarProps) {
  const router = useRouter()
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [menuView, setMenuView] = useState<'root' | 'notes'>('root')
  const addMenuId = useId()
  const addButtonRef = useRef<HTMLButtonElement | null>(null)
  const addMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isAddMenuOpen) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (addMenuRef.current?.contains(target) || addButtonRef.current?.contains(target)) {
        return
      }
      setMenuView('root')
      setIsAddMenuOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuView('root')
        setIsAddMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isAddMenuOpen])

  const closeAddMenu = () => {
    setMenuView('root')
    setIsAddMenuOpen(false)
  }

  return (
    <div className="flex items-center justify-between px-3 pb-3">
      <div className="relative flex items-center gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          name="attachments"
          accept={ATTACHMENTS_ACCEPT}
          multiple
          className="hidden"
          aria-label="Attach file"
          onChange={onFileUpload}
        />
        <ButtonWithTooltip label="Open tools">
          <AppIconButton
            ref={addButtonRef}
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={!canInteract}
            onClick={() => setIsAddMenuOpen((prev) => !prev)}
            aria-label="Open tools menu"
            aria-haspopup="menu"
            aria-expanded={isAddMenuOpen}
            aria-controls={addMenuId}
            className="text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/60 size-8 rounded-full border bg-transparent transition-colors duration-150"
          >
            <Plus className="size-4" aria-hidden="true" />
          </AppIconButton>
        </ButtonWithTooltip>
        {isAddMenuOpen ? (
          <div
            ref={addMenuRef}
            id={addMenuId}
            role="menu"
            aria-label="Composer tools"
            className="bg-popover border-border/80 absolute bottom-full left-0 z-40 mb-2 min-w-48 overflow-hidden rounded-2xl border p-1.5 shadow-xl"
          >
            {menuView === 'root' ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="hover:bg-muted focus-visible:bg-muted text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none"
                  onClick={() => {
                    closeAddMenu()
                    fileInputRef.current?.click()
                  }}
                >
                  <Plus className="text-muted-foreground size-4" aria-hidden="true" />
                  <span>Add photos & files</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="hover:bg-muted focus-visible:bg-muted text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none"
                  onClick={closeAddMenu}
                >
                  <Lightbulb className="text-muted-foreground size-4" aria-hidden="true" />
                  <span>Thinking</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="hover:bg-muted focus-visible:bg-muted text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none"
                  onClick={closeAddMenu}
                >
                  <Search className="text-muted-foreground size-4" aria-hidden="true" />
                  <span>Deep research</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="hover:bg-muted focus-visible:bg-muted text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none"
                  onClick={closeAddMenu}
                >
                  <Globe className="text-muted-foreground size-4" aria-hidden="true" />
                  <span>Web search</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="hover:bg-muted focus-visible:bg-muted text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none"
                  onClick={() => setMenuView('notes')}
                >
                  <FileText className="text-muted-foreground size-4" aria-hidden="true" />
                  <span className="flex-1 text-left">Notes</span>
                  <ChevronRight className="text-muted-foreground size-3.5" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="hover:bg-muted focus-visible:bg-muted text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none"
                  onClick={() => setMenuView('root')}
                >
                  <ChevronLeft className="text-muted-foreground size-4" aria-hidden="true" />
                  <span>Back</span>
                </button>
                {notes.length === 0 ? (
                  <>
                    <div className="text-muted-foreground px-2.5 py-2 text-xs">No saved notes</div>
                    <button
                      type="button"
                      role="menuitem"
                      className="hover:bg-muted focus-visible:bg-muted text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none"
                      onClick={() => {
                        closeAddMenu()
                        router.push('/notes')
                      }}
                    >
                      <FileText className="text-muted-foreground size-4" aria-hidden="true" />
                      <span>Go to Notes</span>
                    </button>
                  </>
                ) : (
                  notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      role="menuitem"
                      className="hover:bg-muted focus-visible:bg-muted text-foreground flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none"
                      onClick={() => {
                        void onInsertNote(note)
                        closeAddMenu()
                      }}
                      title={note.title}
                    >
                      <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span className="line-clamp-2">{note.title}</span>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        ) : null}
      </div>
      {isSending ? (
        <div className="flex items-center gap-2" role="status" aria-live="polite">
          <span className="sr-only">Generating response</span>
          <ButtonWithTooltip label="Stop generating">
            <AppIconButton
              type="button"
              size="icon-sm"
              onClick={onStop}
              aria-label="Stop generating"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 size-8 rounded-full transition-colors duration-150"
            >
              <Square fill="currentColor" stroke="none" aria-hidden="true" />
            </AppIconButton>
          </ButtonWithTooltip>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <ButtonWithTooltip label={isListening ? 'Stop voice input' : 'Start voice input'}>
            <AppIconButton
              ref={voiceButtonRef}
              size="icon-sm"
              variant="ghost"
              disabled={!canInteract}
              onClick={onVoiceToggle}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              className={cn(
                'rounded-full',
                isListening
                  ? 'text-destructive relative'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 size-8 transition-colors duration-150'
              )}
            >
              {isListening && isVoiceButtonInView && (
                <>
                  <span className="bg-destructive/25 absolute inset-0 animate-[voice-ring_1.5s_ease-out_infinite] rounded-full motion-reduce:animate-none" />
                  <span className="bg-destructive/15 absolute inset-0 animate-[voice-ring_1.5s_ease-out_0.4s_infinite] rounded-full motion-reduce:animate-none" />
                </>
              )}
              {isListening ? (
                <MicOff className="relative size-4" aria-hidden="true" />
              ) : (
                <Mic className="size-4" aria-hidden="true" />
              )}
            </AppIconButton>
          </ButtonWithTooltip>
          <ButtonWithTooltip label="Send message">
            <AppIconButton
              size="icon-sm"
              disabled={!canSend}
              className="bg-foreground text-background hover:bg-foreground/90 size-8 rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              onClick={onSend}
              aria-label="Send message"
            >
              <ArrowUp aria-hidden="true" />
            </AppIconButton>
          </ButtonWithTooltip>
        </div>
      )}
    </div>
  )
}
