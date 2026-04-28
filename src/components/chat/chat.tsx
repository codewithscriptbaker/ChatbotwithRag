'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ChatComposer, type ChatComposerHandle } from '@/components/chat/chat-composer'
import { ChatSessionProvider } from '@/components/chat/chat-session-context'
import { InlineSelectionPopup } from '@/components/chat/inline-selection-popup'
import { MessageList } from '@/components/chat/message-list'
import {
  SelectionActionBubble,
  type SelectionAction
} from '@/components/chat/selection-action-bubble'
import { Separator } from '@/components/ui/separator'
import type { ChatComposerPayload } from '@/lib/chat-attachments'
import { useChatSession } from '@/hooks/useChatSession'
import { useTextSelection } from '@/hooks/useTextSelection'
import { isMobileViewport } from '@/lib/viewport'
import { selectCurrentChatId, selectIsChatHydrated, useChatStore } from '@/store/chat-store'
import { ArrowDown, ArrowRight, BookOpen, Code2, Lightbulb, Loader2, PenLine } from 'lucide-react'
import { StickToBottom } from 'use-stick-to-bottom'

const CHAT_COLUMN_MAX_WIDTH = 'max-w-[60rem]'
const SAFE_AREA_HORIZONTAL_PADDING =
  'pr-[max(env(safe-area-inset-right),1rem)] pl-[max(env(safe-area-inset-left),1rem)] md:pr-[max(env(safe-area-inset-right),1.5rem)] md:pl-[max(env(safe-area-inset-left),1.5rem)] lg:pr-[max(env(safe-area-inset-right),2rem)] lg:pl-[max(env(safe-area-inset-left),2rem)]'
const CHAT_COLUMN_CLASS = `@container/chat mx-auto w-full ${CHAT_COLUMN_MAX_WIDTH} ${SAFE_AREA_HORIZONTAL_PADDING}`
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotionPreference(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener('change', onChange)

  return () => {
    mediaQuery.removeEventListener('change', onChange)
  }
}

function getReducedMotionPreferenceSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function LoadingIndicator(): React.JSX.Element {
  return (
    <Loader2 className="text-muted-foreground size-4 animate-spin motion-reduce:animate-none" />
  )
}

function ActiveChat({
  chatId,
  isChatHydrated
}: {
  chatId: string
  isChatHydrated: boolean
}): React.JSX.Element {
  const composerRef = useRef<ChatComposerHandle>(null)
  const messageAreaRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const { selection, clearSelection } = useTextSelection(messageAreaRef)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [inlinePopup, setInlinePopup] = useState<{
    action: SelectionAction
    text: string
    selection: import('@/hooks/useTextSelection').SelectionData
  } | null>(null)

  const handleSelectionAction = useCallback((action: SelectionAction, text: string) => {
    if (!selection) return
    setInlinePopup({ action, text, selection })
    clearSelection()
    window.getSelection()?.removeAllRanges()
  }, [selection, clearSelection])

  const handleClosePopup = useCallback(() => {
    setInlinePopup(null)
  }, [])

  const {
    messages,
    status,
    streamPhase,
    regeneratingAssistantId,
    regeneratingPhase,
    isLoading,
    streamError,
    composerError,
    setComposerError,
    handleSend,
    handleStop,
    handleClearMessages,
    handleDismissError,
    handleRegenerateAssistant
  } = useChatSession(chatId)
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotionPreference,
    getReducedMotionPreferenceSnapshot,
    () => false
  )
  const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth'

  const scrollToBottom = useCallback(() => {
    bottomSentinelRef.current?.scrollIntoView({ behavior: scrollBehavior, block: 'end' })
  }, [scrollBehavior])

  const handleSendAndFocus = useCallback(
    async (payload: ChatComposerPayload): Promise<boolean> => {
      scrollToBottom()
      if (!isMobileViewport()) {
        composerRef.current?.focus()
      }
      return await handleSend(payload)
    },
    [handleSend, scrollToBottom]
  )

  useEffect(() => {
    if (!isMobileViewport()) {
      composerRef.current?.focus()
    }
  }, [chatId])

  useEffect(() => {
    const root =
      scrollViewportRef.current ??
      (scrollContainerRef.current?.querySelector('.overflow-y-auto') as HTMLDivElement | null)
    if (root && scrollViewportRef.current !== root) {
      scrollViewportRef.current = root
    }
    if (!root || !bottomSentinelRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollToBottom(!entry.isIntersecting)
      },
      {
        root,
        threshold: 0.98
      }
    )

    observer.observe(bottomSentinelRef.current)
    return () => {
      observer.disconnect()
    }
  }, [messages.length, streamPhase, status])

  return (
    <ChatSessionProvider
      messages={messages}
      streamStatus={status}
      streamPhase={streamPhase}
      regeneratingAssistantId={regeneratingAssistantId}
      regeneratingPhase={regeneratingPhase}
      error={streamError}
      onDismissError={handleDismissError}
      onRegenerateAssistant={handleRegenerateAssistant}
      isChatHydrated={isChatHydrated}
      hasActiveChat={Boolean(chatId)}
      isSending={isLoading}
      composerError={composerError}
      setComposerError={setComposerError}
      onClear={handleClearMessages}
      onStop={handleStop}
      onSend={handleSendAndFocus}
    >
      {messages.length === 0 ? (
        <WelcomeScreen composerRef={composerRef} />
      ) : (
        <div className="bg-background text-foreground relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <h1 className="sr-only">Chat conversation</h1>
          <div ref={scrollContainerRef} className="relative min-h-0 flex-1 overflow-hidden">
            <StickToBottom
              className="relative size-full overflow-y-auto"
              initial={scrollBehavior}
              resize={scrollBehavior}
            >
              <StickToBottom.Content className="relative flex min-h-full flex-col">
                <div ref={messageAreaRef} className={`${CHAT_COLUMN_CLASS} relative flex-1 pt-5 pb-4`}>
                  <MessageList />
                  <div ref={bottomSentinelRef} className="h-px w-full" aria-hidden="true" />
                </div>
              </StickToBottom.Content>
            </StickToBottom>
            {showScrollToBottom && (
              <button
                type="button"
                onClick={() => {
                  scrollToBottom()
                  if (!isMobileViewport()) {
                    composerRef.current?.focus()
                  }
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-4 bottom-4 z-20 inline-flex size-9 items-center justify-center rounded-full shadow-md transition-colors"
                aria-label="Scroll to bottom"
                title="Scroll to bottom"
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </button>
            )}
            {selection && !inlinePopup && (
              <SelectionActionBubble
                selection={selection}
                scrollContainerRef={scrollContainerRef}
                onAction={handleSelectionAction}
              />
            )}
            {inlinePopup && (
              <InlineSelectionPopup
                action={inlinePopup.action}
                selectedText={inlinePopup.text}
                selection={inlinePopup.selection}
                scrollContainerRef={scrollContainerRef}
                onClose={handleClosePopup}
              />
            )}
          </div>
          <div className="bg-background relative shrink-0">
            <Separator className="bg-border/60" />
            <div
              className={`${CHAT_COLUMN_CLASS} pt-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]`}
            >
              <ChatComposer ref={composerRef} />
            </div>
          </div>
        </div>
      )}
    </ChatSessionProvider>
  )
}

const SUGGESTIONS = [
  { icon: PenLine, label: 'Write an essay', prompt: 'Help me write a well-structured essay about ' },
  { icon: Code2, label: 'Write code', prompt: 'Write code that ' },
  { icon: Lightbulb, label: 'Brainstorm ideas', prompt: 'Give me creative ideas for ' },
  { icon: BookOpen, label: 'Summarize text', prompt: 'Summarize the following text:\n\n' }
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function WelcomeScreen({
  composerRef
}: {
  composerRef: React.RefObject<ChatComposerHandle | null>
}): React.JSX.Element {
  const handleSuggestionClick = useCallback((prompt: string) => {
    window.dispatchEvent(
      new CustomEvent('chat:edit-user-message', { detail: { text: prompt } })
    )
  }, [])

  return (
    <div className="bg-background text-foreground flex min-h-0 flex-1 flex-col items-center justify-center px-4">
      <div className="relative flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary/10 text-primary mb-1 flex size-14 items-center justify-center rounded-2xl">
            <span className="font-serif text-2xl select-none" aria-hidden="true">&#10087;</span>
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
            {getGreeting()}
          </h1>
          <p className="text-muted-foreground max-w-md text-[15px] leading-relaxed text-balance">
            Ask me anything — write, code, brainstorm, or explore ideas together.
          </p>
        </div>

        <div className="w-full max-w-2xl">
          <ChatComposer ref={composerRef} />
        </div>

        <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
          {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleSuggestionClick(prompt)}
              className="group border-border/60 hover:border-border hover:bg-muted/50 flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-150 hover:shadow-sm"
            >
              <Icon className="text-muted-foreground group-hover:text-primary size-4 transition-colors" aria-hidden="true" />
              <span className="text-foreground text-xs font-medium leading-tight">{label}</span>
              <ArrowRight className="text-muted-foreground/0 group-hover:text-muted-foreground size-3 transition-all duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Chat(): React.JSX.Element {
  const currentChatId = useChatStore(selectCurrentChatId)
  const isChatHydrated = useChatStore(selectIsChatHydrated)

  if (!isChatHydrated || !currentChatId) {
    return (
      <div className="flex h-full min-h-[60dvh] flex-col items-center justify-center">
        <div className="relative mb-6">
          <div className="text-primary/20 font-serif text-6xl select-none md:text-7xl">
            &#10087;
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-primary/10 size-16 rounded-full blur-xl" />
          </div>
        </div>
        <div
          className="bg-card/75 border-border/70 text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border px-7 py-6 shadow-sm"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <LoadingIndicator />
          <span className="text-sm/relaxed tracking-wide text-balance">Preparing your workspace...</span>
        </div>
      </div>
    )
  }

  return <ActiveChat key={currentChatId} chatId={currentChatId} isChatHydrated={isChatHydrated} />
}

export default Chat
