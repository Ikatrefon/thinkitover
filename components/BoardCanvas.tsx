'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
interface Thread { id: string; title: string; posX: number; posY: number; messages: Message[] }
interface NoteType { id: string; content: string; posX: number; posY: number }
interface BoardData { id: string; threads: Thread[]; notes: NoteType[] }

const SAVE_DELAY = 1000

export default function BoardCanvas({ board }: { board: BoardData }) {
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function buildNodes(threads: Thread[], notes: NoteType[], handlers: {
    onDeleteThread: (nodeId: string) => void
    onTitleChange: (nodeId: string, title: string) => void
    onDeleteNote: (nodeId: string) => void
  }): Node[] {
    const threadNodes: Node[] = threads.map(t => ({
      id: `t-${t.id}`,
      type: 'thread',
      position: { x: t.posX, y: t.posY },
      data: {
        threadId: t.id,
        title: t.title,
        messages: t.messages,
        onDelete: handlers.onDeleteThread,
        onTitleChange: handlers.onTitleChange,
      },
    }))
    const noteNodes: Node[] = notes.map(n => ({
      id: `n-${n.id}`,
      type: 'note',
      position: { x: n.posX, y: n.posY },
      data: {
        noteId: n.id,
        content: n.content,
        onDelete: handlers.onDeleteNote,
      },
    }))
    return [...threadNodes, ...noteNodes]
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

  useEffect(() => {
    setNodes(buildNodes(board.threads, board.notes, { onDeleteThread, onTitleChange, onDeleteNote }))
  }, [board]) // eslint-disable-line

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
    setEdges(prev => addEdge({ ...connection, animated: false, style: { stroke: '#4b5563' } }, prev))
  }, [setEdges])

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
      data: {
        threadId: thread.id,
        title: thread.title,
        messages: [],
        onDelete: onDeleteThread,
        onTitleChange: onTitleChange,
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
      data: { noteId: note.id, content: '', onDelete: onDeleteNote },
    }])
  }

  const [addingThread, setAddingThread] = useState(false)

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setAddingThread(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow ${addingThread ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
        >
          {addingThread ? 'Click on canvas to place chat' : '+ Chat'}
        </button>
        <button
          onClick={addNote}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-900 text-yellow-200 hover:bg-yellow-800 transition-colors shadow"
        >
          + Note
        </button>
      </div>

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
        defaultEdgeOptions={{ style: { stroke: '#4b5563', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed' as const, color: '#4b5563' } }}
      >
        <Background variant={BackgroundVariant.Dots} color="#374151" gap={24} size={1} />
        <Controls className="!bg-gray-800 !border-gray-700" />
      </ReactFlow>
    </div>
  )
}
