import { useCallback, useEffect, useRef, useState } from 'react'

export type SelectionData = {
  text: string
  rect: DOMRect
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<SelectionData | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => setSelection(null), [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseUp = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          setSelection(null)
          return
        }

        const text = sel.toString().trim()
        if (text.length < 5 || text.length > 3000) {
          setSelection(null)
          return
        }

        const range = sel.getRangeAt(0)
        if (!container.contains(range.commonAncestorContainer)) {
          setSelection(null)
          return
        }

        const isInsideInput = range.commonAncestorContainer.parentElement?.closest(
          'textarea, input, [contenteditable="true"]'
        )
        if (isInsideInput) {
          setSelection(null)
          return
        }

        const rect = range.getBoundingClientRect()
        setSelection({ text, rect })
      }, 150)
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-selection-bubble]')) return
      setSelection(null)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelection(null)
    }

    container.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [containerRef])

  return { selection, clearSelection: clear }
}
