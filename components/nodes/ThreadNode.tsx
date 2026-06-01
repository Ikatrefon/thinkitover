'use client'

import { useState, useRef, useEffect } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'

interface Message { id: string; role: string; content: string }
interface ThreadData {
  threadId: string
  title: string
  messages: Message[]
  onDelete: (id: string) => void
  onTitleChange: (id: string, title: string) => void
}

export default function ThreadNode({ id, data }: NodeProps) {
  const d = data as unknown as ThreadData
  const [messages, setMessages] = useState<Message[]>(d.messages || [])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(d.title || 'New chat')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
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

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl flex flex-col" style={{ width: 320, height: 420 }}>
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />

      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 flex-shrink-0">
        {editingTitle ? (
          <input
            autoFocus
            defaultValue={title}
            onBlur={e => saveTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveTitle((e.target as HTMLInputElement).value)}
            className="bg-transparent text-sm text-white font-medium outline-none flex-1 min-w-0"
          />
        ) : (
          <span
            className="text-sm text-white font-medium truncate cursor-pointer hover:text-blue-400 flex-1 min-w-0"
            onDoubleClick={() => setEditingTitle(true)}
            title="Double-click to rename"
          >
            {title}
          </span>
        )}
        <button
          onClick={() => d.onDelete(id)}
          className="text-gray-500 hover:text-red-400 transition-colors ml-2 text-base leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center pt-8">Ask anything…</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`text-xs leading-relaxed ${m.role === 'user' ? 'text-blue-300' : 'text-gray-200'}`}>
            <span className="text-gray-600 mr-1">{m.role === 'user' ? 'You' : 'Claude'}:</span>
            <span className="whitespace-pre-wrap">{m.content}</span>
            {m.role === 'assistant' && m.content === '' && streaming && (
              <span className="animate-pulse text-gray-500">▋</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-700 p-2 flex gap-2 flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message… (Enter to send)"
          rows={2}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white resize-none focus:outline-none focus:border-blue-500 nodrag"
        />
        <button
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg px-2 text-xs font-medium transition-colors self-end py-1.5"
        >
          ↑
        </button>
      </div>
    </div>
  )
}
