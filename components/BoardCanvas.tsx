'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
  Node,
  Edge,
  NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import ThreadNode from './nodes/ThreadNode'
import NoteNode from './nodes/NoteNode'
import ImageNode from './nodes/ImageNode'
import dynamic from 'next/dynamic'

const DrawingOverlay = dynamic(() => import('./DrawingOverlay'), { ssr: false })

const nodeTypes = { thread: ThreadNode, note: NoteNode, image: ImageNode }

interface Message { id: string; role: string; content: string }
interface Thread { id: string; title: string; posX: number; posY: number; headerBg: string; nodeBg: string; messages: Message[] }
interface NoteType { id: string; title: string; content: string; headerBg: string; noteBg: string; posX: number; posY: number }
interface BoardImageType { id: string; filename: string; posX: number; posY: number; width: number; height: number }
interface BoardData { id: string; bgColor: string; drawing: string; threads: Thread[]; notes: NoteType[]; images: BoardImageType[] }

const SAVE_DELAY = 1000

export default function BoardCanvas({ board, userName }: { board: BoardData; userName: string }) {
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const boardColorInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [boardBg, setBoardBg] = useState(board.bgColor || '')
  const [drawing, setDrawing] = useState(board.drawing || '')
  const [showDrawing, setShowDrawing] = useState(false)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('thinkitover-theme')
    return saved === null ? true : saved === 'dark'
  })

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev
      localStorage.setItem('thinkitover-theme', next ? 'dark' : 'light')
      return next
    })
  }

  // ── Handlers ────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const onDeleteThread = useCallback((nodeId: string) => {
    fetch(`/api/threads/${nodeId.replace('t-', '')}`, { method: 'DELETE' })
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  const onTitleChange = useCallback((nodeId: string, title: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, title } } : n))
  }, [setNodes])

  const onColorChange = useCallback((nodeId: string, headerBg: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, headerBg } } : n))
  }, [setNodes])

  const onBgChange = useCallback((nodeId: string, nodeBg: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, nodeBg } } : n))
  }, [setNodes])

  const onDeleteNote = useCallback((nodeId: string) => {
    fetch(`/api/notes/${nodeId.replace('n-', '')}`, { method: 'DELETE' })
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  const onNoteTitleChange = useCallback((nodeId: string, title: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, title } } : n))
  }, [setNodes])

  const onNoteColorChange = useCallback((nodeId: string, headerBg: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, headerBg } } : n))
  }, [setNodes])

  const onNoteBgChange = useCallback((nodeId: string, noteBg: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, noteBg } } : n))
  }, [setNodes])

  const onDeleteImage = useCallback((nodeId: string) => {
    fetch(`/api/images/${nodeId.replace('i-', '')}`, { method: 'DELETE' })
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  // ── Build nodes ────────────────────────────────────────────────
  function buildNodes(threads: Thread[], notes: NoteType[], images: BoardImageType[], dark: boolean): Node[] {
    return [
      ...threads.map(t => ({
        id: `t-${t.id}`,
        type: 'thread' as const,
        position: { x: t.posX, y: t.posY },
        dragHandle: '.drag-handle',
        style: { width: 320, height: 420 },
        data: {
          threadId: t.id, title: t.title, messages: t.messages,
          headerBg: t.headerBg || '', nodeBg: t.nodeBg || '', isDark: dark,
          onDelete: onDeleteThread, onTitleChange, onColorChange, onBgChange,
        },
      })),
      ...notes.map(n => ({
        id: `n-${n.id}`,
        type: 'note' as const,
        position: { x: n.posX, y: n.posY },
        dragHandle: '.drag-handle',
        style: { width: 220, height: 160 },
        data: {
          noteId: n.id, title: n.title || 'Note', content: n.content,
          headerBg: n.headerBg || '', noteBg: n.noteBg || '', isDark: dark,
          onDelete: onDeleteNote, onTitleChange: onNoteTitleChange,
          onColorChange: onNoteColorChange, onBgChange: onNoteBgChange,
        },
      })),
      ...images.map(img => ({
        id: `i-${img.id}`,
        type: 'image' as const,
        position: { x: img.posX, y: img.posY },
        dragHandle: undefined,
        style: { width: img.width, height: img.height },
        data: { imageId: img.id, filename: img.filename, isDark: dark, onDelete: onDeleteImage },
      })),
    ]
  }

  useEffect(() => {
    setNodes(buildNodes(board.threads, board.notes, board.images || [], isDark))
  }, [board]) // eslint-disable-line

  useEffect(() => {
    setNodes(prev => prev.map(n => ({ ...n, data: { ...n.data, isDark } })))
  }, [isDark]) // eslint-disable-line

  // ── Position save (threads, notes, images) ─────────────────────
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        const id = change.id
        clearTimeout(saveTimers.current[id])
        saveTimers.current[id] = setTimeout(() => {
          const body = JSON.stringify({ posX: change.position!.x, posY: change.position!.y })
          const headers = { 'Content-Type': 'application/json' }
          if (id.startsWith('t-'))      fetch(`/api/threads/${id.replace('t-', '')}`, { method: 'PATCH', headers, body })
          else if (id.startsWith('n-')) fetch(`/api/notes/${id.replace('n-', '')}`,   { method: 'PATCH', headers, body })
          else if (id.startsWith('i-')) fetch(`/api/images/${id.replace('i-', '')}`,  { method: 'PATCH', headers, body })
        }, SAVE_DELAY)
      }
    })
  }, [onNodesChange])

  const onConnect = useCallback((connection: Connection) => {
    setEdges(prev => addEdge({
      ...connection, animated: false,
      style: { stroke: isDark ? '#4b5563' : '#9ca3af', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' as const, color: isDark ? '#4b5563' : '#9ca3af' },
    }, prev))
  }, [setEdges, isDark])

  // ── Add thread / note ──────────────────────────────────────────
  async function addThread(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const posX = e.clientX - rect.left - 160
    const posY = e.clientY - rect.top - 210
    const res = await fetch('/api/threads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: board.id, posX, posY }),
    })
    const thread: Thread = await res.json()
    setNodes(prev => [...prev, {
      id: `t-${thread.id}`, type: 'thread',
      position: { x: posX, y: posY }, dragHandle: '.drag-handle',
      style: { width: 320, height: 420 },
      data: { threadId: thread.id, title: thread.title, messages: [], headerBg: '', nodeBg: '', isDark,
              onDelete: onDeleteThread, onTitleChange, onColorChange, onBgChange },
    }])
  }

  async function addNote() {
    const posX = Math.random() * 400 + 100
    const posY = Math.random() * 300 + 100
    const res = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: board.id, posX, posY }),
    })
    const note: NoteType = await res.json()
    setNodes(prev => [...prev, {
      id: `n-${note.id}`, type: 'note',
      position: { x: posX, y: posY }, dragHandle: '.drag-handle',
      style: { width: 220, height: 160 },
      data: { noteId: note.id, title: 'Note', content: '', headerBg: '', noteBg: '', isDark,
              onDelete: onDeleteNote, onTitleChange: onNoteTitleChange,
              onColorChange: onNoteColorChange, onBgChange: onNoteBgChange },
    }])
  }

  // ── Upload image file ──────────────────────────────────────────
  async function uploadImageFile(file: File, posX = 100, posY = 100) {
    const form = new FormData()
    form.append('file', file)
    form.append('boardId', board.id)
    form.append('posX', String(posX))
    form.append('posY', String(posY))
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    if (!res.ok) return
    const img: BoardImageType = await res.json()
    setNodes(prev => [...prev, {
      id: `i-${img.id}`, type: 'image',
      position: { x: img.posX, y: img.posY },
      style: { width: img.width, height: img.height },
      data: { imageId: img.id, filename: img.filename, isDark, onDelete: onDeleteImage },
    }])
  }

  // ── Paste from clipboard ───────────────────────────────────────
  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      if (showDrawing) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) await uploadImageFile(file, 120, 120)
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [showDrawing, board.id, isDark]) // eslint-disable-line

  // ── Drag & drop image onto canvas ──────────────────────────────
  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault()
    if (showDrawing) return
    const rect = canvasRef.current?.getBoundingClientRect()
    const posX = rect ? e.clientX - rect.left : 100
    const posY = rect ? e.clientY - rect.top - 40 : 100 // minus toolbar height
    for (const file of Array.from(e.dataTransfer.files)) {
      if (file.type.startsWith('image/')) uploadImageFile(file, posX, posY)
    }
  }

  // ── Board background ───────────────────────────────────────────
  async function saveBoardBg(color: string) {
    setBoardBg(color)
    await fetch(`/api/boards/${board.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bgColor: color }),
    })
  }

  const [addingThread, setAddingThread] = useState(false)

  const headerBg = isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
  const btnBase = isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

  return (
    <div
      ref={canvasRef}
      className={`w-full h-full flex flex-col ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}
      style={boardBg ? { backgroundColor: boardBg } : {}}
      onDrop={handleCanvasDrop}
      onDragOver={e => e.preventDefault()}
    >
      {/* Toolbar */}
      <div className={`border-b ${headerBg} px-4 py-2 flex items-center gap-2 flex-shrink-0 relative z-50`}>
        <button
          onClick={() => setAddingThread(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${addingThread ? 'bg-blue-500 text-white' : btnBase}`}
        >
          {addingThread ? 'Click on canvas…' : '+ Chat'}
        </button>
        <button
          onClick={addNote}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-yellow-900 text-yellow-200 hover:bg-yellow-800' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
        >
          + Note
        </button>
        <button
          onClick={() => setShowDrawing(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showDrawing ? 'bg-purple-600 text-white' : (isDark ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-900' : 'bg-purple-100 text-purple-700 hover:bg-purple-200')}`}
        >
          {showDrawing ? '✓ Done' : '✏️ Draw'}
        </button>

        <div className="flex-1" />

        {/* Board background color */}
        <input ref={boardColorInputRef} type="color"
          value={boardBg || (isDark ? '#030712' : '#f9fafb')}
          onChange={e => saveBoardBg(e.target.value)}
          className="sr-only"
        />
        <button
          onClick={() => boardColorInputRef.current?.click()}
          className={`p-1.5 rounded-lg transition-colors ${btnBase}`}
          title="Board background color"
        >
          <span
            className="w-4 h-4 rounded-full border border-gray-500 block"
            style={{ backgroundColor: boardBg || (isDark ? '#030712' : '#f9fafb') }}
          />
        </button>

        {/* User name */}
        <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {userName ? userName[0].toUpperCase() : '?'}
          </div>
          <span className="hidden sm:inline">{userName}</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`ml-2 p-1.5 rounded-lg transition-colors ${btnBase}`}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Image
            src={isDark ? '/icons/sunny-day-dark-bcg.png' : '/icons/night-time-white-bcg.png'}
            alt={isDark ? 'Light mode' : 'Dark mode'}
            width={16} height={16}
          />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          onClick={addingThread ? (e) => { addThread(e); setAddingThread(false) } : undefined}
          style={{ cursor: addingThread ? 'crosshair' : undefined }}
          defaultEdgeOptions={{
            style: { stroke: isDark ? '#4b5563' : '#9ca3af', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' as const, color: isDark ? '#4b5563' : '#9ca3af' },
          }}
        >
          <Background variant={BackgroundVariant.Dots} color={isDark ? '#374151' : '#d1d5db'} gap={24} size={1} />
          <Controls className={isDark ? '!bg-gray-800 !border-gray-700' : '!bg-white !border-gray-200'} />
        </ReactFlow>

        {/* Drawing overlay — always mounted, visible/interactive only when editing */}
        <DrawingOverlay
          boardId={board.id}
          initialData={drawing}
          isDark={isDark}
          isEditing={showDrawing}
          onClose={() => setShowDrawing(false)}
          onSave={setDrawing}
        />
      </div>
    </div>
  )
}
