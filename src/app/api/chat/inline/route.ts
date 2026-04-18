import type { NextRequest } from 'next/server'
import { AppError } from '@/lib/errors'
import { getModel } from '@/services/ai-provider'
import { generateText } from 'ai'
import { z } from 'zod'

const inlineRequestSchema = z.object({
  selectedText: z.string().trim().min(1).max(5000),
  action: z.enum(['ask', 'explain']),
  question: z.string().trim().max(2000).optional()
})

export async function POST(req: NextRequest): Promise<Response> {
  try {
    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return new AppError('invalid_json', 'Invalid JSON in request body').toResponse()
    }

    const parsed = inlineRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return new AppError('invalid_request', 'Invalid request body').toResponse()
    }

    const { selectedText, action, question } = parsed.data

    let prompt: string
    if (action === 'explain') {
      prompt = `You are a helpful assistant. The user has highlighted the following text from a conversation and wants you to explain it clearly and concisely. Keep your explanation brief (2-4 sentences max unless the text is complex).\n\nHighlighted text:\n"""${selectedText}"""\n\nProvide a clear, concise explanation.`
    } else {
      prompt = `You are a helpful assistant. The user has highlighted the following text from a conversation and has a question about it. Answer concisely.\n\nHighlighted text:\n"""${selectedText}"""\n\nUser's question: ${question || 'What does this mean?'}\n\nProvide a clear, concise answer.`
    }

    const result = await generateText({
      model: getModel().model,
      prompt,
      abortSignal: req.signal
    })

    return Response.json({ text: result.text })
  } catch (error) {
    console.error('[Chat Inline API] Error:', error)
    return new AppError('internal_error', 'Something went wrong').toResponse()
  }
}
