import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const board = await prisma.board.findFirst({
    where: { id, userId: user.id },
    include: {
      threads: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
      notes: true,
    },
  })
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(board)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const board = await prisma.board.updateMany({
    where: { id, userId: user.id },
    data: {
      ...(data.bgColor !== undefined && { bgColor: data.bgColor }),
      ...(data.title  !== undefined && { title:   data.title  }),
    },
  })
  return NextResponse.json(board)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.board.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
}
