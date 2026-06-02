'use client'

import { useState, useRef, useEffect } from 'react'
import { Handle, Position, NodeProps, NodeResizer, useReactFlow } from '@xyflow/react'
import Image from 'next/image'

interface NoteData {
  noteId: string
  title: string
  content: string
  headerBg: string
  noteBg: string
  isDark: boolean
  onDelete: (id: string) => void
  onTitleChange: (id: string, title: string) => void
  onColorChange: (id: string, headerBg: string) => void
  onBgChange: (id: string, noteBg: string) => void
}

const PALETTE = [
  { bg: '',        label: 'Default' },
  { bg: '#1e3a5f', label: 'Navy'   },
  { bg: '#3b1f6e', label: 'Purple' },
  { bg: '#14532d', label: 'Forest' },
  { bg: '#7f1d1d', label: 'Red'    },
  { bg: '#78350f', label: 'Amber'  },
  { bg: '#134e4a', label: 'Teal'   },
  { bg: '#831843', label: 'Rose'   },
]

export default function NoteNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as NoteData
  const { updateNode, getNode } = useReactFlow()

  const [content, setContent] = useState(d.content || '')
  const [title, setTitle] = useState(d.title || 'Note')
  const [editingTitle, setEditingTitle] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [headerBg, setHeaderBg] = useState(d.headerBg || '')
  const [noteBg, setNoteBg] = useState(d.noteBg || '')

  const paletteRef = useRef<HTMLDivElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const expandedHeightRef = useRef(160)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) setShowPalette(false)
    }
    if (showPalette) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPalette])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    setShowPalette(false)
    if (next) {
      const node = getNode(id)
      const h = (node?.style?.height as number) || 160
      expandedHeightRef.current = h
      updateNode(id, { style: { width: (node?.style?.width as number) || 220, height: 44 } })
    } else {
      const node = getNode(id)
      updateNode(id, { style: { width: (node?.style?.width as number) || 220, height: expandedHeightRef.current } })
    }
  }

  function handleContentChange(val: string) {
    setContent(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch(`/api/notes/${d.noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: val }),
      })
    }, 800)
  }

  async function saveTitle(newTitle: string) {
    setEditingTitle(false)
    setTitle(newTitle)
    d.onTitleChange(id, newTitle)
    await fetch(`/api/notes/${d.noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
  }

  async function pickHeaderColor(bg: string) {
    setHeaderBg(bg)
    setShowPalette(false)
    d.onColorChange(id, bg)
    await fetch(`/api/notes/${d.noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headerBg: bg }),
    })
  }

  async function pickNoteBg(color: string) {
    setNoteBg(color)
    d.onBgChange(id, color)
    await fetch(`/api/notes/${d.noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteBg: color }),
    })
  }

  const dark = d.isDark !== false
  const customHeader = headerBg
  const headerStyle = customHeader ? { backgroundColor: customHeader } : {}
  const headerBase = customHeader
    ? 'text-white'
    : (dark ? 'bg-yellow-950 border-yellow-900 text-yellow-200' : 'bg-yellow-50 border-yellow-200 text-yellow-800')
  const headerBorderB = collapsed ? '' : (customHeader ? '' : (dark ? 'border-b border-yellow-900' : 'border-b border-yellow-200'))
  const textMuted = customHeader ? 'text-white/60' : (dark ? 'text-yellow-700' : 'text-yellow-500')

  const bodyStyle = noteBg ? { backgroundColor: noteBg } : {}
  const bodyClass = noteBg
    ? 'border rounded-xl shadow-xl flex flex-col w-full h-full min-w-[180px]'
    : `border rounded-xl shadow-xl flex flex-col w-full h-full min-w-[180px] ${dark ? 'bg-yellow-950 border-yellow-800' : 'bg-yellow-50 border-yellow-300'}`

  const textareaClass = noteBg
    ? 'flex-1 bg-transparent p-2 text-xs resize-none focus:outline-none nodrag nopan select-text text-gray-900'
    : `flex-1 bg-transparent p-2 text-xs resize-none focus:outline-none nodrag nopan select-text ${dark ? 'text-yellow-100 placeholder-yellow-900' : 'text-yellow-900 placeholder-yellow-300'}`

  return (
    <div className={bodyClass} style={bodyStyle}>
      {!collapsed && (
        <NodeResizer
          minWidth={180} minHeight={120}
          isVisible={selected}
          lineClassName="!border-yellow-500"
          handleClassName="!bg-yellow-500 !border-yellow-300"
        />
      )}

      <Handle type="target" position={Position.Left} className="!bg-yellow-500" />
      <Handle type="source" position={Position.Right} className="!bg-yellow-500" />

      {/* Header */}
      <div
        className={`drag-handle flex items-center gap-1 px-2 py-2 rounded-t-xl flex-shrink-0 cursor-grab active:cursor-grabbing select-none ${headerBase} ${headerBorderB} ${collapsed ? 'rounded-b-xl' : ''}`}
        style={headerStyle}
      >
        {/* Collapse */}
        <button
          onClick={e => { e.stopPropagation(); toggleCollapse() }}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors text-xs nodrag"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '▼'}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0 mx-1">
          {editingTitle ? (
            <input
              autoFocus
              defaultValue={title}
              onBlur={e => saveTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveTitle((e.target as HTMLInputElement).value)}
              className="bg-transparent text-xs font-medium outline-none w-full"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-xs font-medium truncate block cursor-pointer hover:opacity-80"
              onDoubleClick={e => { e.stopPropagation(); setEditingTitle(true) }}
              title="Double-click to rename"
            >
              {title}
            </span>
          )}
        </div>

        {/* Header color palette */}
        <div className="relative flex-shrink-0 nodrag" ref={paletteRef}>
          <button
            onClick={e => { e.stopPropagation(); setShowPalette(v => !v) }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors"
            title="Header color"
          >
            <Image src="/icons/palette.png" alt="color" width={14} height={14} className="opacity-80" />
          </button>
          {showPalette && (
            <div
              className={`absolute top-7 right-0 z-50 p-2 rounded-xl shadow-2xl border flex flex-wrap gap-1.5 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              style={{ width: 128 }}
              onClick={e => e.stopPropagation()}
            >
              {PALETTE.map(c => (
                <button
                  key={c.bg}
                  onClick={() => pickHeaderColor(c.bg)}
                  title={c.label}
                  className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${headerBg === c.bg ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.bg || (dark ? '#374151' : '#e5e7eb') }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Background color picker */}
        <div className="relative flex-shrink-0 nodrag">
          <input
            ref={colorInputRef}
            type="color"
            value={noteBg || '#fefce8'}
            onChange={e => pickNoteBg(e.target.value)}
            className="sr-only"
            title="Note background color"
          />
          <button
            onClick={e => { e.stopPropagation(); colorInputRef.current?.click() }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors"
            title="Background color"
          >
            <span
              className="w-3 h-3 rounded-full border border-white/50 flex-shrink-0"
              style={{ backgroundColor: noteBg || (dark ? '#422006' : '#fef9c3') }}
            />
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={() => d.onDelete(id)}
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors text-sm nodrag ${textMuted} hover:!text-red-400`}
        >
          ×
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <textarea
          value={content}
          onChange={e => handleContentChange(e.target.value)}
          placeholder="Write a note…"
          className={textareaClass}
          style={noteBg ? { color: undefined } : undefined}
        />
      )}
    </div>
  )
}
