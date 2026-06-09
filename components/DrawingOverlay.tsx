'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false, loading: () => <div className="w-full h-full bg-transparent" /> }
)

interface Props {
  boardId: string
  initialData: string // JSON string
  isDark: boolean
  onClose: () => void
  onSave: (drawing: string) => void
}

export default function DrawingOverlay({ boardId, initialData, isDark, onClose, onSave }: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [initialElements, setInitialElements] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [initialAppState, setInitialAppState] = useState<any>({})

  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData)
        setInitialElements(parsed.elements || [])
        setInitialAppState(parsed.appState || {})
      } catch { /* invalid JSON */ }
    }
  }, [initialData])

  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: any) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const drawing = JSON.stringify({ elements, appState })
        onSave(drawing)
        fetch(`/api/boards/${boardId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drawing }),
        })
      }, 1000)
    },
    [boardId]
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: isDark ? '#1e1e2e' : '#ffffff' }}>
      {/* Toolbar strip */}
      <div className="flex-shrink-0 flex items-center justify-end px-3 py-1.5 bg-black/30 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/30 text-white transition-colors"
        >
          ✓ Done drawing
        </button>
      </div>

      {/* Excalidraw canvas */}
      <div className="flex-1 min-h-0">
        <Excalidraw
          initialData={{ elements: initialElements, appState: { ...initialAppState, theme: isDark ? 'dark' : 'light', viewBackgroundColor: initialAppState.viewBackgroundColor ?? (isDark ? '#1e1e2e' : '#ffffff') } }}
          onChange={handleChange}
          UIOptions={{ canvasActions: { changeViewBackgroundColor: false, export: false, loadScene: false, saveToActiveFile: false, saveAsImage: false, toggleTheme: false } }}
        />
      </div>
    </div>
  )
}
