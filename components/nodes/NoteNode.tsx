'use client'

import { useState, useCallback } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'

interface NoteData {
  noteId: string
  content: string
  onDelete: (id: string) => void
}

export default function NoteNode({ id, data }: NodeProps) {
  const d = data as unknown as NoteData
  const [content, setContent] = useState(d.content || '')
  const saveTimer = useCallback(() => {
    clearTimeout((window as unknown as Record<string, unknown>)[`note-save-${id}`] as ReturnType<typeof setTimeout>)
    ;(window as unknown as Record<string, unknown>)[`note-save-${id}`] = setTimeout(() => {
      fetch(`/api/notes/${d.noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
    }, 800)
  }, [content, d.noteId, id])

  function handleChange(val: string) {
    setContent(val)
    clearTimeout((window as unknown as Record<string, unknown>)[`note-save-${id}`] as ReturnType<typeof setTimeout>)
    ;(window as unknown as Record<string, unknown>)[`note-save-${id}`] = setTimeout(() => {
      fetch(`/api/notes/${d.noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: val },)
      })
    }, 800)
  }

  return (
    <div className="bg-yellow-950 border border-yellow-800 rounded-xl shadow-xl flex flex-col" style={{ width: 220, minHeight: 140 }}>
      <Handle type="target" position={Position.Left} className="!bg-yellow-500" />
      <Handle type="source" position={Position.Right} className="!bg-yellow-500" />

      <div className="flex items-center justify-between px-3 py-1.5 border-b border-yellow-900 flex-shrink-0">
        <span className="text-xs text-yellow-600 font-medium">Note</span>
        <button
          onClick={() => d.onDelete(id)}
          className="text-yellow-800 hover:text-red-400 transition-colors text-base leading-none"
        >
          ×
        </button>
      </div>

      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder="Write a note…"
        className="flex-1 bg-transparent p-2 text-xs text-yellow-100 resize-none focus:outline-none nodrag placeholder-yellow-900"
        rows={5}
      />
    </div>
  )
}
