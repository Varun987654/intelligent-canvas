'use client'

import { use, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Canvas } from '@prisma/client'
import { LineData } from '@/types/canvas'
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

// Type guard to validate canvas data structure
function isValidCanvasData(data: unknown): data is { lines: LineData[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'lines' in data &&
    Array.isArray((data as any).lines)
  )
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
  const [onlineUsers, setOnlineUsers] = useState(0)  // ADD THIS
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
      // Join the canvas room
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
      setOnlineUsers(data.users.length)  // UPDATE USER COUNT
    })
    
    // Handle remote drawing events from other users
    socket.on('remote-draw', (data) => {
      console.log('🎨 Remote drawing received:', data)
      drawingBoardRef.current?.addRemoteLine(data.line)
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

  // Auto-save function - ONLY saves data, NO thumbnails for performance
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
          thumbnailDataUrl: 'skip',  // Never send thumbnail on auto-save
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
  const handleCanvasChange = useCallback((lines: LineData[]) => {
    // Debounce the auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSave()
    }, 50)

    // Broadcast the last line drawn in real-time
    const socket = getSocket()
    if (socket.connected && lines.length > 0) {
      const lastLine = lines[lines.length - 1]
      socket.emit('canvas-draw', {
        canvasId: id,
        line: lastLine
      })
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

  // Safely parse and validate canvas data
  const initialData = isValidCanvasData(canvas.data) 
    ? canvas.data 
    : { lines: [] }

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
            <h1 className="text-lg font-semibold text-white">{canvas.name}</h1>
            {lastSaved && (
              <span className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {/* ONLINE USERS INDICATOR */}
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
            <DeleteCanvasButton 
              canvasId={canvas.id} 
              canvasName={canvas.name}
            />
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

