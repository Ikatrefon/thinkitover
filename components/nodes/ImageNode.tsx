'use client'

import { useRef } from 'react'
import { Handle, Position, NodeProps, NodeResizer, useReactFlow } from '@xyflow/react'

interface ImageData {
  imageId: string
  filename: string
  isDark: boolean
  onDelete: (id: string) => void
}

const SAVE_DELAY = 800

export default function ImageNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ImageData
  const { getNode } = useReactFlow()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onResizeEnd() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const node = getNode(id)
      if (!node) return
      fetch(`/api/images/${d.imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          width: node.style?.width,
          height: node.style?.height,
        }),
      })
    }, SAVE_DELAY)
  }

  const src = `/api/files/${d.filename}`

  return (
    <div className="relative w-full h-full group">
      <NodeResizer
        minWidth={80}
        minHeight={60}
        isVisible={selected}
        lineClassName="!border-blue-400"
        handleClassName="!bg-blue-500 !border-blue-300"
        onResizeEnd={onResizeEnd}
      />

      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />

      {/* Delete button — visible on hover */}
      <button
        onClick={() => d.onDelete(id)}
        className="nodrag absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-black/60 text-white text-sm leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
      >
        ×
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain rounded-lg select-none"
        draggable={false}
      />
    </div>
  )
}
