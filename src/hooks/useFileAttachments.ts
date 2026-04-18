import { useCallback, useRef, useState, type SetStateAction } from 'react'
import { MAX_IMAGE_SIZE } from '@/lib/chat-attachment-shared'
import {
  convertImageToSupportedFormat,
  createUploadedDocument,
  createUploadedImage,
  getImageMimeType,
  isDocumentFile,
  isImageFile,
  readFileAsDataUrl,
  type UploadedDocument,
  type UploadedImage
} from '@/lib/chat-attachments'
import { formatSizeInMB } from '@/lib/size'
import { toast } from 'sonner'

const MAX_IMAGE_SIZE_LABEL = formatSizeInMB(MAX_IMAGE_SIZE)

interface UseFileAttachmentsReturn {
  uploadedImages: UploadedImage[]
  uploadedDocuments: UploadedDocument[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  handleImagePreviewError: (imageId: string, url: string) => void
  removeImage: (id: string) => void
  removeDocument: (id: string) => void
  addNoteAsDocument: (input: { title: string; content: string; noteId?: string }) => Promise<void>
  resetAttachments: () => void
  restoreAttachments: (images: UploadedImage[], documents: UploadedDocument[]) => void
  hasAttachments: boolean
  hasCurrentAttachments: () => boolean
}

type QueuedImageConversions = Array<Promise<UploadedImage | null>>

type UploadClassification = {
  documentFiles: File[]
  imageConversions: QueuedImageConversions
}

export function useFileAttachments(): UseFileAttachmentsReturn {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const failedPreviewIdsRef = useRef<Set<string>>(new Set())
  const uploadedImagesRef = useRef<UploadedImage[]>([])
  const uploadedDocumentsRef = useRef<UploadedDocument[]>([])

  const updateUploadedImages = useCallback((nextState: SetStateAction<UploadedImage[]>) => {
    setUploadedImages((currentImages) => {
      const nextImages = typeof nextState === 'function' ? nextState(currentImages) : nextState

      uploadedImagesRef.current = nextImages

      const currentImageIds = new Set(nextImages.map(({ id }) => id))
      for (const id of failedPreviewIdsRef.current) {
        if (!currentImageIds.has(id)) {
          failedPreviewIdsRef.current.delete(id)
        }
      }

      return nextImages
    })
  }, [])

  const updateUploadedDocuments = useCallback((nextState: SetStateAction<UploadedDocument[]>) => {
    setUploadedDocuments((currentDocuments) => {
      const nextDocuments =
        typeof nextState === 'function' ? nextState(currentDocuments) : nextState
      uploadedDocumentsRef.current = nextDocuments
      return nextDocuments
    })
  }, [])

  const convertImageFile = useCallback(async (file: File): Promise<UploadedImage | null> => {
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const converted = await convertImageToSupportedFormat(dataUrl, getImageMimeType(file))
      return createUploadedImage({
        url: converted.url,
        mimeType: converted.mimeType,
        name: file.name || undefined
      })
    } catch (error) {
      console.error('Error reading file:', error)
      toast.error(
        file.name
          ? `Unsupported image format: ${file.name}. Supported: JPEG, PNG, GIF, WebP`
          : 'Unsupported image format. Supported: JPEG, PNG, GIF, WebP'
      )
      return null
    }
  }, [])

  const addConvertedImages = useCallback(
    async (conversions: Array<Promise<UploadedImage | null>>) => {
      if (conversions.length === 0) {
        return
      }

      const results = await Promise.all(conversions)
      const successful = results.filter((image): image is UploadedImage => image !== null)
      if (successful.length > 0) {
        updateUploadedImages((prev) => [...prev, ...successful])
      }
    },
    [updateUploadedImages]
  )

  const queueImageConversion = useCallback(
    (file: File, conversions: QueuedImageConversions, source: 'upload' | 'paste') => {
      if (file.size > MAX_IMAGE_SIZE) {
        if (source === 'upload') {
          toast.error(`Image too large: ${file.name}. Maximum size is ${MAX_IMAGE_SIZE_LABEL}.`)
        } else {
          toast.error(`Image too large to paste. Maximum size is ${MAX_IMAGE_SIZE_LABEL}.`)
        }
        return
      }

      conversions.push(convertImageFile(file))
    },
    [convertImageFile]
  )

  const classifyUploadedFiles = useCallback(
    (files: FileList): UploadClassification => {
      const documentFiles: File[] = []
      const imageConversions: QueuedImageConversions = []

      for (const file of Array.from(files)) {
        if (isImageFile(file)) {
          queueImageConversion(file, imageConversions, 'upload')
          continue
        }

        if (isDocumentFile(file)) {
          documentFiles.push(file)
          continue
        }

        toast.error(`Unsupported file type: ${file.name}`)
      }

      return { documentFiles, imageConversions }
    },
    [queueImageConversion]
  )

  const parseUploadedDocuments = useCallback(
    async (documentFiles: File[]): Promise<UploadedDocument[]> => {
      if (documentFiles.length === 0) {
        return []
      }

      try {
        const { parseFile } = await import('@/lib/file-parser')
        const results = await Promise.allSettled(
          documentFiles.map(async (file) => {
            const parsed = await parseFile(file)
            let ragDocumentId: string | undefined

            try {
              const formData = new FormData()
              formData.append('file', file)

              const uploadResponse = await fetch('/api/rag/upload', {
                method: 'POST',
                body: formData
              })

              const uploadPayload = (await uploadResponse.json()) as {
                document_id?: string
                detail?: string
              }

              if (!uploadResponse.ok) {
                throw new Error(uploadPayload.detail || 'Failed to index file for retrieval')
              }

              ragDocumentId =
                typeof uploadPayload.document_id === 'string'
                  ? uploadPayload.document_id
                  : undefined
            } catch (ingestError) {
              console.error('Failed to ingest document embeddings:', ingestError)
              toast.error(
                ingestError instanceof Error
                  ? ingestError.message
                  : `Failed to ingest file: ${file.name}`
              )
            }

            return {
              document: createUploadedDocument(parsed),
              ragDocumentId
            }
          })
        )
        const parsedDocuments: UploadedDocument[] = []

        for (const [index, result] of results.entries()) {
          const file = documentFiles[index]
          if (!file) {
            continue
          }

          if (result.status === 'fulfilled') {
            parsedDocuments.push({
              ...result.value.document,
              ragDocumentId: result.value.ragDocumentId
            })
            toast.success(
              result.value.ragDocumentId
                ? `File "${file.name}" uploaded and indexed`
                : `File "${file.name}" uploaded (indexing unavailable)`
            )
            continue
          }

          console.error('Error parsing file:', result.reason)
          toast.error(`Failed to parse file: ${file.name}`)
        }

        return parsedDocuments
      } catch (error) {
        console.error('Error loading file parser:', error)
        for (const file of documentFiles) {
          toast.error(`Failed to parse file: ${file.name}`)
        }
        return []
      }
    },
    []
  )

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      const { documentFiles, imageConversions } = classifyUploadedFiles(files)
      const parseDocumentsTask = parseUploadedDocuments(documentFiles)

      await addConvertedImages(imageConversions)

      const parsedDocuments = await parseDocumentsTask
      if (parsedDocuments.length > 0) {
        updateUploadedDocuments((prev) => [...prev, ...parsedDocuments])
      }

      const fileInput = fileInputRef.current
      if (fileInput) {
        fileInput.value = ''
      }
    },
    [addConvertedImages, classifyUploadedFiles, parseUploadedDocuments, updateUploadedDocuments]
  )

  const removeImage = useCallback(
    (id: string) => {
      updateUploadedImages((prev) => prev.filter((image) => image.id !== id))
    },
    [updateUploadedImages]
  )

  const removeDocument = useCallback(
    (id: string) => {
      updateUploadedDocuments((prev) => prev.filter((document) => document.id !== id))
    },
    [updateUploadedDocuments]
  )

  const addNoteAsDocument = useCallback(
    async ({ title, content, noteId }: { title: string; content: string; noteId?: string }) => {
      const normalizedTitle = title.trim() || 'Untitled note'
      const normalizedContent = content.trim()
      if (!normalizedContent) {
        toast.error('This note is empty and cannot be attached.')
        return
      }

      let ragDocumentId: string | undefined
      try {
        const requestBody = {
          note_id: noteId ?? normalizedTitle.toLowerCase().replace(/\s+/g, '-'),
          title: normalizedTitle,
          content: normalizedContent
        }
        const response = await fetch('/api/rag/notes/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        const payload = (await response.json()) as { document_id?: string; detail?: string }
        if (!response.ok) {
          throw new Error(payload.detail || 'Failed to index note for retrieval')
        }
        ragDocumentId = payload.document_id
      } catch (error) {
        console.error('Failed to ingest note embeddings:', error)
        toast.error(
          error instanceof Error ? error.message : 'Failed to index note for retrieval'
        )
      }

      const noteDocument: UploadedDocument = createUploadedDocument({
        name: normalizedTitle,
        content: normalizedContent,
        mimeType: 'text/plain',
        images: []
      })

      updateUploadedDocuments((prev) => [
        ...prev,
        { ...noteDocument, sourceType: 'note', ragDocumentId }
      ])
      toast.success(
        ragDocumentId
          ? `Note "${normalizedTitle}" attached and indexed`
          : `Note "${normalizedTitle}" attached (indexing unavailable)`
      )
    },
    [updateUploadedDocuments]
  )

  const handleImagePreviewError = useCallback(
    (id: string, url: string) => {
      const currentImage = uploadedImagesRef.current.find((image) => image.id === id)
      if (!currentImage || currentImage.url !== url || failedPreviewIdsRef.current.has(id)) {
        return
      }

      failedPreviewIdsRef.current.add(id)
      updateUploadedImages((prev) => {
        const imageToRemove = prev.find((image) => image.id === id)
        if (!imageToRemove || imageToRemove.url !== url) {
          return prev
        }

        return prev.filter((image) => image.id !== id)
      })
      toast.error('Failed to load the image preview. Try uploading it again.')
    },
    [updateUploadedImages]
  )

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = event.clipboardData?.items
      if (!items) return

      const pastedImageConversions: Array<Promise<UploadedImage | null>> = []
      let hasPastedImage = false
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item?.type?.startsWith('image/')) continue

        const file = item.getAsFile()
        if (!file) continue

        hasPastedImage = true
        queueImageConversion(file, pastedImageConversions, 'paste')
      }

      if (!hasPastedImage) {
        return
      }

      // Prevent browsers from inserting plain-text clipboard artifacts into the textarea
      // when image paste is handled as an attachment.
      event.preventDefault()
      void addConvertedImages(pastedImageConversions)
    },
    [addConvertedImages, queueImageConversion]
  )

  const resetAttachments = useCallback(() => {
    updateUploadedImages([])
    updateUploadedDocuments([])
  }, [updateUploadedDocuments, updateUploadedImages])

  const restoreAttachments = useCallback(
    (images: UploadedImage[], documents: UploadedDocument[]) => {
      updateUploadedImages(images)
      updateUploadedDocuments(documents)
    },
    [updateUploadedDocuments, updateUploadedImages]
  )

  const hasAttachments = uploadedImages.length > 0 || uploadedDocuments.length > 0

  const hasCurrentAttachments = useCallback(
    () => uploadedImagesRef.current.length > 0 || uploadedDocumentsRef.current.length > 0,
    []
  )

  return {
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
  }
}
