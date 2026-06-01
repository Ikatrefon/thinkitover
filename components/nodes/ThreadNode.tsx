'use client'

import { useState, useRef, useEffect } from 'react'
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react'

interface Message { id: string; role: string; content: string }
interface ThreadData {
  threadId: string
  title: string
  messages: Message[]
  headerBg: string
  isDark: boolean
  onDelete: (id: string) => void
  onTitleChange: (id: string, title: string) => void
  onCollapse: (id: string, collapsed: boolean) => void
  onColorChange: (id: string, headerBg: string) => void
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

export default function ThreadNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ThreadData
  const [messages, setMessages] = useState<Message[]>(d.messages || [])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(d.title || 'New chat')
  const [collapsed, setCollapsed] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [headerBg, setHeaderBg] = useState(d.headerBg || '')
  const bottomRef = useRef<HTMLDivElement>(null)
  const paletteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close palette on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowPalette(false)
      }
    }
    if (showPalette) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPalette])

  async function sendMessage() {
    const content = input.trim()
    if (!content || streaming) return
    setInput('')
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: d.threadId, content }),
      })
      if (!res.ok) {
        const errText = await res.text()
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Error ${res.status}: ${errText}` } : m))
        setStreaming(false)
        return
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: text } : m))
      }
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Network error: ${e}` } : m))
    }
    setStreaming(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  async function saveTitle(newTitle: string) {
    setEditingTitle(false)
    setTitle(newTitle)
    d.onTitleChange(id, newTitle)
    await fetch(`/api/threads/${d.threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
  }

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    setShowPalette(false)
    d.onCollapse(id, next)
  }

  async function pickColor(bg: string) {
    setHeaderBg(bg)
    setShowPalette(false)
    d.onColorChange(id, bg)
    await fetch(`/api/threads/${d.threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headerBg: bg }),
    })
  }

  const dark = d.isDark !== false

  // Header styling
  const customBg = headerBg || (dark ? '' : '')
  const headerStyle = customBg ? { backgroundColor: customBg } : {}
  const headerBase = customBg
    ? 'text-white'
    : dark
    ? 'bg-gray-800 text-white border-gray-700'
    : 'bg-gray-50 text-gray-900 border-gray-200'
  const headerBorder = customBg ? '' : (dark ? 'border-b border-gray-700' : 'border-b border-gray-200')

  const bodyBg = dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'
  const textMuted = customBg ? 'text-white/60' : (dark ? 'text-gray-400' : 'text-gray-500')
  const inputBg = dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
  const userColor = dark ? 'text-blue-300' : 'text-blue-600'
  const assistantColor = dark ? 'text-gray-200' : 'text-gray-800'

  return (
    <div className={`${bodyBg} border rounded-xl shadow-xl flex flex-col w-full h-full min-w-[260px]`}
         style={{ minHeight: collapsed ? 0 : 320 }}>

      {!collapsed && (
        <NodeResizer
          minWidth={260} minHeight={320}
          isVisible={selected}
          lineClassName={dark ? '!border-blue-500' : '!border-blue-400'}
          handleClassName="!bg-blue-500 !border-blue-300"
        />
      )}

      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />

      {/* HEADER — drag handle + title + controls */}
      <div
        className={`drag-handle flex items-center gap-1 px-2 py-2 rounded-t-xl flex-shrink-0 cursor-grab active:cursor-grabbing select-none ${headerBase} ${headerBorder} ${collapsed ? 'rounded-b-xl' : ''}`}
        style={headerStyle}
      >
        {/* Collapse toggle */}
        <button
          onClick={e => { e.stopPropagation(); toggleCollapse() }}
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors text-xs nodrag`}
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
              className="bg-transparent text-sm font-medium outline-none w-full"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-sm font-medium truncate block cursor-pointer hover:opacity-80"
              onDoubleClick={e => { e.stopPropagation(); setEditingTitle(true) }}
              title="Double-click to rename"
            >
              {title}
            </span>
          )}
        </div>

        {/* Color picker */}
        <div className="relative flex-shrink-0 nodrag" ref={paletteRef}>
          <button
            onClick={e => { e.stopPropagation(); setShowPalette(v => !v) }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors text-xs"
            title="Header color"
          >
            🎨
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
                  onClick={() => pickColor(c.bg)}
                  title={c.label}
                  className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${
                    headerBg === c.bg ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.bg || (dark ? '#374151' : '#e5e7eb') }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => d.onDelete(id)}
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors text-sm nodrag ${textMuted} hover:!text-red-400`}
        >
          ×
        </button>
      </div>

      {/* Body — hidden when collapsed */}
      {!collapsed && (
        <>
          <div className="nodrag nopan flex-1 overflow-y-auto p-3 space-y-2 min-h-0 cursor-text">
            {messages.length === 0 && (
              <p className={`${textMuted} text-xs text-center pt-8`}>Ask anything…</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`text-xs leading-relaxed ${m.role === 'user' ? userColor : assistantColor}`}>
                <span className={`${textMuted} mr-1`}>{m.role === 'user' ? 'You' : 'Claude'}:</span>
                <span className="whitespace-pre-wrap select-text">{m.content}</span>
                {m.role === 'assistant' && m.content === '' && streaming && (
                  <span className="animate-pulse text-gray-500">▋</span>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className={`border-t ${dark ? 'border-gray-700' : 'border-gray-200'} p-2 flex gap-2 flex-shrink-0`}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message… (Enter to send)"
              rows={2}
              className={`flex-1 ${inputBg} border rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-blue-500 nodrag nopan`}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg px-2 text-xs font-medium transition-colors self-end py-1.5 nodrag"
            >
              ↑
            </button>
          </div>
        </>
      )}
    </div>
  )
}
