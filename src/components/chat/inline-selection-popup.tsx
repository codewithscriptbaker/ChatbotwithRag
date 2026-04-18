'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SelectionData } from '@/hooks/useTextSelection'
import type { SelectionAction } from '@/components/chat/selection-action-bubble'
import { generateId } from '@/lib/id'
import type { ChatMessage } from '@/lib/types'
import {
  AlertCircle,
  ArrowUp,
  MessageCircleQuestion,
  Plus,
  RotateCcw,
  Sparkles,
  X
} from 'lucide-react'

type InlineSelectionPopupProps = {
  action: SelectionAction
  selectedText: string
  selection: SelectionData
  scrollContainerRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}

function ThinkingIndicator(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex items-center gap-1">
        <span className="bg-primary/60 inline-block size-1.5 animate-[pulse-dot_1.4s_ease-in-out_infinite] rounded-full" />
        <span className="bg-primary/60 inline-block size-1.5 animate-[pulse-dot_1.4s_ease-in-out_0.2s_infinite] rounded-full" />
        <span className="bg-primary/60 inline-block size-1.5 animate-[pulse-dot_1.4s_ease-in-out_0.4s_infinite] rounded-full" />
      </div>
      <span className="text-muted-foreground text-xs">Thinking...</span>
    </div>
  )
}

function QuotedPreview({ text }: { text: string }): React.JSX.Element {
  const preview = text.length > 120 ? text.slice(0, 120).trimEnd() + '...' : text
  return (
    <div className="border-primary/30 bg-primary/[0.04] border-l-2 px-2.5 py-1.5">
      <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed italic">
        &ldquo;{preview}&rdquo;
      </p>
    </div>
  )
}

export function InlineSelectionPopup({
  action,
  selectedText,
  selection,
  scrollContainerRef,
  onClose
}: InlineSelectionPopupProps): React.JSX.Element {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAsked, setHasAsked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const responseEndRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState<{ top: number; left: number; maxWidth: number } | null>(null)

  useEffect(() => {
    const scrollEl = scrollContainerRef.current
    if (!scrollEl) return

    const scrollRect = scrollEl.getBoundingClientRect()
    const { rect } = selection

    const top = rect.bottom - scrollRect.top + 8
    const popupWidth = 380
    let left = rect.left - scrollRect.left + rect.width / 2 - popupWidth / 2
    left = Math.max(8, Math.min(left, scrollRect.width - popupWidth - 8))

    setPos({
      top: Math.max(4, top),
      left,
      maxWidth: Math.min(popupWidth, scrollRect.width - 16)
    })
  }, [selection, scrollContainerRef])

  useEffect(() => {
    if (action === 'explain') {
      handleSubmit()
    } else {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
    return () => {
      abortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  useEffect(() => {
    if (response) {
      responseEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [response])

  const handleSubmit = useCallback(async (overrideQuestion?: string) => {
    const q = overrideQuestion ?? question
    if (action === 'ask' && !q.trim()) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)
    setResponse('')
    setHasAsked(true)

    try {
      const res = await fetch('/api/chat/inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText,
          action,
          ...(action === 'ask' ? { question: q } : {})
        }),
        signal: controller.signal
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(data.message || 'Failed to get response')
      }

      const data = await res.json() as { text?: string }
      setResponse(typeof data.text === 'string' ? data.text : '')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [action, question, selectedText])

  const handleAddToChat = useCallback(() => {
    if (!response) return

    const clipped = selectedText.length > 500
      ? selectedText.slice(0, 500) + '...'
      : selectedText

    const userMessage: ChatMessage = {
      id: generateId(),
      createdAt: new Date(),
      role: 'user',
      parts: [
        {
          type: 'text',
          text: action === 'explain'
            ? `Explain this:\n> ${clipped.split('\n').join('\n> ')}`
            : `${question}\n> ${clipped.split('\n').join('\n> ')}`
        }
      ]
    }

    const assistantMessage: ChatMessage = {
      id: generateId(),
      createdAt: new Date(),
      role: 'assistant',
      parts: [{ type: 'text', text: response }]
    }

    window.dispatchEvent(
      new CustomEvent('chat:append-inline-messages', {
        detail: { messages: [userMessage, assistantMessage] }
      })
    )

    onClose()
  }, [action, onClose, question, response, selectedText])

  if (!pos) return <></>

  const ActionIcon = action === 'explain' ? Sparkles : MessageCircleQuestion

  return (
    <div
      ref={popupRef}
      data-selection-bubble
      className="animate-in fade-in slide-in-from-top-2 absolute z-50 duration-200"
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.maxWidth
      }}
    >
      <div className="bg-popover/95 border-border/70 overflow-hidden rounded-2xl border shadow-[0_8px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-0">
          <div className="bg-primary/10 flex size-6 items-center justify-center rounded-lg">
            <ActionIcon className="text-primary size-3.5" />
          </div>
          <span className="text-foreground text-[13px] font-semibold tracking-tight">
            {action === 'explain' ? 'Explanation' : 'Ask about selection'}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted -mr-1 rounded-lg p-1 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Quoted preview */}
        <div className="px-3.5 pt-2.5 pb-1">
          <QuotedPreview text={selectedText} />
        </div>

        {/* Ask input (before asking) */}
        {action === 'ask' && !hasAsked && (
          <div className="px-3.5 pt-2 pb-3">
            <div className="border-border/80 focus-within:border-primary/40 focus-within:ring-primary/10 flex items-center gap-2 rounded-xl border bg-transparent px-3 py-[7px] transition-all focus-within:ring-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                className="text-foreground placeholder:text-muted-foreground/60 flex-1 bg-transparent text-[13px] outline-none"
              />
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!question.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-lg transition-all duration-100 disabled:opacity-50"
              >
                <ArrowUp className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Response area */}
        {(hasAsked || action === 'explain') && (
          <div className="custom-scrollbar max-h-[260px] overflow-y-auto px-3.5 pt-1.5 pb-1">
            {isLoading && !response && <ThinkingIndicator />}

            {error && (
              <div className="bg-destructive/10 border-destructive/20 flex items-start gap-2 rounded-lg border p-2.5">
                <AlertCircle className="text-destructive mt-0.5 size-3.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-destructive text-xs font-medium">{error}</p>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="text-destructive/80 hover:text-destructive mt-1 flex items-center gap-1 text-[11px] underline transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    Retry
                  </button>
                </div>
              </div>
            )}

            {response && (
              <div className="text-foreground prose-sm prose-neutral dark:prose-invert text-[13px] leading-[1.65] whitespace-pre-wrap">
                {response}
                <div ref={responseEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Follow-up input (after response) */}
        {action === 'ask' && hasAsked && !isLoading && response && (
          <div className="border-border/40 px-3.5 pt-1.5 pb-2.5">
            <div className="border-border/80 focus-within:border-primary/40 focus-within:ring-primary/10 flex items-center gap-2 rounded-xl border bg-transparent px-3 py-[7px] transition-all focus-within:ring-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask a follow-up..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                className="text-foreground placeholder:text-muted-foreground/60 flex-1 bg-transparent text-[13px] outline-none"
              />
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!question.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-lg transition-all duration-100 disabled:opacity-50"
              >
                <ArrowUp className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer with Add button */}
        {response && !isLoading && (
          <div className="border-border/40 border-t px-3.5 py-2.5">
            <button
              type="button"
              onClick={handleAddToChat}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-1.5 rounded-xl py-[7px] text-xs font-medium shadow-sm transition-all duration-100 hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="size-3.5" />
              Add to chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
