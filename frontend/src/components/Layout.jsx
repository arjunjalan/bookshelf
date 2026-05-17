import { useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from './BottomNav'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  function navCls(path) {
    const active = location.pathname === path || location.pathname.startsWith(path + '/')
    return `text-sm transition-colors ${active ? 'text-indigo-600 font-medium' : 'text-stone-600 hover:text-indigo-600'}`
  }

  function mobileLinkCls(path) {
    const active = location.pathname === path || location.pathname.startsWith(path + '/')
    return `py-3 text-sm transition-colors ${active ? 'text-indigo-600 font-medium' : 'text-stone-600 hover:text-indigo-600'}`
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
              to="/home"
              className="font-semibold text-stone-900 text-base tracking-tight"
            >
              Bookshelf
            </Link>

            <div className="hidden sm:flex items-center gap-6">
              <Link to="/books" className={navCls('/books')}>Shelf</Link>
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

            {/* Hamburger — secondary nav only on mobile (core routes in BottomNav) */}
            <button
              className="sm:hidden p-3 -mr-1 text-stone-500 hover:text-stone-900"
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
            <div className="sm:hidden border-t border-stone-100 py-2 flex flex-col">
              <Link to="/books/add" className={mobileLinkCls('/books/add')} onClick={() => setMenuOpen(false)}>Add book</Link>
              <Link to="/import" className={mobileLinkCls('/import')} onClick={() => setMenuOpen(false)}>Import</Link>
              <span className="py-3 text-sm text-stone-400">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="py-3 text-sm text-stone-600 hover:text-indigo-600 text-left transition-colors"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* pb-20 on mobile reserves space above the BottomNav */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 sm:pb-8">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
