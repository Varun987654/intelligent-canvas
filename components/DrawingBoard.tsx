'use client'

import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import dynamic from 'next/dynamic'
import Toolbar from './Toolbar'
import { DrawingSettings, LineData } from '@/types/canvas'
import type { CanvasRef } from './Canvas'

const Canvas = dynamic(() => import('./Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div>
    </div>
  )
})

const initialSettings: DrawingSettings = {
  tool: 'pen',
  color: '#000000',
  strokeWidth: 3
}

interface DrawingBoardProps {
  initialData?: { lines: LineData[] }
  onLinesChange?: (lines: LineData[]) => void
}

export interface DrawingBoardRef {
  getCanvasData: () => { lines: LineData[] }
}

const DrawingBoard = forwardRef<DrawingBoardRef, DrawingBoardProps>(({ initialData, onLinesChange }, ref) => {
  const [settings, setSettings] = useState<DrawingSettings>(initialSettings)
  const canvasRef = useRef<CanvasRef>(null)

  const handleClearCanvas = () => {
    canvasRef.current?.clearCanvas()
  }

  // Expose method to get canvas data
  useImperativeHandle(ref, () => ({
    getCanvasData: () => ({
      lines: canvasRef.current?.getLines() || []
    })
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