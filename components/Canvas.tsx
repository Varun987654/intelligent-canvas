'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Stage, Layer, Line, Rect, Circle, Arrow } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import Konva from 'konva'
import { DrawingSettings, LineData, ShapeData, CanvasData, HistoryState } from '@/types/canvas'

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
  undo: () => void
  redo: () => void
  replaceState: (data: CanvasData) => void
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ settings, onLinesChange, initialData }, ref) => {
  const [lines, setLines] = useState<LineData[]>(initialData?.lines || [])
  const [shapes, setShapes] = useState<ShapeData[]>(initialData?.shapes || [])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShapePreview, setCurrentShapePreview] = useState<ShapeData | null>(null)
  

  // Combined history state to avoid stale closures
  const [historyState, setHistoryState] = useState<{
    history: HistoryState[]
    index: number
  }>({
    history: [],
    index: -1
  })
  
  const isUndoRedoRef = useRef(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  
  // Performance optimization: Use refs for drawing in progress
  const stageRef = useRef<Konva.Stage>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const isDrawingRef = useRef(false)
  const currentLineRef = useRef<Konva.Line | null>(null)
  const drawStartPoint = useRef<{ x: number; y: number } | null>(null)

  // Initialize history with the initial state
  useEffect(() => {
    const initialState: HistoryState = {
      data: { 
        lines: initialData?.lines || [], 
        shapes: initialData?.shapes || [] 
      },
      timestamp: Date.now()
    }
    setHistoryState({
      history: [initialState],
      index: 0
    })
  }, []) // Run only once on mount

  // Save current state to history
  const saveToHistory = (newLines: LineData[], newShapes: ShapeData[]) => {
    const newState: HistoryState = {
      data: { lines: newLines, shapes: newShapes },
      timestamp: Date.now()
    }

    setHistoryState(prev => {
      const validHistory = prev.history.slice(0, prev.index + 1)
      const newHistory = [...validHistory, newState]
      
      if (newHistory.length > 50) {
        newHistory.shift()
        return {
          history: newHistory,
          index: newHistory.length - 1
        }
      }
      
      return {
        history: newHistory,
        index: newHistory.length - 1
      }
    })
  }

  // This effect runs whenever lines or shapes change, handling LOCAL side effects.
  useEffect(() => {
    // This is the crucial guard. If the change was from an undo/redo or a remote
    // action, isUndoRedoRef will be true, and we should not save a new history state.
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false; // Reset the flag
      return;
    }

    // Don't save on the very first render.
    if (historyState.index === -1 && lines.length === 0 && shapes.length === 0) {
      return;
    }
    
    // The state is guaranteed to be fresh here.
    saveToHistory(lines, shapes);
    onLinesChange?.({ lines, shapes });

  }, [lines, shapes]); // Dependency array ensures this runs when state is updated

  // Initialize with saved data
  useEffect(() => {
    if (initialData) {
      isUndoRedoRef.current = true; // Prevent saving initial data to history
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
      isUndoRedoRef.current = false; // This is a local action, save to history
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
      isUndoRedoRef.current = true; // Remote action, don't save to history
      setLines(prevLines => [...prevLines, line])
    },
    addRemoteShape: (shape: ShapeData) => {
      isUndoRedoRef.current = true; // Remote action, don't save to history
      setShapes(prevShapes => [...prevShapes, shape])
    },
    replaceState: (data: CanvasData) => {
      isUndoRedoRef.current = true; // Set flag to prevent new history entry
      setLines(data.lines || [])
      setShapes(data.shapes || [])
    },
    undo: () => {
      if (historyState.index > 0) {
        isUndoRedoRef.current = true; // Set flag to prevent new history entry
        const prevState = historyState.history[historyState.index - 1]
        setLines(prevState.data.lines)
        setShapes(prevState.data.shapes || [])
        setHistoryState(prev => ({ ...prev, index: prev.index - 1 }))
        onLinesChange?.({ ...prevState.data, isUndoRedo: true } as any)
      }
    },
    redo: () => {
      if (historyState.index < historyState.history.length - 1) {
        isUndoRedoRef.current = true; // Set flag to prevent new history entry
        const nextState = historyState.history[historyState.index + 1]
        setLines(nextState.data.lines)
        setShapes(nextState.data.shapes || [])
        setHistoryState(prev => ({ ...prev, index: prev.index + 1 }))
        onLinesChange?.({ ...nextState.data, isUndoRedo: true } as any)
      }
    }
  }), [lines, shapes, historyState, onLinesChange])

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
    if (!isDrawingRef.current) return;
  
    isDrawingRef.current = false;
    setIsDrawing(false);
  
    // This flag will tell our useEffect that this state change was local
    isUndoRedoRef.current = false;
  
    // Handle pen/eraser
    if ((settings.tool === 'pen' || settings.tool === 'eraser') && currentLineRef.current) {
      const points = currentLineRef.current.points();
      if (points.length > 2) {
        const strokeValue = currentLineRef.current.stroke();
        const newLine: LineData = {
          points,
          color: typeof strokeValue === 'string' ? strokeValue : '#000000',  // FIX HERE
          strokeWidth: currentLineRef.current.strokeWidth(),
          tool: currentLineRef.current.globalCompositeOperation() === 'destination-out' ? 'eraser' : 'pen'
        };
        // Just update the lines state. The useEffect will handle all side effects.
        setLines(prevLines => [...prevLines, newLine]);
      }
      currentLineRef.current.destroy();
      currentLineRef.current = null;
    }
    // Handle shapes
    else if (currentShapePreview) {
      // Just update the shapes state. The useEffect will handle all side effects.
      setShapes(prevShapes => [...prevShapes, currentShapePreview]);
      setCurrentShapePreview(null);
    }
  
    drawStartPoint.current = null;
  };

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