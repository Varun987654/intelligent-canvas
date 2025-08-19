'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface NewCanvasModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewCanvasModal({ isOpen, onClose }: NewCanvasModalProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [canvasName, setCanvasName] = useState('Untitled Canvas')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side validation
    const trimmedName = canvasName.trim()
    if (!trimmedName) {
      setError('Canvas name is required')
      return
    }

    setIsCreating(true)
    
    try {
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName })
      })

      if (response.ok) {
        const { canvas } = await response.json()
        onClose()
        router.push(`/canvas/${canvas.id}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create canvas')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <dialog 
      ref={dialogRef}
      className="p-0 m-auto rounded-lg shadow-xl backdrop:bg-black/50"
      onClose={onClose}
    >
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Canvas</h2>
          
          <form onSubmit={handleCreate}>
            <div className="mb-6">
              <label htmlFor="canvas-name" className="block text-sm font-medium text-gray-700 mb-2">
                Canvas Name
              </label>
              <input
                type="text"
                id="canvas-name"
                value={canvasName}
                onChange={(e) => setCanvasName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter canvas name"
                autoFocus
                required
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Canvas'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  )
}