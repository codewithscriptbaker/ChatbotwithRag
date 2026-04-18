import type { NextRequest } from 'next/server'
import { AppError } from '@/lib/errors'
import { getModel } from '@/services/ai-provider'
import { convertToModelMessages, generateText } from 'ai'

import { chatRequestSchema } from '../schema'

const GENERIC_INTERNAL_ERROR_MESSAGE = 'Something went wrong'

export async function POST(req: NextRequest): Promise<Response> {
  try {
    let payload: unknown
    try {
      payload = await req.json()
    } catch (error) {
      console.warn('[Chat Regenerate API] Invalid JSON request body', error)
      return new AppError('invalid_json', 'Invalid JSON in request body').toResponse()
    }

    const parsed = chatRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return new AppError('invalid_request', 'Invalid request body').toResponse()
    }

    const { prompt, messages } = parsed.data
    const modelMessages = await convertToModelMessages([
      {
        role: 'system',
        parts: [{ type: 'text', text: prompt }]
      },
      ...messages
    ])

    const result = await generateText({
      model: getModel().model,
      messages: modelMessages,
      abortSignal: req.signal
    })

    return Response.json({ text: result.text })
  } catch (error) {
    console.error('[Chat Regenerate API] Error:', error)
    return new AppError('internal_error', GENERIC_INTERNAL_ERROR_MESSAGE).toResponse()
  }
}
