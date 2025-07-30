import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Welcome to Intelligent Canvas
        </h1>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}