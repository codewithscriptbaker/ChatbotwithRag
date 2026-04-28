'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChatComposer, type ChatComposerHandle } from '@/components/chat/chat-composer'
import { ChatSessionProvider } from '@/components/chat/chat-session-context'
import { MessageList } from '@/components/chat/message-list'
import { Separator } from '@/components/ui/separator'
import { type ChatComposerPayload } from '@/lib/chat-attachments'
import type { ChatStreamPhase, ChatStreamStatus } from '@/lib/chat-utils'
import { generateId } from '@/lib/id'
import type { ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  selectCommitConversation,
  selectGetMessagesForChat,
  selectOnChangeChat,
  useChatStore
} from '@/store/chat-store'
import { ArrowRight, FileText, FolderClosed, Loader2, MessageSquareText, Search, Sparkles } from 'lucide-react'

type FolderFile = {
  document_id?: string | null
  filename: string
  status: string
  chunk_count: number
}

type FolderData = {
  folder_id: string
  name: string
  system_prompt: string
  files: FolderFile[]
}

type FolderChatProps = {
  folderId: string
}

const CHAT_COLUMN_MAX_WIDTH = 'max-w-[60rem]'
const SAFE_AREA_HORIZONTAL_PADDING =
  'pr-[max(env(safe-area-inset-right),1rem)] pl-[max(env(safe-area-inset-left),1rem)] md:pr-[max(env(safe-area-inset-right),1.5rem)] md:pl-[max(env(safe-area-inset-left),1.5rem)] lg:pr-[max(env(safe-area-inset-right),2rem)] lg:pl-[max(env(safe-area-inset-left),2rem)]'
const CHAT_COLUMN_CLASS = `@container/chat mx-auto w-full ${CHAT_COLUMN_MAX_WIDTH} ${SAFE_AREA_HORIZONTAL_PADDING}`

const FOLDER_SUGGESTIONS = [
  { icon: MessageSquareText, label: 'Summarize files', prompt: 'Summarize the key points from all uploaded files' },
  { icon: Search, label: 'Find info', prompt: 'Find information about ' },
  { icon: Sparkles, label: 'Key insights', prompt: 'What are the most important insights from these documents?' },
  { icon: FileText, label: 'Compare files', prompt: 'Compare and contrast the uploaded documents' }
]

function FolderWelcome({
  folderName,
  folder,
  composerRef
}: {
  folderName: string
  folder: FolderData | null
  composerRef: React.RefObject<ChatComposerHandle | null>
}): React.JSX.Element {
  const readyFilesCount = folder?.files.filter((f) => f.status === 'ready').length ?? 0

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
            <FolderClosed className="size-6" />
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
            {folderName}
          </h1>
          <p className="text-muted-foreground max-w-md text-[15px] leading-relaxed text-balance">
            Ask anything about this folder&apos;s uploaded files.
          </p>
        </div>

        <div className="w-full max-w-2xl">
          <ChatComposer ref={composerRef} />
        </div>

        <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
          {FOLDER_SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
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

        {!!folder && folder.files.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {folder.files.map((file, index) => (
              <span
                key={file.document_id ?? `${file.filename}-${index}`}
                className={cn(
                  'border-border/60 hover:border-border hover:bg-muted/50 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-all duration-150',
                  file.status === 'ready' ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <FileText className="size-3.5" />
                {file.filename}
              </span>
            ))}
            {readyFilesCount > 0 && (
              <span className="text-muted-foreground/60 flex items-center px-2 text-[11px]">
                {readyFilesCount} file{readyFilesCount > 1 ? 's' : ''} ready
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function FolderChat({ folderId }: FolderChatProps): React.JSX.Element {
  const searchParams = useSearchParams()
  const fallbackFolderName = searchParams.get('name')?.trim() || 'Folder Chat'
  const folderChatId = `folder:${folderId}`
  const composerRef = useRef<ChatComposerHandle>(null)
  const onChangeChat = useChatStore(selectOnChangeChat)
  const getMessagesForChat = useChatStore(selectGetMessagesForChat)
  const commitConversation = useChatStore(selectCommitConversation)

  const [folder, setFolder] = useState<FolderData | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoadingFolder, setIsLoadingFolder] = useState(true)
  const [composerError, setComposerError] = useState<string | null>(null)

  useEffect(() => {
    const loadFolder = async () => {
      setIsLoadingFolder(true)
      try {
        const response = await fetch('/api/rag/folders', { cache: 'no-store' })
        if (!response.ok) return
        const folders = (await response.json()) as FolderData[]
        const matched = folders.find((item) => item.folder_id === folderId) ?? null
        setFolder(matched)
      } catch {
        // keep usable
      } finally {
        setIsLoadingFolder(false)
      }
    }
    void loadFolder()
  }, [folderId])

  const folderDisplayName = folder?.name || fallbackFolderName

  useEffect(() => {
    const existingMessages = getMessagesForChat(folderChatId)
    if (existingMessages.length > 0) {
      setMessages(existingMessages)
      return
    }
    setMessages([])
  }, [folderChatId, getMessagesForChat])

  useEffect(() => {
    const now = new Date().toISOString()
    onChangeChat({
      id: folderChatId,
      title: folderDisplayName,
      createdAt: now,
      updatedAt: now,
      folderId,
      folderName: folderDisplayName
    })
  }, [folderChatId, folderDisplayName, folderId, onChangeChat])

  const handleSend = useCallback(
    async (payload: ChatComposerPayload): Promise<boolean> => {
      const question = payload.text.trim()
      if (!question) return false

      setIsSending(true)
      setComposerError(null)

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        parts: [{ type: 'text', text: question }],
        createdAt: new Date()
      }
      const messagesWithUser = [...messages, userMsg]
      setMessages(messagesWithUser)
      commitConversation(folderChatId, messagesWithUser, { persist: true, updateMeta: true })

      try {
        const formData = new FormData()
        formData.append('question', question)
        const response = await fetch(`/api/rag/folders/${folderId}/chat`, {
          method: 'POST',
          body: formData,
        })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { detail?: string }
          throw new Error(body.detail || 'Folder chat failed')
        }
        const body = (await response.json()) as { answer?: string }
        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          parts: [{ type: 'text', text: body.answer || 'No response generated.' }],
          createdAt: new Date()
        }
        const completedMessages = [...messagesWithUser, assistantMsg]
        setMessages(completedMessages)
        commitConversation(folderChatId, completedMessages, { persist: true, updateMeta: true })
        return true
      } catch (e) {
        const errText = e instanceof Error ? e.message : 'Unknown error'
        setComposerError(errText)
        return false
      } finally {
        setIsSending(false)
      }
    },
    [commitConversation, folderChatId, folderId, messages]
  )

  const handleStop = useCallback(() => {
    setIsSending(false)
  }, [])

  const handleClear = useCallback(() => {
    setMessages([])
    commitConversation(folderChatId, [], { persist: true, updateMeta: true })
    setComposerError(null)
  }, [commitConversation, folderChatId])

  const handleDismissError = useCallback(() => {
    setComposerError(null)
  }, [])

  const noopRegenerate = useCallback(async (): Promise<boolean> => false, [])

  const streamStatus: ChatStreamStatus = isSending ? 'streaming' : 'ready'
  const streamPhase: ChatStreamPhase = isSending ? 'streaming' : 'idle'

  if (isLoadingFolder) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }

  return (
    <ChatSessionProvider
      messages={messages}
      streamStatus={streamStatus}
      streamPhase={streamPhase}
      regeneratingAssistantId={null}
      regeneratingPhase="idle"
      error={null}
      onDismissError={handleDismissError}
      onRegenerateAssistant={noopRegenerate}
      isChatHydrated={true}
      hasActiveChat={true}
      isSending={isSending}
      composerError={composerError}
      setComposerError={setComposerError}
      onClear={handleClear}
      onSend={handleSend}
      onStop={handleStop}
    >
      {messages.length === 0 ? (
        <FolderWelcome
          folderName={folderDisplayName}
          folder={folder}
          composerRef={composerRef}
        />
      ) : (
        <div className="bg-background text-foreground relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <h1 className="sr-only">{folderDisplayName} — Folder Chat</h1>
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            <div className={`${CHAT_COLUMN_CLASS} relative flex-1 pt-5 pb-4`}>
              <MessageList />
            </div>
          </div>
          <div className="bg-background relative shrink-0">
            <Separator className="bg-border/60" />
            <div className={`${CHAT_COLUMN_CLASS} pt-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]`}>
              <ChatComposer ref={composerRef} />
            </div>
          </div>
        </div>
      )}
    </ChatSessionProvider>
  )
}
