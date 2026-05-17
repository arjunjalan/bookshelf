import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import client from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ErrorBanner from '../components/ui/ErrorBanner'

const SUGGESTIONS = [
  'What should I read next?',
  'Which author do I seem to enjoy most?',
  'How has my reading pace changed?',
]

function greeting(email) {
  const name = email.split('@')[0]
  const hour = new Date().getHours()
  const time = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return `${time}, ${name}`
}

function CoverOrPlaceholder({ book, className }) {
  const coverSrc = book.cover_url || (book.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false` : null)
  if (!coverSrc) return <div className={`bg-stone-100 rounded flex items-center justify-center text-stone-300 text-2xl ${className}`}>▪</div>
  return (
    <>
      <img
        src={coverSrc}
        alt={book.title}
        className={`object-cover rounded ${className}`}
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
      />
      <div className={`bg-stone-100 rounded items-center justify-center text-stone-300 text-2xl hidden ${className}`}>▪</div>
    </>
  )
}

function StatTile({ label, value }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="text-xl font-semibold text-stone-900 truncate">{value ?? '—'}</p>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Welcome to Bookshelf</h2>
        <p className="text-stone-500 mt-2 text-sm max-w-md">
          Your personal reading companion. Log your books, understand your reading habits, and find what to read next.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Link
          to="/import"
          className="flex flex-col gap-2 p-5 bg-white rounded-xl border border-stone-200 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <span className="text-2xl">📥</span>
          <p className="font-medium text-stone-900 text-sm">Import from Goodreads</p>
          <p className="text-xs text-stone-400">Bring your existing reading history in seconds</p>
        </Link>
        <Link
          to="/books/add"
          className="flex flex-col gap-2 p-5 bg-white rounded-xl border border-stone-200 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <span className="text-2xl">➕</span>
          <p className="font-medium text-stone-900 text-sm">Add your first book</p>
          <p className="text-xs text-stone-400">Search by title, author, or ISBN</p>
        </Link>
      </div>

      <p className="text-xs text-stone-400 max-w-sm">
        Once you've logged a few books, ask your companion what to read next — it'll know your taste.
      </p>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: allLogs = [], isLoading: logsLoading, isError: logsError } = useQuery({
    queryKey: ['reading-logs-home'],
    queryFn: () => client.get('/reading-logs', { params: { limit: 100 } }).then((r) => r.data),
  })

  const { data: currentlyReading = [] } = useQuery({
    queryKey: ['reading-logs', 'reading'],
    queryFn: () => client.get('/reading-logs', { params: { status: 'reading' } }).then((r) => r.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => client.get('/analytics/summary').then((r) => r.data),
  })

  const { data: profile } = useQuery({
    queryKey: ['reader-profile'],
    queryFn: () => client.get('/reader-profile').then((r) => r.data),
  })

  const isEmpty = !logsLoading && allLogs.length === 0

  const currentYear = new Date().getFullYear()

  const booksThisYear = useMemo(
    () => allLogs.filter((l) => l.status === 'read' && l.end_date?.startsWith(String(currentYear))).length,
    [allLogs, currentYear],
  )

  const recentlyFinished = useMemo(
    () =>
      allLogs
        .filter((l) => l.status === 'read' && l.end_date)
        .sort((a, b) => new Date(b.end_date) - new Date(a.end_date))
        .slice(0, 3),
    [allLogs],
  )

  const topGenre = profile?.top_genres?.[0]?.genre ?? summary?.top_genre ?? null
  const topAuthor = profile?.top_authors?.[0]?.author ?? null

  if (logsLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-7 bg-stone-100 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-20 bg-stone-100 rounded-xl" />
          <div className="h-20 bg-stone-100 rounded-xl" />
          <div className="h-20 bg-stone-100 rounded-xl" />
        </div>
        <div className="h-32 bg-stone-100 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-36 bg-stone-100 rounded-xl" />
          <div className="h-36 bg-stone-100 rounded-xl" />
          <div className="h-36 bg-stone-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (logsError) return <ErrorBanner message="Failed to load your dashboard." />

  if (isEmpty) return <EmptyState />

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold text-stone-900">{greeting(user.email)}</h2>

      {/* Currently reading */}
      {currentlyReading.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Currently reading</p>
          <div className="flex flex-col gap-3">
            {currentlyReading.slice(0, 2).map((log) => (
              <Link
                key={log.id}
                to={`/books/${log.book.id}`}
                className="flex gap-4 p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
              >
                <CoverOrPlaceholder book={log.book} className="w-10 h-14 flex-shrink-0" />
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <p className="font-medium text-stone-900 text-sm truncate">{log.book.title}</p>
                  <p className="text-xs text-stone-500 truncate">{log.book.author}</p>
                  <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 w-fit">Reading</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label={`Books in ${currentYear}`} value={booksThisYear || '—'} />
        <StatTile label="Top genre" value={topGenre} />
        <StatTile label="Favourite author" value={topAuthor} />
      </div>

      {/* Chat prompt */}
      <Card className="p-5 flex flex-col gap-3">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Ask your reading companion</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="What should I read next?"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate('/chat', { state: { message: e.target.value.trim() } })
              }
            }}
            className="flex-1 border border-stone-200 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <Button
            onClick={(e) => {
              const input = e.currentTarget.previousSibling
              if (input.value.trim()) navigate('/chat', { state: { message: input.value.trim() } })
              else navigate('/chat')
            }}
          >
            Ask
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => navigate('/chat', { state: { message: s } })}
              className="text-xs text-stone-600 border border-stone-200 rounded-full px-3 py-2.5 hover:bg-stone-50 hover:border-indigo-300 active:bg-stone-100 transition-colors min-h-[44px] inline-flex items-center"
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {/* Recently finished */}
      {recentlyFinished.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Recently finished</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recentlyFinished.map((log) => (
              <Link
                key={log.id}
                to={`/books/${log.book.id}`}
                className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
              >
                <CoverOrPlaceholder book={log.book} className="w-full h-28" />
                <div>
                  <p className="text-xs font-medium text-stone-900 truncate">{log.book.title}</p>
                  <p className="text-xs text-stone-400 truncate">{log.book.author}</p>
                  {log.rating && (
                    <p className="text-xs text-amber-400 mt-0.5">{'★'.repeat(log.rating)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
