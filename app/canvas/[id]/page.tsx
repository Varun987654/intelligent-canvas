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
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

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
  
  if (!('lines' in obj) || !Array.isArray(obj.lines)) {
    return false
  }
  
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
  
  // Track previous data to detect what's new
  const previousDataRef = useRef<CanvasData>({ lines: [], shapes: [] })

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
        
        // INITIALIZE previousDataRef with loaded data
        if (isValidCanvasData(data.canvas.data)) {
          previousDataRef.current = data.canvas.data
        }
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
        // Backward compatibility
        drawingBoardRef.current?.addRemoteLine(data.line)
      }
    })
    
    // Listen for canvas deletion
    socket.on('canvas-deleted', (data) => {
      console.log('Canvas deleted:', data)
      alert('This canvas has been deleted by another user')
      router.push('/dashboard')
    })
    
    return () => {
      socket.emit('leave-canvas')
      disconnectSocket()
    }
  }, [id, router])

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

  const handleCanvasChange = useCallback((data: CanvasData & { isUndoRedo?: boolean }) => {
    // Debounce the auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSave()
    }, 500)
  
    // DON'T broadcast undo/redo - history should be local!
    if (data.isUndoRedo) {
      // Just update the reference, don't broadcast
      previousDataRef.current = {
        lines: data.lines,
        shapes: data.shapes || []
      }
      return // EXIT HERE - don't sync undo/redo
    }
  
    // Broadcast only new additions
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
      
      // Update the reference
      previousDataRef.current = {
        lines: data.lines,
        shapes: data.shapes || []
      }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!canvas) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Canvas Not Found</h1>
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300">
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background pattern */}
      {/* Animated background pattern */}
<div className="absolute inset-0 opacity-20" 
  style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    backgroundSize: '60px 60px'
  }}
/>
      {/* Saving Indicator */}
      {isSaving && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-3 border border-white/20"
        >
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm font-medium">Saving...</span>
        </motion.div>
      )}
      
      {/* Header */}
      <div className="relative z-40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`text-white/60 hover:text-white transition-colors flex items-center gap-2 ${
                isSaving ? 'pointer-events-none opacity-50' : ''
              }`}>
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </Link>
            <h1 className="text-xl font-semibold text-white">{canvas.name}</h1>
            {lastSaved && (
              <span className="text-sm text-white/40">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {onlineUsers > 1 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full backdrop-blur-sm border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-300 text-sm font-medium">
                  {onlineUsers} online
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <DeleteCanvasButton 
              canvasId={canvas.id} 
              canvasName={canvas.name}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all disabled:opacity-50"
            >
              Save
            </motion.button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed top-20 right-6 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-300 px-4 py-3 rounded-xl"
        >
          {error}
        </motion.div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <DrawingBoard 
            ref={drawingBoardRef} 
            initialData={initialData}
            onLinesChange={handleCanvasChange}
          />
        </motion.div>
      </div>
    </div>
  )
}