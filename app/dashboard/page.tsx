import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import DeleteCanvasButton from '@/components/DeleteCanvasButton'
import DashboardRefresh from '@/components/DashboardRefresh'
import DashboardActions from '@/components/DashboardActions'
import DashboardPolling from '@/components/DashboardPolling'

async function getCanvases(userId: string) {
  return await prisma.canvas.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      thumbnail: true,
      thumbnailStatus: true,
      createdAt: true,
      updatedAt: true,
    }
  })
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const canvases = await getCanvases(session.user.id)
  const hasProcessingThumbnails = canvases.some(c => c.thumbnailStatus === 'PROCESSING')

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardRefresh />
      {hasProcessingThumbnails && <DashboardPolling />}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Canvases
            </h1>
            <p className="mt-2 text-gray-600">
              Welcome back, {session.user.name || session.user.email}!
            </p>
          </div>
          <DashboardActions />
        </div>

        {/* Canvas Grid */}
        {canvases.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No canvases yet. Create your first one!</p>
            <DashboardActions />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {canvases.map((canvas) => (
              <div 
                key={canvas.id} 
                className="group relative bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Delete button OUTSIDE the Link */}
                <DeleteCanvasButton 
                  canvasId={canvas.id} 
                  canvasName={canvas.name}
                />
                
                {/* Link only wraps the clickable content */}
                <Link href={`/canvas/${canvas.id}`} className="block">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-100 relative">
                    {canvas.thumbnailStatus === 'PROCESSING' ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                        <span className="text-sm text-gray-500">Processing thumbnail...</span>
                      </div>
                    ) : canvas.thumbnailStatus === 'FAILED' ? (
                      <div className="flex flex-col items-center justify-center h-full text-red-400">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">Thumbnail failed</span>
                      </div>
                    ) : canvas.thumbnail ? (
                      <img 
                        src={canvas.thumbnail} 
                        alt={canvas.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">No preview</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Canvas Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {canvas.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Updated {new Date(canvas.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}