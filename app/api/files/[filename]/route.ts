import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params

  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const filepath = path.join(UPLOADS_DIR, filename)

  try {
    const buffer = await readFile(filepath)
    const ext = filename.split('.').pop()?.toLowerCase() || 'png'
    const contentType: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      webp: 'image/webp', gif: 'image/gif',
    }
    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
