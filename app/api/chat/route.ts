import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { threadId, content } = await req.json()

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      board: true,
    },
  })
  if (!thread || thread.board.userId !== user.id) {
    return new Response('Not found', { status: 404 })
  }

  await prisma.message.create({ data: { threadId, role: 'user', content } })

  const history = thread.messages.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  history.push({ role: 'user', content })

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: history,
  })

  let fullText = ''

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text
          controller.enqueue(new TextEncoder().encode(chunk.delta.text))
        }
      }
      await prisma.message.create({ data: { threadId, role: 'assistant', content: fullText } })
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
  })
}
