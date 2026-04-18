import { useState, type ReactNode } from 'react'
import { DocumentPreviewDialog } from '@/components/common/document-preview-dialog'
import { ImagePreviewDialog } from '@/components/common/image-preview-dialog'
import type { ChatMessagePart, DocumentAttachmentData } from '@/lib/types'
import { truncateFilenameMiddle } from '@/lib/utils'
import { FileText } from 'lucide-react'

function UserDocumentAttachment({
  doc,
  docIndex
}: {
  doc: DocumentAttachmentData
  docIndex: number
}): React.JSX.Element {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const sourceLabel = doc.sourceType === 'note' ? 'Note' : 'Document'

  return (
    <>
      <button
        type="button"
        className="focus-visible:ring-ring/60 focus-visible:ring-offset-background border-border/60 bg-muted/45 hover:bg-muted/65 mt-2 flex max-w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`Open ${doc.name} preview`}
        onClick={() => setIsPreviewOpen(true)}
      >
        <span className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
          <FileText className="size-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-foreground block truncate text-sm font-medium" title={doc.name}>
            {truncateFilenameMiddle(doc.name, 42)}
          </span>
          <span className="text-muted-foreground block text-xs">
            Click to preview full content
          </span>
        </span>
        <span className="bg-background/80 text-muted-foreground rounded-md px-1.5 py-0.5 text-[11px] font-medium">
          {sourceLabel}
        </span>
      </button>
      {isPreviewOpen ? (
        <DocumentPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          title={doc.name}
          content={doc.content}
          sourceLabel={`${sourceLabel} ${docIndex + 1}`}
        />
      ) : null}
    </>
  )
}

function UserImageFallback({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="bg-muted border-border/40 text-muted-foreground mt-2 flex h-20 w-32 items-center justify-center rounded-lg border text-xs italic">
      {label}
    </div>
  )
}

function UserUploadedImage({ alt, src }: { alt: string; src: string }): React.JSX.Element | null {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  if (!src || failedSrc === src) {
    return <UserImageFallback label="Image failed to load" />
  }

  return (
    <>
      <button
        type="button"
        className="focus-visible:ring-ring/60 focus-visible:ring-offset-background mt-2 block rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label="Open image preview"
        onClick={() => setPreviewOpen(true)}
      >
        {/* Data URLs are already local payloads; Next.js optimization provides no benefit here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-auto max-h-72 w-auto max-w-full rounded-lg transition-opacity hover:opacity-95"
          onError={() => setFailedSrc(src)}
        />
      </button>
      {previewOpen ? (
        <ImagePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} src={src} alt={alt} />
      ) : null}
    </>
  )
}

export function renderUserParts(parts: ChatMessagePart[]): ReactNode {
  let documentIndex = 0
  return parts.map((part, index) => {
    switch (part.type) {
      case 'text':
        return <span key={index}>{part.text}</span>
      case 'file':
        if (part.mediaType.startsWith('image/')) {
          if (!part.url) {
            return <UserImageFallback key={index} label="Image" />
          }

          return (
            <UserUploadedImage key={index} src={part.url} alt={part.filename || 'Uploaded image'} />
          )
        }
        return null
      case 'data-document':
        documentIndex += 1
        return <UserDocumentAttachment key={index} doc={part.data} docIndex={documentIndex - 1} />
      default: {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[message.tsx] Unhandled message part type: ${part.type}`)
        }
        return null
      }
    }
  })
}
