'use client'

import { forwardRef, memo, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { useChatComposerContext } from '@/components/chat/chat-session-context'
import { useFileAttachments } from '@/hooks/useFileAttachments'
import { useInViewport } from '@/hooks/useInViewport'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { type NoteItem, useNotesStore } from '@/store/notes-store'

import { ComposerAttachments } from './composer/composer-attachments'
import { ComposerError } from './composer/composer-error'
import { ComposerTextarea } from './composer/composer-textarea'
import { ComposerToolbar } from './composer/composer-toolbar'

export interface ChatComposerHandle {
  focus: () => void
}

const ChatComposerComponent = forwardRef<ChatComposerHandle, Record<string, never>>(
  function ChatComposer(_, ref): React.JSX.Element {
    const {
      isChatHydrated,
      hasActiveChat,
      isSending,
      composerError,
      setComposerError,
      onSend,
      onStop
    } = useChatComposerContext()

    const [message, setMessage] = useState('')
    const [isComposerFocused, setIsComposerFocused] = useState(false)
    const composingRef = useRef(false)
    const messageRef = useRef(message)
    const [voiceButtonRef, isVoiceButtonInView] = useInViewport<HTMLButtonElement>()

    const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
    const notes = useNotesStore((state) => state.notes)
    const hydrateNotes = useNotesStore((state) => state.hydrate)

    const { isListening, interimTranscript, toggleVoiceInput, resetTranscript } =
      useVoiceRecognition({
        onTranscript: useCallback((text: string) => {
          messageRef.current += text
          setMessage(messageRef.current)
        }, [])
      })

    const {
      uploadedImages,
      uploadedDocuments,
      fileInputRef,
      handleFileUpload,
      handlePaste,
      handleImagePreviewError,
      removeImage,
      removeDocument,
      addNoteAsDocument,
      resetAttachments,
      restoreAttachments,
      hasAttachments,
      hasCurrentAttachments
    } = useFileAttachments()

    const chatInputId = useId()
    const helperTextId = useId()
    const errorTextId = useId()

    const hasText = message.trim().length > 0
    const hasContent = hasText || hasAttachments
    const canInteract = isChatHydrated && hasActiveChat
    const canSend = canInteract && !isSending && hasContent

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          textAreaRef.current?.focus()
        }
      }),
      []
    )

    const resetComposerState = useCallback(() => {
      messageRef.current = ''
      setMessage('')
      resetAttachments()
      resetTranscript()
    }, [resetAttachments, resetTranscript])

    const handleSubmit = useCallback(
      async (event: React.SyntheticEvent) => {
        event.preventDefault()

        if (!canSend) {
          return
        }

        const input = message.trim()

        const draftMessage = message
        const draftImages = uploadedImages
        const draftDocuments = uploadedDocuments

        resetComposerState()
        setComposerError(null)

        let accepted = false
        try {
          accepted = await onSend({
            text: input,
            uploadedImages: draftImages,
            uploadedDocuments: draftDocuments
          })
        } catch (error) {
          console.error(error)
          setComposerError('Something went wrong. Please try again.')
          accepted = false
        }

        if (!accepted) {
          const shouldRestoreDraft = messageRef.current.length === 0 && !hasCurrentAttachments()

          if (shouldRestoreDraft) {
            messageRef.current = draftMessage
            setMessage(draftMessage)
            restoreAttachments(draftImages, draftDocuments)
            textAreaRef.current?.focus()
          }
        }
      },
      [
        hasCurrentAttachments,
        canSend,
        message,
        onSend,
        resetComposerState,
        restoreAttachments,
        setComposerError,
        uploadedDocuments,
        uploadedImages
      ]
    )

    const handleKeypress = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
          e.preventDefault()
          if (!canSend) {
            return
          }
          handleSubmit(e)
        }
      },
      [canSend, handleSubmit]
    )

    const handleMessageChange = useCallback(
      (value: string) => {
        messageRef.current = value
        setMessage(value)
        setComposerError(null)
      },
      [setComposerError]
    )

    const showPlaceholder = !message && !isComposerFocused && !hasAttachments

    useEffect(() => {
      hydrateNotes()
    }, [hydrateNotes])

    const handleInsertNote = useCallback(
      async (note: NoteItem) => {
        const plainText = note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (!plainText) return
        await addNoteAsDocument({
          noteId: note.id,
          title: note.title,
          content: plainText
        })
        setComposerError(null)
        textAreaRef.current?.focus()
      },
      [addNoteAsDocument, setComposerError]
    )

    useEffect(() => {
      const handleEditMessage = (event: Event) => {
        const customEvent = event as CustomEvent<{ text?: string }>
        const nextText = customEvent.detail?.text
        if (typeof nextText !== 'string') return
        messageRef.current = nextText
        setMessage(nextText)
        setComposerError(null)
        textAreaRef.current?.focus()
      }

      window.addEventListener('chat:edit-user-message', handleEditMessage as EventListener)
      return () => {
        window.removeEventListener('chat:edit-user-message', handleEditMessage as EventListener)
      }
    }, [setComposerError])

    return (
      <>
        <div className="relative">
          <div className="bg-card border-border/80 focus-within:border-border has-[textarea[aria-invalid=true]]:border-destructive/70 has-[textarea[aria-invalid=true]]:ring-destructive/20 flex flex-col rounded-[1.75rem] border shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow,background-color] duration-150 ease-out focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.08)] has-[textarea[aria-invalid=true]]:ring-2">
            {hasAttachments && (
              <ComposerAttachments
                uploadedImages={uploadedImages}
                uploadedDocuments={uploadedDocuments}
                onRemoveImage={removeImage}
                onRemoveDocument={removeDocument}
                onImagePreviewError={handleImagePreviewError}
              />
            )}
            <ComposerTextarea
              textAreaRef={textAreaRef}
              message={message}
              disabled={!canInteract}
              showPlaceholder={showPlaceholder}
              interimTranscript={interimTranscript}
              isVoiceButtonInView={isVoiceButtonInView}
              composerError={composerError}
              chatInputId={chatInputId}
              helperTextId={helperTextId}
              errorTextId={errorTextId}
              onMessageChange={handleMessageChange}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => setIsComposerFocused(false)}
              onCompositionStart={() => {
                composingRef.current = true
              }}
              onCompositionEnd={() => {
                composingRef.current = false
              }}
              onKeyDown={handleKeypress}
              onPaste={handlePaste}
            />

            {composerError && <ComposerError errorTextId={errorTextId} message={composerError} />}

            <ComposerToolbar
              canInteract={canInteract}
              isSending={isSending}
              canSend={canSend}
              isListening={isListening}
              isVoiceButtonInView={isVoiceButtonInView}
              voiceButtonRef={voiceButtonRef}
              fileInputRef={fileInputRef}
              notes={notes}
              onFileUpload={handleFileUpload}
              onInsertNote={handleInsertNote}
              onVoiceToggle={toggleVoiceInput}
              onSend={handleSubmit}
              onStop={onStop}
            />
          </div>
          <p className="text-muted-foreground/90 mt-2 hidden px-2 text-[11px] leading-relaxed text-pretty md:block">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </>
    )
  }
)

export const ChatComposer = memo(ChatComposerComponent)
ChatComposer.displayName = 'ChatComposer'
