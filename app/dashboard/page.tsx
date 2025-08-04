import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import prisma from '@/lib/prisma'

async function getCanvases(userId: string) {
  return await prisma.canvas.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      thumbnail: true,
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
    <div className="min-h-screen bg-gray-50">
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
          <div className="flex gap-4">
            <Link 
              href="/canvas/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Canvas
            </Link>
            <Link 
              href="/api/auth/signout"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </Link>
          </div>
        </div>

        {/* Canvas Grid */}
        {canvases.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No canvases yet. Create your first one!</p>
            <Link 
              href="/canvas/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Canvas
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {canvases.map((canvas) => (
              <Link
                key={canvas.id}
                href={`/canvas/${canvas.id}`}
                className="group block"
              >
                <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-100 relative">
                    {canvas.thumbnail ? (
                      <img 
                        src={canvas.thumbnail} 
                        alt={canvas.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}