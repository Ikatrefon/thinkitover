import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const note = await prisma.note.update({
    where: { id },
    data: {
      ...(data.content  !== undefined && { content:  data.content  }),
      ...(data.title    !== undefined && { title:    data.title    }),
      ...(data.headerBg !== undefined && { headerBg: data.headerBg }),
      ...(data.noteBg   !== undefined && { noteBg:   data.noteBg   }),
      ...(data.posX     !== undefined && { posX:     data.posX     }),
      ...(data.posY     !== undefined && { posY:     data.posY     }),
    },
  })
  return NextResponse.json(note)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.note.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
