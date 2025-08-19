'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPolling() {
  const router = useRouter()
  
  useEffect(() => {
    // Poll every 3 seconds for thumbnail updates
    const interval = setInterval(() => {
      router.refresh()
    }, 1500)
    
    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [router])
  
  return null
}