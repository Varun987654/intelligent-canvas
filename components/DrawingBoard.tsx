'use client'

import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Toolbar from './Toolbar'
import { DrawingSettings, CanvasData, TextData, LineData, ShapeData } from '@/types/canvas'
import type { CanvasRef } from './Canvas'

const Canvas = dynamic(() => import('./Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div>
    </div>
  )
})

const SETTINGS_STORAGE_KEY = 'canvasDrawingSettings'

const defaultSettings: DrawingSettings = {
  tool: 'pen',
  color: '#000000',
  strokeWidth: 3
}

interface DrawingBoardProps {
  data?: CanvasData
  onCursorMove?: (point: { x: number; y: number } | null) => void
  onCursorLeave?: () => void
  onTextAdd?: (text: TextData) => void
  onDeleteItem?: (elementId: string) => void
  onDrawEnd?: (item: { type: 'line' | 'shape'; data: LineData | ShapeData }) => void;
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export interface DrawingBoardRef {
  getThumbnail: (options?: { pixelRatio?: number; mimeType?: string }) => string | null
}

const DrawingBoard = forwardRef<DrawingBoardRef, DrawingBoardProps>(({ 
  data,
  onCursorMove, 
  onCursorLeave,
  onTextAdd,
  onDeleteItem,
  onDrawEnd,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}, ref) => {
  const [settings, setSettings] = useState<DrawingSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (saved) {
        try { return JSON.parse(saved) } catch (e) { console.error('Failed to parse saved settings:', e) }
      }
    }
    return defaultSettings
  })

  const canvasRef = useRef<CanvasRef>(null)

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); onUndo?.(); return }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); onRedo?.(); return }
      }
      
      switch(e.key.toLowerCase()) {
        case 'p': setSettings(prev => ({ ...prev, tool: 'pen' })); break
        case 'e': setSettings(prev => ({ ...prev, tool: 'eraser' })); break
        case 'r': setSettings(prev => ({ ...prev, tool: 'rectangle' })); break
        case 'c': setSettings(prev => ({ ...prev, tool: 'circle' })); break
        case 'a': setSettings(prev => ({ ...prev, tool: 'arrow' })); break
        case 'l': setSettings(prev => ({ ...prev, tool: 'line' })); break
        case 't': setSettings(prev => ({ ...prev, tool: 'text' })); break
        case 'd': setSettings(prev => ({ ...prev, tool: 'delete' })); break
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onUndo, onRedo]);

  useImperativeHandle(ref, () => ({
    getThumbnail: (options) => canvasRef.current?.getThumbnail(options) || null,
  }), [])

  const handleClear = () => {
    // A proper clear function would now need to be passed down from page.tsx
    // For now, it does nothing to prevent errors.
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar 
        settings={settings}
        onSettingsChange={setSettings}
        onClearCanvas={handleClear}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div className="flex-1">
        <Canvas 
          ref={canvasRef}
          settings={settings}
          data={data}
          onCursorMove={onCursorMove}
          onCursorLeave={onCursorLeave}
          onTextAdd={onTextAdd}
          onDeleteItem={onDeleteItem}
          onDrawEnd={onDrawEnd}
        />
      </div>
    </div>
  )
})

DrawingBoard.displayName = 'DrawingBoard'
export default DrawingBoard