'use client'

import { useState } from 'react'
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react'

interface NoteData {
  noteId: string
  content: string
  isDark: boolean
  onDelete: (id: string) => void
}

export default function NoteNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as NoteData
  const [content, setContent] = useState(d.content || '')

  function handleChange(val: string) {
    setContent(val)
    clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>)[`note-save-${id}`])
    ;(window as unknown as Record<string, ReturnType<typeof setTimeout>>)[`note-save-${id}`] = setTimeout(() => {
      fetch(`/api/notes/${d.noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: val }),
      })
    }, 800)
  }

  const dark = d.isDark !== false

  return (
    <div
      className={`border rounded-xl shadow-xl flex flex-col w-full h-full min-w-[180px] min-h-[120px] ${
        dark ? 'bg-yellow-950 border-yellow-800' : 'bg-yellow-50 border-yellow-300'
      }`}
    >
      <NodeResizer
        minWidth={180}
        minHeight={120}
        isVisible={selected}
        lineClassName="!border-yellow-500"
        handleClassName="!bg-yellow-500 !border-yellow-300"
      />

      <Handle type="target" position={Position.Left} className="!bg-yellow-500" />
      <Handle type="source" position={Position.Right} className="!bg-yellow-500" />

      {/* DRAG HANDLE */}
      <div className={`drag-handle flex items-center justify-between px-3 py-1.5 border-b rounded-t-xl flex-shrink-0 cursor-grab active:cursor-grabbing select-none ${
        dark ? 'border-yellow-900' : 'border-yellow-200'
      }`}>
        <span className={`text-xs font-medium ${dark ? 'text-yellow-600' : 'text-yellow-700'}`}>⠿ Note</span>
        <button
          onClick={() => d.onDelete(id)}
          className={`transition-colors text-base leading-none ${dark ? 'text-yellow-800 hover:text-red-400' : 'text-yellow-500 hover:text-red-400'}`}
        >
          ×
        </button>
      </div>

      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder="Write a note…"
        className={`flex-1 bg-transparent p-2 text-xs resize-none focus:outline-none nodrag nopan select-text ${
          dark ? 'text-yellow-100 placeholder-yellow-900' : 'text-yellow-900 placeholder-yellow-300'
        }`}
      />
    </div>
  )
}
