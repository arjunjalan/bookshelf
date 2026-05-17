import { Link } from 'react-router-dom'
import Badge from './ui/Badge'

const STATUS_ACTIONS = [
  { label: 'Want to Read', value: 'want_to_read' },
  { label: 'Reading', value: 'reading' },
  { label: 'Read', value: 'read' },
]

function Stars({ rating }) {
  if (!rating) return null
  return (
    <span className="text-sm">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? 'text-amber-400' : 'text-stone-200'}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function BookCard({ log, onStatusChange, onRemove, pendingAction = null }) {
  const { book, status, rating } = log
  const coverSrc = book.cover_url || (book.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false` : null)
  const isPending = Boolean(pendingAction)

  return (
    <article className="bg-white rounded-lg border border-stone-200 transition-all hover:border-stone-300 hover:shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={`/books/${book.id}`}
          className="flex min-w-0 flex-1 gap-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={book.title}
              className="w-10 h-14 object-cover rounded flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
          ) : null}
          <div
            className="w-10 h-14 bg-stone-100 rounded flex-shrink-0 items-center justify-center text-stone-300 text-lg"
            style={{ display: coverSrc ? 'none' : 'flex' }}
          >
            ▪
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1.5">
            <p className="font-medium text-stone-900 truncate text-sm">{book.title}</p>
            <p className="text-xs text-stone-500 truncate">{book.author}</p>
            <div className="flex items-center gap-2">
              <Badge status={status} />
              <Stars rating={rating} />
            </div>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {STATUS_ACTIONS.map((action) => {
            const isCurrent = status === action.value
            const disabled = isCurrent || isPending
            const activeClasses = isCurrent
              ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
              : 'border-stone-200 text-stone-700 hover:bg-stone-50'

            return (
              <button
                key={action.value}
                type="button"
                aria-label={`Move ${book.title} to ${action.label}`}
                aria-pressed={isCurrent}
                disabled={disabled}
                onClick={() => onStatusChange(log, action.value)}
                className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors disabled:opacity-100 ${activeClasses}`}
              >
                {pendingAction === action.value ? 'Saving...' : action.label}
              </button>
            )
          })}
          <button
            type="button"
            aria-label={`Remove ${book.title} from shelf`}
            disabled={isPending}
            onClick={() => onRemove(log)}
            className="h-8 rounded-lg border border-red-100 px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {pendingAction === 'remove' ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </article>
  )
}
