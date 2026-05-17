import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-stone-200 mb-2">404</p>
        <h1 className="text-xl font-semibold text-stone-900 mb-2">Page not found</h1>
        <p className="text-stone-500 text-sm mb-6">This page doesn&apos;t exist.</p>
        <Link
          to="/books"
          className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
        >
          Back to my shelf
        </Link>
      </div>
    </div>
  )
}
