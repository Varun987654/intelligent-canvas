import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-purple-900/30" />
      
      <div className="relative text-center px-6">
        <h1 className="text-6xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-blue-200">
          Intelligent Canvas
        </h1>
        <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
          Real-time collaborative whiteboard with AI-powered features. Draw, create, and collaborate seamlessly.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}