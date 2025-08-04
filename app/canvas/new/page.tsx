'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { LineData } from '@/types/canvas'
import type { DrawingBoardRef } from '@/components/DrawingBoard'

const DrawingBoard = dynamic(() => import('@/components/DrawingBoard'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div>
    </div>
  )
})

export default function NewCanvasPage() {
  const router = useRouter()
  const drawingBoardRef = useRef<DrawingBoardRef>(null)
  const [canvasName, setCanvasName] = useState('Untitled Canvas')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNameDialog, setShowNameDialog] = useState(true)
  const [canvasId, setCanvasId] = useState<string | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isCreatingRef = useRef(false)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // Create canvas and get ID
  const createCanvas = useCallback(async (data: { lines: LineData[] }) => {
    if (isCreatingRef.current || canvasId) return
    
    isCreatingRef.current = true
    
    try {
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: canvasName,
          data,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create canvas')
      }

      const { canvas } = await response.json()
      setCanvasId(canvas.id)
      
      // Redirect to edit page with the new canvas
      router.replace(`/canvas/${canvas.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create canvas')
      isCreatingRef.current = false
    }
  }, [canvasName, canvasId, router])

  // Handle canvas changes (auto-save)
  const handleCanvasChange = useCallback((lines: LineData[]) => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    // If we have lines but no canvas ID yet, create the canvas
    if (lines.length > 0 && !canvasId) {
      autoSaveTimerRef.current = setTimeout(() => {
        createCanvas({ lines })
      }, 50)  // Ultra-responsive auto-save
    }
  }, [canvasId, createCanvas])

  // Manual save button handler
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      const canvasData = drawingBoardRef.current?.getCanvasData()
      
      if (!canvasData || canvasData.lines.length === 0) {
        throw new Error('No drawing to save')
      }

      await createCanvas(canvasData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save canvas')
    } finally {
      setIsSaving(false)
    }
  }

  if (showNameDialog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Create New Canvas</h2>
          <form onSubmit={(e) => {
            e.preventDefault()
            setShowNameDialog(false)
          }}>
            <div className="mb-6">
              <label htmlFor="canvas-name" className="block text-sm font-medium text-gray-300 mb-2">
                Canvas Name
              </label>
              <input
                type="text"
                id="canvas-name"
                value={canvasName}
                onChange={(e) => setCanvasName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter canvas name"
                autoFocus
                required
              />
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 text-center px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Drawing
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back
            </Link>
            <h1 className="text-lg font-semibold text-white">{canvasName}</h1>
            {isSaving && (
              <span className="text-sm text-gray-400">Saving...</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || isCreatingRef.current}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Canvas
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 mx-4 mt-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Drawing Board */}
      <div className="flex-1 overflow-hidden">
        <DrawingBoard 
          ref={drawingBoardRef}
          onLinesChange={handleCanvasChange}
        />
      </div>
    </div>
  )
}