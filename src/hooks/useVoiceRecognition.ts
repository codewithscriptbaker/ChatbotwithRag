import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { toast } from 'sonner'

interface UseVoiceRecognitionOptions {
  onTranscript: (text: string) => void
}

interface UseVoiceRecognitionReturn {
  isListening: boolean
  interimTranscript: string
  toggleVoiceInput: () => void
  resetTranscript: () => void
}

export function useVoiceRecognition({
  onTranscript
}: UseVoiceRecognitionOptions): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const isListeningRef = useRef(false)
  const isTranscribingRef = useRef(false)
  const onTranscriptEvent = useEffectEvent(onTranscript)

  const stopListening = useCallback((): void => {
    setIsListening(false)
    isListeningRef.current = false
  }, [])

  const startListening = useCallback(() => {
    setIsListening(true)
    isListeningRef.current = true
  }, [])

  const cleanupMedia = useCallback(() => {
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop()
      }
      mediaStreamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  const transcribeBlob = useCallback(
    async (audioBlob: Blob) => {
      if (!audioBlob.size) {
        toast.error('No audio captured. Please try again.')
        return
      }

      const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm'
      const file = new File([audioBlob], `voice-input.${extension}`, {
        type: audioBlob.type || 'audio/webm'
      })

      const formData = new FormData()
      formData.append('file', file)

      isTranscribingRef.current = true
      setInterimTranscript('Transcribing...')
      try {
        const res = await fetch('/api/rag/transcribe', {
          method: 'POST',
          body: formData
        })

        const payload = (await res.json()) as { text?: string; detail?: string }
        if (!res.ok) {
          throw new Error(payload.detail || 'Failed to transcribe audio')
        }

        const transcript = payload.text?.trim()
        if (!transcript) {
          toast.error('No transcript produced. Please try speaking more clearly.')
          return
        }

        onTranscriptEvent(`${transcript} `)
      } catch (error) {
        console.error('WhisperX transcription error:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to transcribe audio')
      } finally {
        isTranscribingRef.current = false
        setInterimTranscript('')
      }
    },
    [onTranscriptEvent]
  )

  const toggleVoiceInput = useCallback(async () => {
    if (isTranscribingRef.current) {
      return
    }

    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Audio recording is not supported in your browser.')
      return
    }

    if (isListeningRef.current && mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop()
      } catch (error) {
        console.error('Error stopping audio recording:', error)
        stopListening()
        cleanupMedia()
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : undefined

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        stopListening()
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        })
        cleanupMedia()
        await transcribeBlob(blob)
      }

      recorder.onerror = () => {
        stopListening()
        cleanupMedia()
        setInterimTranscript('')
        toast.error('Audio recording failed')
      }

      chunksRef.current = []
      recorder.start()
      mediaRecorderRef.current = recorder
      setInterimTranscript('Listening...')
      startListening()
      toast.success('Listening... Click again to stop')
    } catch (error) {
      console.error('Error starting audio recording:', error)
      stopListening()
      cleanupMedia()
      setInterimTranscript('')
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser.')
      } else {
        toast.error('Failed to start audio recording')
      }
    }
  }, [cleanupMedia, startListening, stopListening, transcribeBlob])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
        } catch (error) {
          console.error('Error stopping recorder during cleanup:', error)
        }
      }
      cleanupMedia()
    }
  }, [cleanupMedia])

  const resetTranscript = useCallback(() => {
    setInterimTranscript('')
  }, [])

  return {
    isListening,
    interimTranscript,
    toggleVoiceInput,
    resetTranscript
  }
}
