'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Stage, Layer, Line, Rect, Circle, Arrow, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import Konva from 'konva'
import { DrawingSettings, LineData, ShapeData, CanvasData, TextData } from '@/types/canvas'

type CanvasElement = LineData | ShapeData | TextData;

interface CanvasProps {
  settings: DrawingSettings
  data?: CanvasData
  onCursorMove?: (point: { x: number; y: number } | null) => void
  onCursorLeave?: () => void
  onTextAdd?: (text: TextData) => void
  onDeleteItem?: (elementId: string) => void;
  onDrawEnd?: (item: { type: 'line' | 'shape'; data: LineData | ShapeData }) => void;
}

export interface CanvasRef {
  getThumbnail: (options?: { pixelRatio?: number; mimeType?: string }) => string | null
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ settings, data, onCursorMove, onCursorLeave, onTextAdd, onDeleteItem, onDrawEnd }, ref) => {
  const [currentShapePreview, setCurrentShapePreview] = useState<ShapeData | null>(null)
  const [isAddingText, setIsAddingText] = useState(false)
  const [textInputPosition, setTextInputPosition] = useState<{x: number; y: number} | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  
  const stageRef = useRef<Konva.Stage>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const isDrawingRef = useRef(false)
  const currentLineRef = useRef<Konva.Line | null>(null)
  const drawStartPoint = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const finishDrawing = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    
    if ((settings.tool === 'pen' || settings.tool === 'eraser') && currentLineRef.current) {
      const points = currentLineRef.current.points()
      if (points.length > 2) {
        const strokeValue = currentLineRef.current.stroke()
        const newLine: LineData = {
          tempId: `temp-${Date.now()}`,
          points,
          color: typeof strokeValue === 'string' ? strokeValue : '#000000',
          strokeWidth: currentLineRef.current.strokeWidth(),
          tool: currentLineRef.current.globalCompositeOperation() === 'destination-out' ? 'eraser' : 'pen',
          createdAt: Date.now(),
        }
        onDrawEnd?.({ type: 'line', data: newLine });
      }
      currentLineRef.current.destroy()
      currentLineRef.current = null
    } else if (currentShapePreview) {
      const shapeWithTempId: ShapeData = {
        ...currentShapePreview,
        tempId: `temp-${Date.now()}`,
        createdAt: Date.now(),
      }
      onDrawEnd?.({ type: 'shape', data: shapeWithTempId });
      setCurrentShapePreview(null)
    }
    drawStartPoint.current = null
  }, [settings.tool, onDrawEnd, settings.color, settings.strokeWidth]);

  useEffect(() => {
    const handleGlobalMouseUp = () => { if (isDrawingRef.current) finishDrawing() }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalMouseUp)
    return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp)
        window.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [finishDrawing])

  useImperativeHandle(ref, () => ({
    getThumbnail: (options = {}) => {
      const stage = stageRef.current
      if (!stage) return null
      return stage.toDataURL({
        pixelRatio: options.pixelRatio || 2,
        mimeType: options.mimeType || 'image/png',
        quality: 1,
      })
    },
  }), [])

  const startDrawing = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (settings.tool === 'delete' || isAddingText) return;
    if (settings.tool === 'text') { handleStageClick(e); return; }
    
    if ('button' in e.evt && e.evt.button !== 0) return
    const stage = e.target.getStage()
    const point = stage?.getPointerPosition()
    if (!point || !layerRef.current) return

    isDrawingRef.current = true

    if (settings.tool === 'pen' || settings.tool === 'eraser') {
      const line = new Konva.Line({
        stroke: settings.color,
        strokeWidth: settings.tool === 'eraser' ? settings.strokeWidth * 2 : settings.strokeWidth,
        globalCompositeOperation: settings.tool === 'eraser' ? 'destination-out' : 'source-over',
        lineCap: 'round', lineJoin: 'round', tension: 0.5, points: [point.x, point.y],
      })
      layerRef.current.add(line)
      currentLineRef.current = line
    } else {
      drawStartPoint.current = point
    }
  }
  
  const handleStageClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (settings.tool !== 'text') return;
    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;
    setTextInputPosition(point);
    setIsAddingText(true);
  };
  
  const draw = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawingRef.current || settings.tool === 'text' || settings.tool === 'delete') return
    const stage = e.target.getStage()
    const point = stage?.getPointerPosition()
    if (!point) return
    
    if ((settings.tool === 'pen' || settings.tool === 'eraser') && currentLineRef.current) {
      const newPoints = currentLineRef.current.points().concat([point.x, point.y])
      currentLineRef.current.points(newPoints)
      layerRef.current?.batchDraw()
    } else if (drawStartPoint.current && ['rectangle', 'circle', 'arrow', 'line'].includes(settings.tool)) {
      setCurrentShapePreview({
        type: settings.tool as 'rectangle' | 'circle' | 'arrow' | 'line',
        points: [drawStartPoint.current.x, drawStartPoint.current.y, point.x, point.y],
        color: settings.color,
        strokeWidth: settings.strokeWidth,
        createdAt: 0,
      })
    }
  }
  
  const TextInput = () => {
    const [value, setValue] = useState('')
    if (!isAddingText || !textInputPosition) return null
    
    const handleSubmit = () => {
      if (value.trim()) {
        const newText: TextData = {
          tempId: `temp-${Date.now()}`,
          x: textInputPosition.x,
          y: textInputPosition.y,
          text: value,
          fontSize: 16,
          fontFamily: 'Arial',
          color: settings.color,
          createdAt: Date.now(),
        }
        onTextAdd?.(newText)
      }
      setIsAddingText(false)
      setTextInputPosition(null)
    }
    
    return (
      <div style={{ position: 'absolute', left: textInputPosition.x, top: textInputPosition.y, zIndex: 1000 }} onMouseDown={(e) => e.stopPropagation()}>
        <textarea autoFocus value={value} onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            if (e.key === 'Escape') { setIsAddingText(false); setTextInputPosition(null); }
          }}
          className="px-2 py-1 border border-purple-500 rounded shadow-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Type text..."
        />
      </div>
    )
  }

  const renderElement = (element: CanvasElement, index: number) => {
    const key = element.id || element.tempId || `element-${index}`;
    const handleDeleteClick = () => {
        if (settings.tool === 'delete' && element.id) {
            onDeleteItem?.(element.id);
        }
    };

    if ('tool' in element) {
        return <Line key={key} points={element.points} stroke={element.color} strokeWidth={element.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" globalCompositeOperation={element.tool === 'eraser' ? 'destination-out' : 'source-over'} onClick={handleDeleteClick} onTap={handleDeleteClick} />;
    }

    if ('text' in element) {
        return <Text key={key} x={element.x} y={element.y} text={element.text} fontSize={element.fontSize} fontFamily={element.fontFamily} fill={element.color} onClick={handleDeleteClick} onTap={handleDeleteClick} />;
    }

    if ('type' in element) {
        const [x1, y1, x2, y2] = element.points;
        const width = x2 - x1;
        const height = y2 - y1;
        switch (element.type) {
            case 'rectangle': return <Rect key={key} x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(width)} height={Math.abs(height)} stroke={element.color} strokeWidth={element.strokeWidth} fill={element.fill || 'transparent'} onClick={handleDeleteClick} onTap={handleDeleteClick} />;
            case 'circle': const radius = Math.sqrt(width * width + height * height) / 2; return <Circle key={key} x={(x1 + x2) / 2} y={(y1 + y2) / 2} radius={radius} stroke={element.color} strokeWidth={element.strokeWidth} fill={element.fill || 'transparent'} onClick={handleDeleteClick} onTap={handleDeleteClick} />;
            case 'arrow': return <Arrow key={key} points={element.points} stroke={element.color} strokeWidth={element.strokeWidth} fill={element.color} pointerLength={10} pointerWidth={10} onClick={handleDeleteClick} onTap={handleDeleteClick} />;
            case 'line': return <Line key={key} points={element.points} stroke={element.color} strokeWidth={element.strokeWidth} lineCap="round" onClick={handleDeleteClick} onTap={handleDeleteClick} />;
        }
    }
    return null;
  };

  const sortedElements = data ? [...(data.lines || []), ...(data.shapes || []), ...(data.texts || [])].sort((a, b) => a.createdAt - b.createdAt) : [];

  return (
    <div ref={containerRef} className="w-full h-full bg-white relative">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage ref={stageRef} width={dimensions.width} height={dimensions.height} onMouseDown={startDrawing} onMouseUp={finishDrawing} onTouchStart={startDrawing} onTouchEnd={finishDrawing} onMouseMove={(e) => { draw(e); onCursorMove?.(e.target.getStage()?.getPointerPosition() ?? null); }} onMouseLeave={onCursorLeave} onClick={handleStageClick}>
          <Layer ref={layerRef}>
            {sortedElements.map((element, i) => renderElement(element, i))}
            
            {currentShapePreview && (() => {
                const [x1, y1, x2, y2] = currentShapePreview.points;
                const width = x2 - x1;
                const height = y2 - y1;
                switch (currentShapePreview.type) {
                    case 'rectangle': return <Rect x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(width)} height={Math.abs(height)} stroke={currentShapePreview.color} strokeWidth={currentShapePreview.strokeWidth} />;
                    case 'circle': const radius = Math.sqrt(width*width + height*height)/2; return <Circle x={(x1+x2)/2} y={(y1+y2)/2} radius={radius} stroke={currentShapePreview.color} strokeWidth={currentShapePreview.strokeWidth}/>;
                    case 'arrow': return <Arrow points={currentShapePreview.points} stroke={currentShapePreview.color} strokeWidth={currentShapePreview.strokeWidth} fill={currentShapePreview.color} pointerLength={10} pointerWidth={10}/>;
                    case 'line': return <Line points={currentShapePreview.points} stroke={currentShapePreview.color} strokeWidth={currentShapePreview.strokeWidth} lineCap="round"/>;
                }
            })()}
          </Layer>
        </Stage>
      )}
      <TextInput />
    </div>
  )
})

Canvas.displayName = 'Canvas'
export default Canvas