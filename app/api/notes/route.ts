import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { boardId, posX, posY } = await req.json()

  const board = await prisma.board.findFirst({ where: { id: boardId, userId: user.id } })
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const note = await prisma.note.create({ data: { boardId, posX: posX ?? 0, posY: posY ?? 0 } })
  return NextResponse.json(note)
}
