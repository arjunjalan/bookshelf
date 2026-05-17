import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import Card from '../components/ui/Card'
import ErrorBanner from '../components/ui/ErrorBanner'

export default function Register() {
  const { register, token } = useAuth()
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
      await register(email, password)
      navigate('/books', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-stone-900 mb-1">Bookshelf</h1>
        <p className="text-stone-500 text-sm mb-8">Create your reading shelf</p>
        <Card className="p-6 flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ErrorBanner message={error} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-stone-700">Email</label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-stone-700">Password</label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-stone-400">Minimum 8 characters</p>
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
            <p className="text-center text-sm text-stone-500">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700">
                Log in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
