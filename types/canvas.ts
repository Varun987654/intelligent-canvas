export interface DrawingSettings {
  tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'line'
  color: string
  strokeWidth: number
}

export interface LineData {
  id?: string  // Add unique ID
  userId?: string  // Track who drew it
  points: number[]
  color: string
  strokeWidth: number
  tool: 'pen' | 'eraser'
}

export interface ShapeData {
  id?: string  // Add unique ID
  userId?: string  // Track who drew it
  type: 'rectangle' | 'circle' | 'arrow' | 'line'
  points: number[]
  color: string
  strokeWidth: number
  fill?: string
}

export interface CanvasData {
  lines: LineData[]
  shapes: ShapeData[]
}

export interface HistoryState {
  data: CanvasData
  timestamp: number
}