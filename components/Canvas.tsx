'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Stage, Layer, Line } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import Konva from 'konva'
import { DrawingSettings, LineData } from '@/types/canvas'

interface CanvasProps {
  settings: DrawingSettings
  onLinesChange?: (lines: LineData[]) => void
  initialData?: { lines: LineData[] }
}

export interface CanvasRef {
  clearCanvas: () => void
  getLines: () => LineData[]
  getThumbnail: () => string | null
  addRemoteLine: (line: LineData) => void  // ADDED THIS
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ settings, onLinesChange, initialData }, ref) => {
  const [lines, setLines] = useState<LineData[]>(initialData?.lines || [])
  const [isDrawing, setIsDrawing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  
  // Performance optimization: Use refs for drawing in progress
  const stageRef = useRef<Konva.Stage>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const isDrawingRef = useRef(false)
  const currentLineRef = useRef<Konva.Line | null>(null)

  // Initialize with saved data
  useEffect(() => {
    if (initialData?.lines && initialData.lines.length > 0) {
      setLines(initialData.lines)
    }
  }, [initialData])

  // Handle responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Listen for mouse/touch release globally
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDrawingRef.current) {
        finishDrawing()
      }
    }

    const handleGlobalTouchEnd = () => {
      if (isDrawingRef.current) {
        finishDrawing()
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalTouchEnd)

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalTouchEnd)
    }
  }, [])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      setLines([])
      layerRef.current?.destroyChildren()
      layerRef.current?.draw()
    },
    getLines: () => lines,
    getThumbnail: () => {
      const stage = stageRef.current
      if (!stage) return null
      
      try {
        return stage.toDataURL({
          pixelRatio: 0.5,  // Lower resolution for thumbnails
          mimeType: 'image/jpeg',
          quality: 0.8
        })
      } catch (error) {
        console.error('Failed to generate thumbnail:', error)
        return null
      }
    },
    addRemoteLine: (line: LineData) => {  // ADDED THIS METHOD
      setLines(prevLines => [...prevLines, line])
      // Don't call onLinesChange here to avoid broadcast loop
    }
  }), [lines])

  const startDrawing = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Only draw on left mouse button (button = 0)
    if ('button' in e.evt && e.evt.button !== 0) return
    
    const stage = e.target.getStage()
    const point = stage?.getPointerPosition()
    if (!point || !layerRef.current) return

    isDrawingRef.current = true
    setIsDrawing(true)

    // Create a new line using Konva directly (not React state)
    const line = new Konva.Line({
      stroke: settings.color,
      strokeWidth: settings.tool === 'eraser' ? settings.strokeWidth * 2 : settings.strokeWidth,
      globalCompositeOperation: settings.tool === 'eraser' ? 'destination-out' : 'source-over',
      lineCap: 'round',
      lineJoin: 'round',
      tension: 0.5,
      points: [point.x, point.y]
    })

    layerRef.current.add(line)
    currentLineRef.current = line
  }

  const draw = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawingRef.current || !currentLineRef.current) return

    const stage = e.target.getStage()
    const point = stage?.getPointerPosition()
    if (!point) return
    
    // Update the line directly without React state
    const newPoints = currentLineRef.current.points().concat([point.x, point.y])
    currentLineRef.current.points(newPoints)
    layerRef.current?.batchDraw()
  }

  const finishDrawing = () => {
    if (!isDrawingRef.current || !currentLineRef.current) return

    isDrawingRef.current = false
    setIsDrawing(false)

    // Convert the Konva line to our LineData format and add to state
    const points = currentLineRef.current.points()
    const strokeColor = currentLineRef.current.stroke()
    const newLine: LineData = {
      points,
      color: typeof strokeColor === 'string' ? strokeColor : '#000000',
      strokeWidth: currentLineRef.current.strokeWidth(),
      tool: currentLineRef.current.globalCompositeOperation() === 'destination-out' ? 'eraser' : 'pen'
    }

    const updatedLines = [...lines, newLine]
    setLines(updatedLines)
    onLinesChange?.(updatedLines)

    currentLineRef.current = null
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-white">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={finishDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={finishDrawing}
        >
          <Layer ref={layerRef}>
            {/* Render existing lines from state */}
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  )
})

Canvas.displayName = 'Canvas'

export default Canvas