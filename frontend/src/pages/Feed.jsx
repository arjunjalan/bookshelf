import { useInfiniteQuery } from '@tanstack/react-query'
import { socialApi } from '../api/social'
import Card from '../components/ui/Card'
import ErrorBanner from '../components/ui/ErrorBanner'
import Button from '../components/ui/Button'

const EVENT_LABEL = {
  started: 'started reading',
  finished: 'finished',
  rated: 'rated',
  want_to_read: 'wants to read',
}

function CoverThumb({ book }) {
  if (!book.cover_url) {
    return (
      <div className="w-10 h-14 rounded bg-stone-100 flex items-center justify-center text-stone-300 text-lg shrink-0">
        ▪
      </div>
    )
  }
  return (
    <img
      src={book.cover_url}
      alt={book.title}
      className="w-10 h-14 object-cover rounded shrink-0"
      onError={(e) => {
        e.target.style.display = 'none'
        e.target.nextSibling.style.display = 'flex'
      }}
    />
  )
}

function Stars({ rating }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function FeedItem({ event }) {
  const actor = event.actor
  const book = event.book
  const label = EVENT_LABEL[event.event_type] ?? event.event_type

  return (
    <Card className="p-4 flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-semibold shrink-0">
        {(actor.display_name || actor.handle).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-700 leading-snug">
          <span className="font-medium text-stone-900">
            {actor.display_name || `@${actor.handle}`}
          </span>
          {' '}
          <span className="text-stone-500">{label}</span>
          {' '}
          <span className="font-medium text-stone-900">{book.title}</span>
          {' '}
          <span className="text-stone-500">by {book.author}</span>
        </p>
        {event.event_type === 'rated' && event.payload?.rating && (
          <Stars rating={event.payload.rating} />
        )}
        <p className="text-xs text-stone-400 mt-0.5">
          {new Date(event.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>
      <CoverThumb book={book} />
    </Card>
  )
}

export default function Feed() {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) =>
      socialApi.getFeed(pageParam ?? null).then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 60_000,
  })

  const events = data?.pages.flatMap((p) => p.items) ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-stone-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <ErrorBanner message="Failed to load feed. Please try again." />
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-stone-900">Feed</h1>

      {events.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-stone-500 text-sm">
            Nothing here yet. Follow people to see their reading activity.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <FeedItem key={event.id} event={event} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  )
}
