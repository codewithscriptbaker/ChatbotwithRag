'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  FileText,
  FileUp,
  FolderOpen,
  Loader2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export type KnowledgeFolderFile = {
  document_id?: string | null
  filename: string
  status: string
  chunk_count: number
  error?: string | null
}

export type KnowledgeFolder = {
  folder_id: string
  name: string
  system_prompt: string
  background_image_name?: string | null
  files: KnowledgeFolderFile[]
}

type SidebarKnowledgeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (folder: KnowledgeFolder) => void
}

export function SidebarKnowledgeDialog({
  open,
  onOpenChange,
  onSaved
}: SidebarKnowledgeDialogProps): React.JSX.Element {
  const folderNameId = useId()
  const systemPromptId = useId()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)

  const [folderName, setFolderName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<
    Array<{
      key: string
      file: File
      status: 'queued' | 'embedding' | 'ready' | 'failed'
      chunkCount: number
      error: string | null
    }>
  >([])
  const [imageName, setImageName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const canSave = folderName.trim().length > 0 && !isSaving
  const selectedFilesCount = selectedFiles.length
  const hasFailures = useMemo(
    () => selectedFiles.some((file) => file.status === 'failed'),
    [selectedFiles]
  )

  const resetState = () => {
    setFolderName('')
    setSystemPrompt('')
    setBackgroundImage(null)
    setImageName(null)
    setSelectedFiles([])
    setIsSaving(false)
  }

  const handleSave = async () => {
    if (!canSave) return
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('folder_name', folderName.trim())
      formData.append('system_prompt', systemPrompt)
      if (backgroundImage) {
        formData.append('background_image', backgroundImage)
      }
      if (selectedFilesCount > 0) {
        setSelectedFiles((prev) =>
          prev.map((item) => ({
            ...item,
            status: 'embedding',
            error: null,
          }))
        )
      }

      for (const item of selectedFiles) {
        formData.append('files', item.file)
      }

      const response = await fetch('/api/rag/folders', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string }
        throw new Error(payload.detail || 'Failed to save folder')
      }

      const payload = (await response.json()) as KnowledgeFolder
      if (payload.files.length > 0) {
        const statusByFilename = new Map(
          payload.files.map((fileResult) => [fileResult.filename, fileResult])
        )
        setSelectedFiles((prev) =>
          prev.map((item) => {
            const result = statusByFilename.get(item.file.name)
            if (!result) return item
            return {
              ...item,
              status: result.status === 'ready' ? 'ready' : 'failed',
              chunkCount: result.chunk_count,
              error: result.error ?? null,
            }
          })
        )
      }
      onSaved(payload)
      toast.success(`Folder "${payload.name}" saved`)
      if (!payload.files.some((file) => file.status !== 'ready')) {
        window.setTimeout(() => {
          resetState()
          onOpenChange(false)
        }, 450)
      }
    } catch (error) {
      setSelectedFiles((prev) =>
        prev.map((item) =>
          item.status === 'embedding'
            ? { ...item, status: 'failed', error: 'Upload failed. Please retry.' }
            : item
        )
      )
      toast.error(error instanceof Error ? error.message : 'Failed to save folder')
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Create folder</DialogTitle>
        <DialogDescription>Create a folder with prompt and knowledge files.</DialogDescription>
      </DialogHeader>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'bg-card/90 border-border/60 overflow-hidden rounded-3xl p-0 shadow-2xl backdrop-blur-xl sm:max-w-3xl',
          'before:from-primary/6 before:to-transparent before:absolute before:inset-0 before:bg-gradient-to-br before:content-[""]'
        )}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between px-7 pt-6 pb-2">
            <div>
              <h2 className="text-foreground text-[1.9rem] leading-none font-semibold tracking-tight">
                Create Folder
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Organize prompts, background, and knowledge in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-md p-1.5 transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-5 px-7 pb-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor={folderNameId} className="text-muted-foreground text-sm font-medium">
                  Folder Name
                </label>
                <Input
                  id={folderNameId}
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  placeholder="Enter folder name"
                  className="bg-background/70 h-10 border-white/10"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-muted-foreground text-sm font-medium">Folder Background Image</span>
                <div className="border-border/70 bg-background/55 flex h-10 items-center justify-between rounded-lg border px-3">
                  <span className="text-muted-foreground truncate text-sm">
                    {imageName ?? 'No file selected'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    className="h-7 px-2.5 text-xs"
                  >
                    <Upload className="size-3.5" />
                    Upload
                  </Button>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    setBackgroundImage(file ?? null)
                    setImageName(file?.name ?? null)
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={systemPromptId} className="text-muted-foreground text-sm font-medium">
                System Prompt
              </label>
              <Textarea
                id={systemPromptId}
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder="Write your model system prompt content here."
                className="bg-background/70 min-h-[108px] border-white/10 text-[0.95rem] leading-relaxed"
              />
              <p className="text-muted-foreground/80 text-xs">
                e.g. You are Mario from Super Mario Bros, acting as an assistant.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">Knowledge</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button type="button" variant="outline" size="sm" className="rounded-full px-4">
                  <FolderOpen className="size-3.5" />
                  Select Knowledge
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4"
                  disabled={isSaving}
                  onClick={() => filesInputRef.current?.click()}
                >
                  <FileUp className="size-3.5" />
                  Upload Files
                </Button>
                {selectedFilesCount > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {selectedFilesCount} file(s) selected
                  </span>
                )}
                <input
                  ref={filesInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const incomingFiles = Array.from(event.target.files ?? [])
                    if (incomingFiles.length === 0) return

                    setSelectedFiles((prev) => {
                      const existingKeys = new Set(prev.map((item) => item.key))
                      const additions = incomingFiles
                        .map((file) => ({
                          key: `${file.name}-${file.size}-${file.lastModified}`,
                          file,
                          status: 'queued' as const,
                          chunkCount: 0,
                          error: null as string | null,
                        }))
                        .filter((item) => !existingKeys.has(item.key))
                      return [...prev, ...additions]
                    })
                    event.currentTarget.value = ''
                  }}
                />
              </div>
              {selectedFilesCount > 0 && (
                <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-lg sm:grid-cols-2">
                  {selectedFiles.map((item) => (
                    <div
                      key={item.key}
                      className={cn(
                        'border-border/60 bg-background/45 flex items-center gap-2 rounded-xl border px-3 py-2',
                        item.status === 'failed' && 'border-destructive/50'
                      )}
                    >
                      <FileText className="text-muted-foreground/80 size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground truncate text-sm font-medium">
                          {item.file.name}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {item.status === 'queued' && 'Waiting to process'}
                          {item.status === 'embedding' && 'Generating embeddings...'}
                          {item.status === 'ready' &&
                            `Ready${item.chunkCount > 0 ? ` • ${item.chunkCount} chunks` : ''}`}
                          {item.status === 'failed' && (item.error || 'Failed')}
                        </div>
                      </div>
                      {item.status === 'embedding' && (
                        <Loader2 className="text-primary size-4 shrink-0 animate-spin" />
                      )}
                      {item.status === 'ready' && (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      )}
                      {item.status === 'failed' && (
                        <XCircle className="text-destructive size-4 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground/80 text-xs">
                To attach knowledge base here, add them to the workspace first.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-full px-6"
              >
                {isSaving
                  ? selectedFilesCount > 0
                    ? 'Embedding files...'
                    : 'Saving...'
                  : hasFailures
                    ? 'Save Again'
                    : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
