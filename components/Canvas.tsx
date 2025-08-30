'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Stage, Layer, Line, Rect, Circle, Arrow } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import Konva from 'konva'
import { DrawingSettings, LineData, ShapeData, CanvasData } from '@/types/canvas'

interface CanvasProps {
  settings: DrawingSettings
  onLinesChange?: (data: CanvasData) => void
  initialData?: CanvasData
}

export interface CanvasRef {
  clearCanvas: () => void
  getCanvasData: () => CanvasData
  getThumbnail: () => string | null
  addRemoteLine: (line: LineData) => void
  addRemoteShape: (shape: ShapeData) => void
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ settings, onLinesChange, initialData }, ref) => {
  const [lines, setLines] = useState<LineData[]>(initialData?.lines || [])
  const [shapes, setShapes] = useState<ShapeData[]>(initialData?.shapes || [])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShapePreview, setCurrentShapePreview] = useState<ShapeData | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  
  // Performance optimization: Use refs for drawing in progress
  const stageRef = useRef<Konva.Stage>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const isDrawingRef = useRef(false)
  const currentLineRef = useRef<Konva.Line | null>(null)
  const drawStartPoint = useRef<{ x: number; y: number } | null>(null)

  // Initialize with saved data
  useEffect(() => {
    if (initialData) {
      if (initialData.lines && initialData.lines.length > 0) {
        setLines(initialData.lines)
      }
      if (initialData.shapes && initialData.shapes.length > 0) {
        setShapes(initialData.shapes)
      }
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
      setShapes([])
      layerRef.current?.destroyChildren()
      layerRef.current?.draw()
    },
    getCanvasData: () => ({ lines, shapes }),
    getThumbnail: () => {
      const stage = stageRef.current
      if (!stage) return null
      
      try {
        return stage.toDataURL({
          pixelRatio: 0.5,
          mimeType: 'image/jpeg',
          quality: 0.8
        })
      } catch (error) {
        console.error('Failed to generate thumbnail:', error)
        return null
      }
    },
    addRemoteLine: (line: LineData) => {
      setLines(prevLines => [...prevLines, line])
    },
    addRemoteShape: (shape: ShapeData) => {
      setShapes(prevShapes => [...prevShapes, shape])
    }
  }), [lines, shapes])

  const startDrawing = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Only draw on left mouse button (button = 0)
    if ('button' in e.evt && e.evt.button !== 0) return
    
    const stage = e.target.getStage()
    const point = stage?.getPointerPosition()
    if (!point || !layerRef.current) return

    isDrawingRef.current = true
    setIsDrawing(true)
    drawStartPoint.current = point

    // Handle different tools
    if (settings.tool === 'pen' || settings.tool === 'eraser') {
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
    // For shape tools, we'll create preview on mouse move
  }

  const draw = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawingRef.current) return

    const stage = e.target.getStage()
    const point = stage?.getPointerPosition()
    if (!point) return
    
    // Handle pen/eraser
    if ((settings.tool === 'pen' || settings.tool === 'eraser') && currentLineRef.current) {
      const newPoints = currentLineRef.current.points().concat([point.x, point.y])
      currentLineRef.current.points(newPoints)
      layerRef.current?.batchDraw()
    }
    // Handle shape preview
    else if (drawStartPoint.current && ['rectangle', 'circle', 'arrow', 'line'].includes(settings.tool)) {
      const preview: ShapeData = {
        type: settings.tool as 'rectangle' | 'circle' | 'arrow' | 'line',
        points: [drawStartPoint.current.x, drawStartPoint.current.y, point.x, point.y],
        color: settings.color,
        strokeWidth: settings.strokeWidth
      }
      setCurrentShapePreview(preview)
    }
  }

  const finishDrawing = () => {
    if (!isDrawingRef.current) return

    isDrawingRef.current = false
    setIsDrawing(false)

    // Handle pen/eraser
    if ((settings.tool === 'pen' || settings.tool === 'eraser') && currentLineRef.current) {
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
      onLinesChange?.({ lines: updatedLines, shapes })
      currentLineRef.current = null
    }
    // Handle shapes
    else if (currentShapePreview) {
      const updatedShapes = [...shapes, currentShapePreview]
      setShapes(updatedShapes)
      onLinesChange?.({ lines, shapes: updatedShapes })
      setCurrentShapePreview(null)
    }

    drawStartPoint.current = null
  }

  // Render shape based on type
  const renderShape = (shape: ShapeData, index: number) => {
    const [x1, y1, x2, y2] = shape.points
    const width = x2 - x1
    const height = y2 - y1

    switch (shape.type) {
      case 'rectangle':
        return (
          <Rect
            key={`shape-${index}`}
            x={Math.min(x1, x2)}
            y={Math.min(y1, y2)}
            width={Math.abs(width)}
            height={Math.abs(height)}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            fill={shape.fill || 'transparent'}
          />
        )
      case 'circle':
        const radius = Math.sqrt(width * width + height * height) / 2
        return (
          <Circle
            key={`shape-${index}`}
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2}
            radius={radius}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            fill={shape.fill || 'transparent'}
          />
        )
      case 'arrow':
        return (
          <Arrow
            key={`shape-${index}`}
            points={shape.points}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            fill={shape.color}
            pointerLength={10}
            pointerWidth={10}
          />
        )
      case 'line':
        return (
          <Line
            key={`shape-${index}`}
            points={shape.points}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            lineCap="round"
          />
        )
      default:
        return null
    }
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
                key={`line-${i}`}
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
            
            {/* Render existing shapes */}
            {shapes.map((shape, i) => renderShape(shape, i))}
            
            {/* Render shape preview */}
            {currentShapePreview && renderShape(currentShapePreview, -1)}
          </Layer>
        </Stage>
      )}
    </div>
  )
})

Canvas.displayName = 'Canvas'

export default Canvas