import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import BoardCanvas from '@/components/BoardCanvas'
import Link from 'next/link'

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) redirect('/login')

  const { id } = await params
  const board = await prisma.board.findFirst({
    where: { id, userId: user.id },
    include: {
      threads: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
      notes: true,
      images: true,
    },
  })
  if (!board) redirect('/boards')

  const userName = user.name || user.email

  return (
    <div className="w-screen h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-gray-900 px-4 py-2.5 flex items-center gap-4 flex-shrink-0">
        <Link href="/boards" className="text-gray-500 hover:text-white transition-colors text-sm">
          ← Boards
        </Link>
        <h1 className="text-sm font-medium text-white">{board.title}</h1>
      </header>
      <div className="flex-1 min-h-0">
        <BoardCanvas board={board} userName={userName} />
      </div>
    </div>
  )
}
