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

const nodeTypes = { thread: ThreadNode, note: NoteNode }

interface Message { id: string; role: string; content: string }
interface Thread { id: string; title: string; posX: number; posY: number; headerBg: string; messages: Message[] }
interface NoteType { id: string; content: string; posX: number; posY: number }
interface BoardData { id: string; threads: Thread[]; notes: NoteType[] }

const SAVE_DELAY = 1000

export default function BoardCanvas({ board, userName }: { board: BoardData; userName: string }) {
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
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

  function buildNodes(
    threads: Thread[],
    notes: NoteType[],
    dark: boolean,
    handlers: {
      onDeleteThread: (nodeId: string) => void
      onTitleChange: (nodeId: string, title: string) => void
      onDeleteNote: (nodeId: string) => void
      onColorChange: (nodeId: string, headerBg: string) => void
    }
  ): Node[] {
    return [
      ...threads.map(t => ({
        id: `t-${t.id}`,
        type: 'thread' as const,
        position: { x: t.posX, y: t.posY },
        dragHandle: '.drag-handle',
        style: { width: 320, height: 420 },
        data: {
          threadId: t.id,
          title: t.title,
          messages: t.messages,
          headerBg: t.headerBg || '',
          isDark: dark,
          onDelete: handlers.onDeleteThread,
          onTitleChange: handlers.onTitleChange,
          onColorChange: handlers.onColorChange,
        },
      })),
      ...notes.map(n => ({
        id: `n-${n.id}`,
        type: 'note' as const,
        position: { x: n.posX, y: n.posY },
        dragHandle: '.drag-handle',
        style: { width: 220, height: 160 },
        data: {
          noteId: n.id,
          content: n.content,
          isDark: dark,
          onDelete: handlers.onDeleteNote,
        },
      })),
    ]
  }

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const onDeleteThread = useCallback((nodeId: string) => {
    const threadId = nodeId.replace('t-', '')
    fetch(`/api/threads/${threadId}`, { method: 'DELETE' })
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  const onTitleChange = useCallback((nodeId: string, title: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, title } } : n))
  }, [setNodes])

  const onDeleteNote = useCallback((nodeId: string) => {
    const noteId = nodeId.replace('n-', '')
    fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  const onColorChange = useCallback((nodeId: string, headerBg: string) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, headerBg } } : n
    ))
  }, [setNodes])

  useEffect(() => {
    setNodes(buildNodes(board.threads, board.notes, isDark, { onDeleteThread, onTitleChange, onDeleteNote, onColorChange }))
  }, [board]) // eslint-disable-line

  // Update isDark in all existing nodes when theme changes
  useEffect(() => {
    setNodes(prev => prev.map(n => ({ ...n, data: { ...n.data, isDark } })))
  }, [isDark]) // eslint-disable-line

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        const id = change.id
        clearTimeout(saveTimers.current[id])
        saveTimers.current[id] = setTimeout(() => {
          if (id.startsWith('t-')) {
            fetch(`/api/threads/${id.replace('t-', '')}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ posX: change.position!.x, posY: change.position!.y }),
            })
          } else if (id.startsWith('n-')) {
            fetch(`/api/notes/${id.replace('n-', '')}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ posX: change.position!.x, posY: change.position!.y }),
            })
          }
        }, SAVE_DELAY)
      }
    })
  }, [onNodesChange])

  const onConnect = useCallback((connection: Connection) => {
    setEdges(prev => addEdge({
      ...connection,
      animated: false,
      style: { stroke: isDark ? '#4b5563' : '#9ca3af', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' as const, color: isDark ? '#4b5563' : '#9ca3af' },
    }, prev))
  }, [setEdges, isDark])

  async function addThread(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const posX = e.clientX - rect.left - 160
    const posY = e.clientY - rect.top - 210

    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: board.id, posX, posY }),
    })
    const thread: Thread = await res.json()

    setNodes(prev => [...prev, {
      id: `t-${thread.id}`,
      type: 'thread',
      position: { x: posX, y: posY },
      dragHandle: '.drag-handle',
      style: { width: 320, height: 420 },
      data: {
        threadId: thread.id,
        title: thread.title,
        messages: [],
        headerBg: '',
        isDark,
        onDelete: onDeleteThread,
        onTitleChange: onTitleChange,
        onColorChange,
      },
    }])
  }

  async function addNote() {
    const posX = Math.random() * 400 + 100
    const posY = Math.random() * 300 + 100

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId: board.id, posX, posY }),
    })
    const note: NoteType = await res.json()

    setNodes(prev => [...prev, {
      id: `n-${note.id}`,
      type: 'note',
      position: { x: posX, y: posY },
      dragHandle: '.drag-handle',
      style: { width: 220, height: 160 },
      data: { noteId: note.id, content: '', isDark, onDelete: onDeleteNote },
    }])
  }

  const [addingThread, setAddingThread] = useState(false)

  const headerBg = isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
  const btnBase = isDark
    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

  return (
    <div className={`w-full h-full flex flex-col ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Toolbar */}
      <div className={`border-b ${headerBg} px-4 py-2 flex items-center gap-2 flex-shrink-0`}>
        <button
          onClick={() => setAddingThread(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            addingThread ? 'bg-blue-500 text-white' : btnBase
          }`}
        >
          {addingThread ? 'Click on canvas…' : '+ Chat'}
        </button>
        <button
          onClick={addNote}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isDark ? 'bg-yellow-900 text-yellow-200 hover:bg-yellow-800' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          + Note
        </button>

        <div className="flex-1" />

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
            width={16}
            height={16}
          />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
          <Background
            variant={BackgroundVariant.Dots}
            color={isDark ? '#374151' : '#d1d5db'}
            gap={24}
            size={1}
          />
          <Controls className={isDark ? '!bg-gray-800 !border-gray-700' : '!bg-white !border-gray-200'} />
        </ReactFlow>
      </div>
    </div>
  )
}
