'use client'

import { useState } from 'react'
import Link from 'next/link'
import NewCanvasModal from './NewCanvasModal'

export default function DashboardActions() {
  const [showNewCanvasModal, setShowNewCanvasModal] = useState(false)

  return (
    <>
      <div className="flex gap-4">
        <button
          onClick={() => setShowNewCanvasModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Canvas
        </button>
        <Link 
          href="/api/auth/signout"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Sign Out
        </Link>
      </div>

      <NewCanvasModal 
        isOpen={showNewCanvasModal}
        onClose={() => setShowNewCanvasModal(false)}
      />
    </>
  )
}