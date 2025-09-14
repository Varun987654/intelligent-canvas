import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import DeleteCanvasButton from '@/components/DeleteCanvasButton'
//import DashboardRefresh from '@/components/DashboardRefresh'
import DashboardActions from '@/components/DashboardActions'

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
     
      
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-purple-900/30" />
      
      <div className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
            My Canvases
          </h1>
          <p className="text-white/60 text-lg">
            Welcome back, {session.user.name || session.user.email}
          </p>
        </div>

        {canvases.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-20 text-center">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Start Creating</h2>
            <p className="text-white/40 mb-8 max-w-sm mx-auto">
              Create your first canvas and start collaborating with others in real-time
            </p>
            <DashboardActions />
          </div>
        ) : (
          <>
            <div className="mb-8 flex justify-between items-center">
              <p className="text-white/60">{canvases.length} canvas{canvases.length !== 1 ? 'es' : ''}</p>
              <DashboardActions />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {canvases.map((canvas) => (
                <div 
                  key={canvas.id} 
                  className="group relative"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
                  <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all">
                    <DeleteCanvasButton 
                      canvasId={canvas.id} 
                      canvasName={canvas.name}
                    />
                    
                    <Link href={`/canvas/${canvas.id}`} className="block">
                      <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-blue-900/20 relative">
                        {canvas.thumbnailStatus === 'PROCESSING' ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                            <span className="text-xs text-white/40 mt-2">Processing</span>
                          </div>
                        ) : canvas.thumbnail ? (
                          <img 
                            src={canvas.thumbnail} 
                            alt={canvas.name}
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-white/20">
                              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-white truncate group-hover:text-purple-200 transition-colors">
                          {canvas.name}
                        </h3>
                        <p className="text-sm text-white/40 mt-1">
                          {new Date(canvas.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}