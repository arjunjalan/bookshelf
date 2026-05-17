import { useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  function navCls(path) {
    const active = location.pathname === path || location.pathname.startsWith(path + '/')
    return `text-sm transition-colors ${active ? 'text-indigo-600 font-medium' : 'text-stone-600 hover:text-indigo-600'}`
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link
              to="/books"
              className="font-semibold text-stone-900 text-base tracking-tight"
            >
              Bookshelf
            </Link>

            <div className="hidden sm:flex items-center gap-6">
              <Link to="/books/add" className={navCls('/books/add')}>Add book</Link>
              <Link to="/stats" className={navCls('/stats')}>Stats</Link>
              <Link to="/chat" className={navCls('/chat')}>Chat</Link>
              <Link to="/import" className={navCls('/import')}>Import</Link>
              <span className="text-sm text-stone-400">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-stone-600 hover:text-indigo-600 transition-colors"
              >
                Log out
              </button>
            </div>

            <button
              className="sm:hidden p-2 text-stone-500 hover:text-stone-900"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {menuOpen && (
            <div className="sm:hidden border-t border-stone-100 py-4 flex flex-col gap-4">
              <Link to="/books/add" className={navCls('/books/add')} onClick={() => setMenuOpen(false)}>Add book</Link>
              <Link to="/stats" className={navCls('/stats')} onClick={() => setMenuOpen(false)}>Stats</Link>
              <Link to="/chat" className={navCls('/chat')} onClick={() => setMenuOpen(false)}>Chat</Link>
              <Link to="/import" className={navCls('/import')} onClick={() => setMenuOpen(false)}>Import</Link>
              <span className="text-sm text-stone-400">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-stone-600 hover:text-indigo-600 text-left transition-colors"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
