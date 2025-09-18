import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Socket } from 'socket.io-client'

interface CursorData {
       userId: string
       x: number
       y: number
       userName: string
}
     
interface Cursor extends CursorData {
color: string
lastUpdate: number
}

interface RemoteCursorsProps {
  socket: Socket | null
  containerRef: React.RefObject<HTMLDivElement | null>
}

const CURSOR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#74B9FF', '#A29BFE']

export default function RemoteCursors({ socket, containerRef }: RemoteCursorsProps) {
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())

  useEffect(() => {
    if (!socket) return

    const handleRemoteCursor = (data: CursorData) => {
      setCursors(prev => {
        const updated = new Map(prev)
        updated.set(data.userId, {
          ...data,
          color: CURSOR_COLORS[data.userId.charCodeAt(0) % CURSOR_COLORS.length],
          lastUpdate: Date.now()
        })
        return updated
      })
    }

    const handleCursorLeave = (data: CursorData) => {
      setCursors(prev => {
        const updated = new Map(prev)
        updated.delete(data.userId)
        return updated
      })
    }

    socket.on('remote-cursor', handleRemoteCursor)
    socket.on('remote-cursor-leave', handleCursorLeave)

    const interval = setInterval(() => {
      setCursors(prev => {
        const updated = new Map(prev)
        const now = Date.now()
        updated.forEach((cursor, userId) => {
          if (now - cursor.lastUpdate > 5000) updated.delete(userId)
        })
        return updated.size === prev.size ? prev : updated
      })
    }, 1000)

    return () => {
      socket.off('remote-cursor', handleRemoteCursor)
      socket.off('remote-cursor-leave', handleCursorLeave)
      clearInterval(interval)
    }
  }, [socket])

  if (!containerRef.current) return null

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      <AnimatePresence>
        {Array.from(cursors.values()).map(cursor => (
          <motion.div
            key={cursor.userId}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              position: 'absolute',
              left: cursor.x,
              top: cursor.y,
              transform: 'translate(-8px, -8px)'
            }}
            className="flex items-start"
          >
            <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
              <path
                d="M0 0L7.43 17.85L10.54 9.52L18.87 6.41L0 0Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            <div
              className="ml-2 px-2 py-0.5 rounded text-white text-xs font-medium whitespace-nowrap shadow-sm"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userName}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}