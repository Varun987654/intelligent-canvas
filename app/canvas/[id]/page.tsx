'use client'

import { use, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Canvas as CanvasInfo } from '@prisma/client'
import { CanvasData, TextData, LineData, ShapeData } from '@/types/canvas'
import type { DrawingBoardRef } from '@/components/DrawingBoard'
import DeleteCanvasButton from '@/components/DeleteCanvasButton'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Download } from 'lucide-react'
import { useSession } from 'next-auth/react'
import RemoteCursors from '@/components/RemoteCursors'

const DrawingBoard = dynamic(() => import('@/components/DrawingBoard'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div></div>
})

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditCanvasPage({ params }: PageProps) {
  const { id: canvasId } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const drawingBoardRef = useRef<DrawingBoardRef>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const [lines, setLines] = useState<LineData[]>([]);
  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [texts, setTexts] = useState<TextData[]>([]);

  
  const [canvasInfo, setCanvasInfo] = useState<CanvasInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveToast, setShowSaveToast] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Prevent navigation while saving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault()
        e.returnValue = 'Changes are being saved. Are you sure you want to leave?'
        return e.returnValue
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isSaving])

  // Block router navigation while saving
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (isSaving) {
        if (!window.confirm('Changes are being saved. Are you sure you want to leave?')) {
          router.push(window.location.pathname)
          throw 'Route change aborted'
        }
      }
    }

    window.addEventListener('popstate', () => handleRouteChange(window.location.pathname))
    return () => {
      window.removeEventListener('popstate', () => handleRouteChange(window.location.pathname))
    }
  }, [isSaving, router])

  useEffect(() => {
    async function loadCanvasInfo() {
      try {
        const response = await fetch(`/api/canvas/${canvasId}`)
        if (!response.ok) throw new Error(response.status === 404 ? 'Canvas not found' : 'Failed to load canvas')
        const data = await response.json()
        setCanvasInfo(data.canvas)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      }
    }
    loadCanvasInfo()
  }, [canvasId])

  useEffect(() => {
    const socket = connectSocket()

    function joinRoom() {
      if (socket.connected) {
        socket.emit('join-canvas', canvasId);
      }
    }
    joinRoom();
    socket.on('connect', joinRoom);
    
    socket.on('canvas-users', (data) => setOnlineUsers(data.users?.length || 0));
    
    socket.on('server-state-update', (data: { elements: CanvasData, canUndo: boolean, canRedo: boolean }) => {
      const { elements, canUndo, canRedo } = data;
      setLines(elements.lines || []);
      setShapes(elements.shapes || []);
      setTexts(elements.texts || []);
      setCanUndo(canUndo);
      setCanRedo(canRedo);
      setIsLoading(false);
    });
    
    socket.on('canvas-deleted', () => {
      alert('This canvas has been deleted by another user.')
      router.push('/dashboard')
    })

    return () => {
      socket.off('connect', joinRoom);
      socket.off('canvas-users');
      socket.off('server-state-update');
      socket.off('canvas-deleted');
      disconnectSocket();
    }
  }, [canvasId, router])

  const autoSave = useCallback(async () => {
    const dataToSave: CanvasData = { lines, shapes, texts };
    try {
      await fetch(`/api/canvas/${canvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataToSave, thumbnailDataUrl: 'skip' }),
      });
      setLastSaved(new Date());
    } catch (err) { console.error('Auto-save failed:', err) }
  }, [canvasId, lines, shapes, texts]);

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    
    if (lines.length > 0 || shapes.length > 0 || texts.length > 0) {
      autoSaveTimerRef.current = setTimeout(() => autoSave(), 1000)
    }
    
    return () => { 
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) 
    }
  }, [lines, shapes, texts, autoSave])

  const handleDrawEnd = useCallback((item: { type: 'line' | 'shape'; data: LineData | ShapeData }) => {
    if (item.type === 'line') setLines(prev => [...prev, item.data as LineData]);
    else setShapes(prev => [...prev, item.data as ShapeData]);
    
    getSocket().emit('client-create-element', {
      canvasId,
      type: item.type,
      elementData: item.data
    });
  }, [canvasId]);
  
  const handleTextAdd = useCallback((text: TextData) => {
    setTexts(prev => [...prev, text]);
    getSocket().emit('client-create-element', {
      canvasId,
      type: 'text',
      elementData: text
    });
  }, [canvasId]);

  const handleDeleteItem = useCallback((elementId: string) => {
    setLines(prev => prev.filter(el => el.id !== elementId));
    setShapes(prev => prev.filter(el => el.id !== elementId));
    setTexts(prev => prev.filter(el => el.id !== elementId));
    getSocket().emit('client-delete-element', { canvasId, elementId });
  }, [canvasId]);

  const handleUndo = () => getSocket().emit('client-undo', canvasId);
  const handleRedo = () => getSocket().emit('client-redo', canvasId);
  
  const handleSave = async () => {
    setIsSaving(true);
    setShowSaveToast(true);
    setError(null);
    try {
      const thumbnailDataUrl = drawingBoardRef.current?.getThumbnail();
      const response = await fetch(`/api/canvas/${canvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: { lines, shapes, texts }, 
          thumbnailDataUrl: thumbnailDataUrl || 'skip' 
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to save');
      setLastSaved(new Date());
      setTimeout(() => setShowSaveToast(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error');
      setShowSaveToast(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!canvasInfo) return;
    const dataUrl = drawingBoardRef.current?.getThumbnail();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `${canvasInfo.name.replace(/ /g, '_')}-${new Date().toISOString()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCursorMove = useCallback((point: { x: number; y: number } | null) => {
    if (!point || !session?.user?.name) return;
    getSocket().emit('cursor-move', { canvasId, x: point.x, y: point.y, userName: session.user.name });
  }, [canvasId, session]);

  const handleCursorLeave = useCallback(() => {
    getSocket().emit('cursor-leave', canvasId);
  }, [canvasId]);

  if (isLoading || !canvasInfo) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>
  
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
      
      <AnimatePresence>
        {showSaveToast && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100]"
          >
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/20 rounded-xl px-8 py-5 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-6 h-6 border-3 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  <div className="absolute inset-0 w-6 h-6 border-3 border-purple-500/20 rounded-full animate-pulse" />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Saving canvas...</p>
                  <p className="text-white/60 text-sm">Please don't close this tab</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]"
          >
            <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-xl px-6 py-3">
              <p className="text-red-300">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="relative z-30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className={`text-white/60 hover:text-white transition-colors flex items-center gap-2 ${isSaving ? 'pointer-events-none opacity-50' : ''}`}
              onClick={(e) => {
                if (isSaving) {
                  e.preventDefault();
                  alert('Please wait for the save to complete');
                }
              }}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </Link>
            <h1 className="text-xl font-semibold text-white">{canvasInfo.name}</h1>
            {lastSaved && <span className="text-sm text-white/40">Saved {lastSaved.toLocaleTimeString()}</span>}
            {onlineUsers > 1 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full backdrop-blur-sm border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-300 text-sm font-medium">{onlineUsers} online</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <DeleteCanvasButton canvasId={canvasInfo.id} canvasName={canvasInfo.name} />
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleExport} disabled={isSaving}
              className="px-5 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Export
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={isSaving} 
              className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? (<div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</div>) : ('Save')}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden p-6">
        <motion.div ref={canvasContainerRef} className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden relative">
          <DrawingBoard 
            ref={drawingBoardRef} 
            data={{ lines, shapes, texts }}
            onCursorMove={handleCursorMove}
            onCursorLeave={handleCursorLeave}
            onTextAdd={handleTextAdd}
            onDeleteItem={handleDeleteItem}
            onDrawEnd={handleDrawEnd}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
          <RemoteCursors socket={getSocket()} containerRef={canvasContainerRef} />
        </motion.div>
      </div>
    </div>
  )
}