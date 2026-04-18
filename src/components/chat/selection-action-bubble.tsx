'use client'

import { useEffect, useRef, useState } from 'react'
import type { SelectionData } from '@/hooks/useTextSelection'
import { MessageCircleQuestion, Sparkles } from 'lucide-react'

export type SelectionAction = 'ask' | 'explain'

type SelectionActionBubbleProps = {
  selection: SelectionData
  scrollContainerRef: React.RefObject<HTMLElement | null>
  onAction: (action: SelectionAction, text: string) => void
}

export function SelectionActionBubble({
  selection,
  scrollContainerRef,
  onAction
}: SelectionActionBubbleProps): React.JSX.Element {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const scrollEl = scrollContainerRef.current
    if (!scrollEl) return

    const compute = () => {
      const scrollRect = scrollEl.getBoundingClientRect()
      const { rect } = selection

      const top = rect.bottom - scrollRect.top + 6
      const left = rect.left - scrollRect.left + rect.width / 2

      setPos({
        top: Math.max(4, top),
        left: Math.min(Math.max(60, left), scrollRect.width - 60)
      })
    }

    compute()

    const onScroll = () => setPos(null)
    scrollEl.addEventListener('scroll', onScroll, { passive: true, once: true })
    return () => scrollEl.removeEventListener('scroll', onScroll)
  }, [selection, scrollContainerRef])

  if (!pos) return <></>

  return (
    <div
      ref={bubbleRef}
      data-selection-bubble
      className="animate-in fade-in zoom-in-95 absolute z-50 duration-150"
      style={{
        top: pos.top,
        left: pos.left,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="bg-popover/95 border-border/70 flex items-center rounded-xl border p-[3px] shadow-[0_4px_24px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] backdrop-blur-md">
        <button
          type="button"
          onClick={() => onAction('ask', selection.text)}
          className="text-foreground/80 hover:text-foreground hover:bg-accent flex items-center gap-1.5 rounded-lg px-3 py-[5px] text-[12px] font-medium transition-all duration-100 active:scale-[0.97]"
        >
          <MessageCircleQuestion className="size-3.5 opacity-70" />
          Ask
        </button>
        <div className="bg-border/60 mx-px h-4 w-px" />
        <button
          type="button"
          onClick={() => onAction('explain', selection.text)}
          className="text-foreground/80 hover:text-foreground hover:bg-accent flex items-center gap-1.5 rounded-lg px-3 py-[5px] text-[12px] font-medium transition-all duration-100 active:scale-[0.97]"
        >
          <Sparkles className="size-3.5 opacity-70" />
          Explain
        </button>
      </div>
    </div>
  )
}
