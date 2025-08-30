export interface DrawingSettings {
  tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'line'
  color: string
  strokeWidth: number
}

export interface LineData {
  points: number[]
  color: string
  strokeWidth: number
  tool: 'pen' | 'eraser'
}

export interface ShapeData {
  type: 'rectangle' | 'circle' | 'arrow' | 'line'
  points: number[] // [x1, y1, x2, y2] for all shapes
  color: string
  strokeWidth: number
  fill?: string // Optional fill color
}

export interface CanvasData {
  lines: LineData[]
  shapes: ShapeData[]
}

// Add this new interface
export interface HistoryState {
  data: CanvasData
  timestamp: number
}