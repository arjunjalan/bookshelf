export default function ErrorBanner({ message, className = '' }) {
  if (!message) return null
  return (
    <p className={`text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 ${className}`}>
      {message}
    </p>
  )
}
