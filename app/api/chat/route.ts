import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Attachment {
  name: string
  type: 'image' | 'document' | 'text'
  mediaType?: string
  data?: string
  content?: string
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { threadId, content, attachments } = await req.json() as {
    threadId: string
    content: string
    attachments?: Attachment[]
  }

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

  // Build the user message content for Anthropic (multimodal)
  const userContent: Anthropic.Messages.ContentBlockParam[] = []

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.type === 'image' && att.data && att.mediaType) {
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: att.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: att.data,
          },
        })
      } else if (att.type === 'document' && att.data) {
        userContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: att.data,
          },
        } as unknown as Anthropic.Messages.ContentBlockParam)
      } else if (att.type === 'text' && att.content) {
        userContent.push({
          type: 'text',
          text: `[File: ${att.name}]\n\`\`\`\n${att.content}\n\`\`\``,
        })
      }
    }
  }

  if (content) {
    userContent.push({ type: 'text', text: content })
  }

  // Save user message to DB with file labels
  const fileLabel = attachments && attachments.length > 0
    ? attachments.map(a => `📎 ${a.name}`).join(' ') + (content ? '\n' : '')
    : ''
  const savedContent = fileLabel + (content || '')
  await prisma.message.create({ data: { threadId, role: 'user', content: savedContent } })

  const history = thread.messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history,
    { role: 'user', content: userContent.length > 0 ? userContent : content },
  ]

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages,
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
