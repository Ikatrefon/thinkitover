'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Board { id: string; title: string; updatedAt: string; _count: { threads: number } }
interface Me { name: string | null; email: string }

export default function BoardsPage() {
  const router = useRouter()
  const [boards, setBoards] = useState<Board[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/boards').then(r => {
      if (r.status === 401) { router.push('/login'); return }
      return r.json()
    }).then(d => d && setBoards(d))
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setMe(d))
  }, [router])

  async function createBoard(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() }),
    })
    const board = await res.json()
    router.push(`/boards/${board.id}`)
  }

  async function deleteBoard(id: string) {
    if (!confirm('Delete this board?')) return
    await fetch(`/api/boards/${id}`, { method: 'DELETE' })
    setBoards(prev => prev.filter(b => b.id !== id))
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-wide">Think It Over</h1>
        <div className="flex items-center gap-3">
          {me && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {(me.name || me.email)[0].toUpperCase()}
              </div>
              <span>{me.name || me.email}</span>
            </div>
          )}
          <button onClick={logout} className="text-sm text-gray-500 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <form onSubmit={createBoard} className="flex gap-3 mb-8">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="New board name…"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            + New board
          </button>
        </form>

        {boards.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-16">No boards yet. Create your first one above.</p>
        ) : (
          <div className="grid gap-3">
            {boards.map(board => (
              <div key={board.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-600 transition-colors group">
                <Link href={`/boards/${board.id}`} className="flex-1 min-w-0">
                  <div className="font-medium text-white group-hover:text-blue-400 transition-colors truncate">{board.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {board._count.threads} thread{board._count.threads !== 1 ? 's' : ''} · {new Date(board.updatedAt).toLocaleDateString()}
                  </div>
                </Link>
                <button
                  onClick={() => deleteBoard(board.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors ml-4 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
