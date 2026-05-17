import { Link } from 'react-router-dom'
import Badge from './ui/Badge'

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

export default function BookCard({ log }) {
  const { book, status, rating } = log

  return (
    <Link
      to={`/books/${book.id}`}
      className="flex gap-4 p-4 bg-white rounded-lg border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
    >
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt={book.title}
          className="w-10 h-14 object-cover rounded flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-14 bg-stone-100 rounded flex-shrink-0 flex items-center justify-center text-stone-300 text-lg">
          ▪
        </div>
      )}
      <div className="flex flex-col justify-center gap-1.5 min-w-0">
        <p className="font-medium text-stone-900 truncate text-sm">{book.title}</p>
        <p className="text-xs text-stone-500 truncate">{book.author}</p>
        <div className="flex items-center gap-2">
          <Badge status={status} />
          <Stars rating={rating} />
        </div>
      </div>
    </Link>
  )
}
