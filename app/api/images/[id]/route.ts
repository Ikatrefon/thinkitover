import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const image = await prisma.boardImage.findFirst({
    where: { id },
    include: { board: true },
  })
  if (!image || image.board.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.boardImage.update({
    where: { id },
    data: {
      ...(data.posX   !== undefined && { posX:   data.posX   }),
      ...(data.posY   !== undefined && { posY:   data.posY   }),
      ...(data.width  !== undefined && { width:  data.width  }),
      ...(data.height !== undefined && { height: data.height }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const image = await prisma.boardImage.findFirst({
    where: { id },
    include: { board: true },
  })
  if (!image || image.board.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.boardImage.delete({ where: { id } })
  try {
    await unlink(path.join(UPLOADS_DIR, image.filename))
  } catch { /* file may already be gone */ }

  return NextResponse.json({ ok: true })
}
