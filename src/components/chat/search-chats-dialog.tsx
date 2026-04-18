'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { resolveChatTitle } from '@/lib/chat-utils'
import type { Chat, ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  selectChatList,
  selectGetMessagesForChat,
  selectOpenOrCreateDefaultChat,
  useChatStore
} from '@/store/chat-store'
import { MessageCircle, PenLine, Search, X } from 'lucide-react'

function getMessagePreview(messages: ChatMessage[]): string {
  for (const msg of messages) {
    if (!Array.isArray(msg.parts)) continue
    if (msg.role === 'user') {
      for (const part of msg.parts) {
        if (part.type === 'text' && part.text.trim()) {
          return part.text.trim()
        }
      }
    }
  }
  return ''
}

function extractAllText(messages: ChatMessage[]): string {
  const parts: string[] = []
  for (const msg of messages) {
    if (!Array.isArray(msg.parts)) continue
    for (const part of msg.parts) {
      if (part.type === 'text' && part.text.trim()) {
        parts.push(part.text.trim())
      }
    }
  }
  return parts.join(' ')
}

type TimeBucket = 'today' | 'yesterday' | 'previous7' | 'previous30' | 'older'

const BUCKET_LABELS: Record<TimeBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  previous7: 'Previous 7 Days',
  previous30: 'Previous 30 Days',
  older: 'Older'
}

const BUCKET_ORDER: TimeBucket[] = ['today', 'yesterday', 'previous7', 'previous30', 'older']

function getBucket(iso: string): TimeBucket {
  const now = new Date()
  const d = new Date(iso)
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((startToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000)
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return 'previous7'
  if (diffDays <= 30) return 'previous30'
  return 'older'
}

type SearchChatsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectChat: (chat: Chat) => void
}

export function SearchChatsDialog({
  open,
  onOpenChange,
  onSelectChat
}: SearchChatsDialogProps): React.JSX.Element {
  const chatList = useChatStore(selectChatList)
  const getMessagesForChat = useChatStore(selectGetMessagesForChat)
  const openOrCreateDefaultChat = useChatStore(selectOpenOrCreateDefaultChat)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const results = useMemo(() => {
    return chatList
      .map((chat) => {
        const messages = getMessagesForChat(chat.id)
        const title = resolveChatTitle(chat)
        const preview = getMessagePreview(messages)

        if (deferredQuery) {
          const allText = extractAllText(messages)
          const titleMatch = title.toLowerCase().includes(deferredQuery)
          const contentMatch = allText.toLowerCase().includes(deferredQuery)
          if (!titleMatch && !contentMatch) return null
        }

        return { chat, title, preview, bucket: getBucket(chat.updatedAt) }
      })
      .filter(Boolean) as Array<{ chat: Chat; title: string; preview: string; bucket: TimeBucket }>
  }, [chatList, deferredQuery, getMessagesForChat])

  const grouped = useMemo(() => {
    const map: Partial<Record<TimeBucket, typeof results>> = {}
    for (const r of results) {
      ;(map[r.bucket] ??= []).push(r)
    }
    return map
  }, [results])

  const flatItems = useMemo(() => {
    const items: Array<{ type: 'new' } | { type: 'chat'; chat: Chat; title: string }> = [{ type: 'new' }]
    for (const bucket of BUCKET_ORDER) {
      const section = grouped[bucket]
      if (!section?.length) continue
      for (const r of section) {
        items.push({ type: 'chat', chat: r.chat, title: r.title })
      }
    }
    return items
  }, [grouped])

  useEffect(() => {
    setActiveIndex(0)
  }, [deferredQuery])

  const handleSelect = useCallback(
    (chat: Chat) => {
      onSelectChat(chat)
      onOpenChange(false)
    },
    [onOpenChange, onSelectChat]
  )

  const handleNewChat = useCallback(() => {
    const created = openOrCreateDefaultChat()
    if (created) onSelectChat(created)
    onOpenChange(false)
  }, [onOpenChange, onSelectChat, openOrCreateDefaultChat])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatItems[activeIndex]
        if (!item) return
        if (item.type === 'new') handleNewChat()
        else handleSelect(item.chat)
      }
    },
    [activeIndex, flatItems, handleNewChat, handleSelect]
  )

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Search chats</DialogTitle>
        <DialogDescription>Search through your conversations</DialogDescription>
      </DialogHeader>
      <DialogContent
        showCloseButton={false}
        className="bg-popover border-border/70 flex max-h-[min(32rem,80vh)] flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl sm:max-w-md"
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Search className="text-muted-foreground/50 size-[18px] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search chats..."
            autoComplete="off"
            spellCheck={false}
            className="text-foreground placeholder:text-muted-foreground/50 h-7 flex-1 bg-transparent text-[15px] outline-none"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground/60 hover:text-foreground -mr-1 flex size-7 items-center justify-center rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="bg-border/50 mx-4 h-px" />

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-2 py-2">
          {/* New chat row */}
          <button
            type="button"
            data-active={activeIndex === 0}
            onClick={handleNewChat}
            onMouseEnter={() => setActiveIndex(0)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
              activeIndex === 0 ? 'bg-accent/70' : 'hover:bg-accent/40'
            )}
          >
            <PenLine className="text-muted-foreground size-[18px]" />
            <span className="text-foreground text-[14px] font-medium">New chat</span>
          </button>

          {/* Grouped chats */}
          {BUCKET_ORDER.map((bucket) => {
            const section = grouped[bucket]
            if (!section?.length) return null

            return (
              <div key={bucket} className="mt-2">
                <p className="text-muted-foreground/60 px-3 py-1.5 text-[11px] font-medium">
                  {BUCKET_LABELS[bucket]}
                </p>
                {section.map((r) => {
                  const idx = flatItems.findIndex(
                    (fi) => fi.type === 'chat' && fi.chat.id === r.chat.id
                  )
                  const isActive = idx === activeIndex

                  return (
                    <button
                      key={r.chat.id}
                      type="button"
                      data-active={isActive}
                      onClick={() => handleSelect(r.chat)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        isActive ? 'bg-accent/70' : 'hover:bg-accent/40'
                      )}
                    >
                      <MessageCircle className="text-muted-foreground/50 size-[18px] shrink-0" />
                      <span className="text-foreground truncate text-[14px]">{r.title}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}

          {results.length === 0 && (
            <div className="flex flex-col items-center gap-1 py-10 text-center">
              <p className="text-muted-foreground text-sm">No conversations found</p>
              <p className="text-muted-foreground/50 text-xs">Try a different search term</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
