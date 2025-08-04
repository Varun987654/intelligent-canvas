export interface DrawingSettings {
       tool: 'pen' | 'eraser'
       color: string
       strokeWidth: number
     }
     
     export interface LineData {
       points: number[]
       color: string
       strokeWidth: number
       tool: 'pen' | 'eraser'
     }