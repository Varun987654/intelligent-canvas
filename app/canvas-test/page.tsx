'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { LineData } from '@/types/canvas'

// Dynamically import DrawingBoard
const DrawingBoard = dynamic(() => import('@/components/DrawingBoard'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/50"></div>
    </div>
  )
})

export default function CanvasTestPage() {
  const handleSave = (data: { lines: LineData[] }) => {
    console.log('Canvas data:', data)
    // Here we'll save to database later
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="text-white/70 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Link>
            <div className="w-px h-6 bg-white/20" />
            <h1 className="text-white font-semibold">Canvas Test</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full border border-green-500/30">
              Drawing Mode
            </div>
          </div>
        </div>
      </div>

      {/* Drawing Board */}
      <div className="pt-20 p-8 h-screen">
        <div className="h-full max-w-7xl mx-auto">
          <div className="h-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            <DrawingBoard onSave={handleSave} />
          </div>
        </div>
      </div>
    </div>
  )
}