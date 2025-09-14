'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import ConfirmModal from './ConfirmModal'
import { getSocket } from '@/lib/socket'

interface DeleteCanvasButtonProps {
  canvasId: string
  canvasName: string
}

export default function DeleteCanvasButton({ canvasId, canvasName }: DeleteCanvasButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowConfirmModal(true)
  }

  const handleConfirmDelete = async () => {
    setShowConfirmModal(false)
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/canvas/${canvasId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Notify other users via socket
        const socket = getSocket()
        if (socket.connected) {
          socket.emit('canvas-deleted', canvasId)
        }
        
        // If we're on the canvas page we're deleting, redirect to dashboard
        if (pathname === `/canvas/${canvasId}`) {
          router.push('/dashboard')
        } else {
          // Otherwise just refresh (we're on dashboard)
          router.refresh()
        }
      } else {
        alert('Failed to delete canvas')
      }
    } catch (error) {
      alert('Failed to delete canvas')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        onClick={handleDeleteClick}
        disabled={isDeleting}
        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
        aria-label="Delete canvas"
      >
        {isDeleting ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Delete Canvas"
        message={`Are you sure you want to delete "${canvasName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmModal(false)}
        isDestructive={true}
      />
    </>
  )
}