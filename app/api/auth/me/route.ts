import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

function hashPassword(password: string, secret: string) {
  return createHash('sha256').update(password + secret).digest('hex')
}

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ id: user.id, email: user.email, name: user.name })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, currentPassword, newPassword } = await req.json()
  const secret = process.env.AUTH_SECRET!
  const updates: Record<string, string> = {}

  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    updates.name = name.trim()
  }

  if (newPassword !== undefined) {
    if (!currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    if (user.password !== hashPassword(currentPassword, secret)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }
    if (newPassword.length < 6) return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    updates.password = hashPassword(newPassword, secret)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: updates })
  return NextResponse.json({ id: updated.id, email: updated.email, name: updated.name })
}
