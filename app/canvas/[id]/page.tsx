'use client'

import { use, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Canvas } from '@prisma/client'
import { LineData, ShapeData, CanvasData } from '@/types/canvas'
import type { DrawingBoardRef } from '@/components/DrawingBoard'
import DeleteCanvasButton from '@/components/DeleteCanvasButton'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'

const DrawingBoard = dynamic(() => import('@/components/DrawingBoard'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div>
    </div>
  )
})

interface PageProps {
  params: Promise<{ id: string }>
}

function isValidCanvasData(data: unknown): data is CanvasData {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  
  // Check if it has lines array
  if (!('lines' in obj) || !Array.isArray(obj.lines)) {
    return false
  }
  
  // Shapes array is optional for backward compatibility
  if ('shapes' in obj && !Array.isArray(obj.shapes)) {
    return false
  }
  
  return true
}

export default function EditCanvasPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const drawingBoardRef = useRef<DrawingBoardRef>(null)
  const [canvas, setCanvas] = useState<Canvas | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load canvas data
  useEffect(() => {
    async function loadCanvas() {
      try {
        const response = await fetch(`/api/canvas/${id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Canvas not found')
          }
          throw new Error('Failed to load canvas')
        }

        const data = await response.json()
        setCanvas(data.canvas)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load canvas')
      } finally {
        setIsLoading(false)
      }
    }

    loadCanvas()
  }, [id])

  // Socket.io connection
  useEffect(() => {
    const socket = connectSocket()
    
    socket.on('connect', () => {
      console.log('✅ Connected to Socket.io server!')
      socket.emit('join-canvas', id)
    })
    
    socket.on('user-joined', (data) => {
      console.log('👤 User joined:', data)
    })

    socket.on('user-left', (data) => {
      console.log('👤 User left:', data)
    })

    socket.on('canvas-users', (data) => {
      console.log('👥 Current users in canvas:', data)
      setOnlineUsers(data.users.length)
    })
    
    socket.on('remote-draw', (data) => {
      console.log('🎨 Remote drawing received:', data)
      if (data.type === 'line') {
        drawingBoardRef.current?.addRemoteLine(data.data)
      } else if (data.type === 'shape') {
        drawingBoardRef.current?.addRemoteShape(data.data)
      } else {
        // Backward compatibility - assume it's a line
        drawingBoardRef.current?.addRemoteLine(data.line)
      }
    })
    
    return () => {
      socket.emit('leave-canvas')
      disconnectSocket()
    }
  }, [id])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // Auto-save function - ONLY saves data, NO thumbnails
  const autoSave = useCallback(async () => {
    const canvasData = drawingBoardRef.current?.getCanvasData()
    
    if (!canvasData) return
    
    try {
      const response = await fetch(`/api/canvas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: canvasData,
          thumbnailDataUrl: 'skip',
        }),
      })

      if (response.ok) {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [id])

  // Debounced auto-save handler AND drawing broadcaster
  // Track previous data to detect what's new
  const previousDataRef = useRef<CanvasData>({ lines: [], shapes: [] })

  const handleCanvasChange = useCallback((data: CanvasData) => {
    // Debounce the auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSave()
    }, 50)

    // Broadcast only what's NEW
    const socket = getSocket()
    if (socket.connected) {
      const prevData = previousDataRef.current
      
      // Check if a new line was added
      if (data.lines.length > prevData.lines.length) {
        const newLine = data.lines[data.lines.length - 1]
        socket.emit('canvas-draw', {
          canvasId: id,
          type: 'line',
          data: newLine
        })
      }
      
      // Check if a new shape was added
      if (data.shapes && data.shapes.length > (prevData.shapes?.length || 0)) {
        const newShape = data.shapes[data.shapes.length - 1]
        socket.emit('canvas-draw', {
          canvasId: id,
          type: 'shape',
          data: newShape
        })
      }
      
      // Update the reference for next comparison
      previousDataRef.current = data
    }
  }, [autoSave, id])


  // Manual save - Sends both data and thumbnail
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      const canvasData = drawingBoardRef.current?.getCanvasData()
      const thumbnailDataUrl = drawingBoardRef.current?.getThumbnail()
      
      if (!canvasData) {
        throw new Error('Unable to get canvas data')
      }

      const response = await fetch(`/api/canvas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: canvasData,
          thumbnailDataUrl: thumbnailDataUrl || 'skip',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save canvas')
      }

      setLastSaved(new Date())
      setError(null)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save canvas')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!canvas) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Canvas Not Found</h1>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const initialData = isValidCanvasData(canvas.data) 
    ? canvas.data 
    : { lines: [], shapes: [] }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Simple Saving Indicator */}
      {isSaving && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Saving canvas and generating thumbnail...</span>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`text-gray-400 hover:text-white transition-colors ${
                isSaving ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''
              }`}
            >
              ← Back
            </Link>
            <h1 className="text-lg font-semibold text-white">{canvas.name}</h1>
            {lastSaved && (
              <span className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {onlineUsers > 1 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm font-medium">
                  {onlineUsers} users online
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={isSaving ? 'pointer-events-none opacity-50' : ''}>
              <DeleteCanvasButton 
                canvasId={canvas.id} 
                canvasName={canvas.name}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Error/Success Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 mx-4 mt-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Drawing Board */}
      <div className="flex-1 overflow-hidden">
        <DrawingBoard 
          ref={drawingBoardRef} 
          initialData={initialData}
          onLinesChange={handleCanvasChange}
        />
      </div>
    </div>
  )
}