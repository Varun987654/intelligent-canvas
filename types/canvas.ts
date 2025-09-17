export interface DrawingSettings {
  tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'delete'
  color: string
  strokeWidth: number
}

export interface LineData {
  id?: string
  tempId?: string
  userId?: string
  points: number[]
  color: string
  strokeWidth: number
  tool: 'pen' | 'eraser'
  createdAt: number
}

export interface TextData {
  id?: string
  tempId?: string
  userId?: string
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
  fontStyle?: 'normal' | 'bold'
  color: string
  createdAt: number
}

export interface ShapeData {
  id?: string
  tempId?: string
  userId?: string
  type: 'rectangle' | 'circle' | 'arrow' | 'line'
  points: number[]
  color: string
  strokeWidth: number
  fill?: string
  createdAt: number
}

export interface CanvasData {
  lines: LineData[]
  shapes: ShapeData[]
  texts: TextData[]
}

export interface HistoryState {
  data: CanvasData
  timestamp: number
}