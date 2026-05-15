import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login, token } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) {
    navigate('/books', { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/books', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-stone-900 mb-1">Bookshelf</h1>
        <p className="text-stone-500 text-sm mb-8">Log in to your reading shelf</p>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-4"
        >
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-stone-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors mt-1"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
          <p className="text-center text-sm text-stone-500">
            No account?{' '}
            <Link to="/register" className="text-stone-900 font-medium hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
