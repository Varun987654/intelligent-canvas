import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to Intelligent Canvas
            </h1>
            <p className="mt-2 text-gray-600">
              Hello, {session.user?.name || session.user?.email}!
            </p>
            <p className="mt-4 text-gray-600">
              Your dashboard is ready. Canvas features coming soon!
            </p>
            <Link 
              href="/api/auth/signout"
              className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}