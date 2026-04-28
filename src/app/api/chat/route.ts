import type { NextRequest } from 'next/server'
import { AppError } from '@/lib/errors'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'

import { chatRequestSchema, type ChatRequest } from './schema'

const GENERIC_INTERNAL_ERROR_MESSAGE = 'Something went wrong'
const BACKEND_URL = process.env.RAG_BACKEND_URL || 'http://127.0.0.1:8000'

function extractDocumentIds(messages: ChatRequest['messages']): string[] {
  const ids = new Set<string>()

  for (const message of messages) {
    if (message.role !== 'user') continue

    for (const part of message.parts) {
      if (part.type !== 'data-document') continue
      const data = part.data as { ragDocumentId?: unknown } | undefined
      const ragDocumentId = data?.ragDocumentId
      if (typeof ragDocumentId === 'string' && ragDocumentId.trim().length > 0) {
        ids.add(ragDocumentId.trim())
      }
    }
  }

  return Array.from(ids)
}

async function parseRequest(req: NextRequest): Promise<ChatRequest | Response> {
  let payload: unknown

  try {
    payload = await req.json()
  } catch (error) {
    console.warn('[Chat API] Invalid JSON request body', error)
    return new AppError('invalid_json', 'Invalid JSON in request body').toResponse()
  }

  const parsed = chatRequestSchema.safeParse(payload)
  if (!parsed.success) {
    return new AppError('invalid_request', 'Invalid request body').toResponse()
  }

  return parsed.data
}

export async function POST(req: NextRequest): Promise<Response> {
  const parsed = await parseRequest(req)
  if (parsed instanceof Response) return parsed

  try {
    const documentIds = extractDocumentIds(parsed.messages)

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: parsed.prompt,
        messages: parsed.messages,
        document_ids: documentIds
      }),
      signal: req.signal
    })

    if (!backendResponse.ok) {
      const payload = (await backendResponse.json().catch(() => ({}))) as { detail?: string }
      return new AppError(
        'internal_error',
        payload.detail || GENERIC_INTERNAL_ERROR_MESSAGE
      ).toResponse()
    }

    const textId = crypto.randomUUID()

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: 'start' })
        writer.write({ type: 'text-start', id: textId })

        const reader = backendResponse.body?.getReader()
        if (!reader) {
          throw new Error('Missing backend stream body')
        }
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''

          for (const frame of frames) {
            const dataLine = frame
              .split('\n')
              .find((line) => line.trimStart().startsWith('data:'))
            if (!dataLine) continue
            const eventText = dataLine.replace(/^data:\s*/, '').trim()
            if (!eventText) continue
            const event = JSON.parse(eventText) as { type?: string; delta?: string }
            if (event.type === 'delta' && typeof event.delta === 'string') {
              writer.write({ type: 'text-delta', id: textId, delta: event.delta })
            }
          }
        }

        writer.write({ type: 'text-end', id: textId })
        writer.write({ type: 'finish', finishReason: 'stop' })
      },
      onError: (error) => {
        console.error('[Chat API] Stream error:', error)
        return GENERIC_INTERNAL_ERROR_MESSAGE
      }
    })

    return createUIMessageStreamResponse({ stream })
  } catch (error) {
    console.error('[Chat API] Error:', error)
    return new AppError('internal_error', GENERIC_INTERNAL_ERROR_MESSAGE).toResponse()
  }
}
