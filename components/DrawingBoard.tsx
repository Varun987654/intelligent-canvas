'use client'

import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Toolbar from './Toolbar'
import { DrawingSettings, LineData, ShapeData, CanvasData } from '@/types/canvas'
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
  initialData?: CanvasData
  onLinesChange?: (data: CanvasData) => void
}

export interface DrawingBoardRef {
  getCanvasData: () => CanvasData
  getThumbnail: () => string | null
  addRemoteLine: (line: LineData) => void
  addRemoteShape: (shape: ShapeData) => void
}

const DrawingBoard = forwardRef<DrawingBoardRef, DrawingBoardProps>(({ initialData, onLinesChange }, ref) => {
  // Initialize settings from localStorage if available
  const [settings, setSettings] = useState<DrawingSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse saved settings:', e)
        }
      }
    }
    return defaultSettings
  })

  const canvasRef = useRef<CanvasRef>(null)

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch(e.key.toLowerCase()) {
        case 'p':
          setSettings(prev => ({ ...prev, tool: 'pen' }))
          break
        case 'e':
          setSettings(prev => ({ ...prev, tool: 'eraser' }))
          break
        case 'r':
          setSettings(prev => ({ ...prev, tool: 'rectangle' }))
          break
        case 'c':
          setSettings(prev => ({ ...prev, tool: 'circle' }))
          break
        case 'a':
          setSettings(prev => ({ ...prev, tool: 'arrow' }))
          break
        case 'l':
          setSettings(prev => ({ ...prev, tool: 'line' }))
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const handleClearCanvas = () => {
    canvasRef.current?.clearCanvas()
  }

  // Expose methods to get canvas data AND thumbnail
  useImperativeHandle(ref, () => ({
    getCanvasData: () => canvasRef.current?.getCanvasData() || { lines: [], shapes: [] },
    getThumbnail: () => canvasRef.current?.getThumbnail() || null,
    addRemoteLine: (line: LineData) => {
      canvasRef.current?.addRemoteLine(line)
    },
    addRemoteShape: (shape: ShapeData) => {
      canvasRef.current?.addRemoteShape(shape)
    }
  }), [])

  return (
    <div className="flex flex-col h-full">
      <Toolbar 
        settings={settings}
        onSettingsChange={setSettings}
        onClearCanvas={handleClearCanvas}
      />
      <div className="flex-1">
        <Canvas 
          ref={canvasRef}
          settings={settings}
          initialData={initialData}
          onLinesChange={onLinesChange}
        />
      </div>
    </div>
  )
})

DrawingBoard.displayName = 'DrawingBoard'

export default DrawingBoard