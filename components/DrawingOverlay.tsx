'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false, loading: () => <div className="w-full h-full bg-transparent" /> }
)

interface Props {
  boardId: string
  initialData: string
  isDark: boolean
  isEditing: boolean
  onClose: () => void
  onSave: (drawing: string) => void
  onExportToCanvas: (blob: Blob) => void
}

export default function DrawingOverlay({ boardId, initialData, isDark, isEditing, onClose, onSave, onExportToCanvas }: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
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
      if (!isEditing) return
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
    [boardId, isEditing]
  )

  async function handleExportToCanvas() {
    if (!excalidrawAPI) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements = excalidrawAPI.getSceneElements().filter((el: any) => !el.isDeleted)
    if (!elements.length) return
    const { exportToBlob } = await import('@excalidraw/excalidraw')
    const blob = await exportToBlob({
      elements,
      appState: { ...excalidrawAPI.getAppState(), exportBackground: false },
      files: excalidrawAPI.getFiles(),
      mimeType: 'image/png',
      maxWidthOrHeight: 1200,
    })
    onExportToCanvas(blob)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ pointerEvents: isEditing ? 'auto' : 'none' }}
    >
      {isEditing && (
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-3 py-1.5 bg-black/20 backdrop-blur-sm" style={{ pointerEvents: 'auto' }}>
          <button
            onClick={handleExportToCanvas}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/70 hover:bg-blue-500/90 text-white transition-colors"
          >
            ↓ Add to canvas
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            ✓ Done drawing
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <Excalidraw
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
          initialData={{ elements: initialElements, appState: { ...initialAppState, theme: isDark ? 'dark' : 'light', viewBackgroundColor: 'transparent' } }}
          onChange={handleChange}
          viewModeEnabled={!isEditing}
          UIOptions={{ canvasActions: { changeViewBackgroundColor: false, export: false, loadScene: false, saveToActiveFile: false, saveAsImage: false, toggleTheme: false } }}
        />
      </div>
    </div>
  )
}
