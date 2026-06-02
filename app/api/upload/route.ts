import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const boardId = formData.get('boardId') as string | null
  const posX = parseFloat((formData.get('posX') as string) || '100')
  const posY = parseFloat((formData.get('posY') as string) || '100')

  if (!file || !boardId) {
    return NextResponse.json({ error: 'Missing file or boardId' }, { status: 400 })
  }

  // Verify board belongs to user
  const board = await prisma.board.findFirst({ where: { id: boardId, userId: user.id } })
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await mkdir(UPLOADS_DIR, { recursive: true })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filepath = path.join(UPLOADS_DIR, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buffer)

  const image = await prisma.boardImage.create({
    data: { boardId, filename, posX, posY },
  })

  return NextResponse.json(image)
}
