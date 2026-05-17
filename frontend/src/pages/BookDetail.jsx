import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import Button from '../components/ui/Button'
import { Input, Textarea, Select } from '../components/ui/Input'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import ErrorBanner from '../components/ui/ErrorBanner'

const STATUS_OPTIONS = [
  { label: 'Currently Reading', value: 'reading' },
  { label: 'Read', value: 'read' },
  { label: 'Want to Read', value: 'want_to_read' },
]

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1" aria-label={value ? `${value} out of 5 stars` : 'No rating'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`p-2 inline-flex text-2xl leading-none transition-colors ${
            value >= n ? 'text-amber-400' : 'text-stone-200 hover:text-amber-200'
          }`}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function StarDisplay({ rating }) {
  if (!rating) {
    return <p className="text-sm text-stone-400">No rating yet</p>
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= rating ? 'text-amber-400' : 'text-stone-200'}>
            ★
          </span>
        ))}
      </div>
      <span className="text-xs text-stone-400">{rating}/5</span>
    </div>
  )
}

function DetailItem({ label, value, quiet = 'Not added yet' }) {
  const hasValue = Boolean(value)

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <div className={`mt-1 text-sm ${hasValue ? 'text-stone-800' : 'text-stone-400'}`}>
        {hasValue ? value : quiet}
      </div>
    </div>
  )
}

function formatPublishedDate(value) {
  if (!value) return ''
  const year = value.slice(0, 4)
  return year && !Number.isNaN(Number(year)) ? year : value
}

function formatDate(value) {
  if (!value) return ''
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatPace(days) {
  if (days === null || days === undefined) return ''
  if (days === 0) return 'Same day'
  if (days === 1) return '1 day'
  return `${days} days`
}

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [metadataPollStartedAt] = useState(() => Date.now())

  const { data: book, isLoading: bookLoading, isError: bookError } = useQuery({
    queryKey: ['book', id],
    queryFn: () => client.get(`/books/${id}`).then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      if (Date.now() - metadataPollStartedAt > 30_000) return false
      return data.cover_url && data.description ? false : 2000
    },
    retry: false,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['reading-logs', { book_id: id }],
    queryFn: () => client.get(`/reading-logs?book_id=${id}`).then((r) => r.data),
  })

  const log = logs?.[0]
  const coverSrc = book?.cover_url || (book?.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false` : null)

  const updateMutation = useMutation({
    mutationFn: (payload) => {
      if (!log) throw new Error('No reading log')
      return client.patch(`/reading-logs/${log.id}`, payload).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-logs'] })
      setEditing(false)
      setSaveError('')
    },
    onError: (err) => {
      setSaveError(err.response?.data?.detail || 'Failed to save changes')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => client.delete(`/books/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-logs'] })
      navigate('/books')
    },
  })

  function startEditing() {
    setDraft({
      status: log.status,
      rating: log.rating ?? null,
      mood: log.mood ?? '',
      notes: log.notes ?? '',
      start_date: log.start_date ?? '',
      end_date: log.end_date ?? '',
    })
    setSaveError('')
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setSaveError('')
    setDraft(null)
  }

  function saveEditing() {
    const payload = {
      status: draft.status,
      rating: draft.rating,
      mood: draft.mood || null,
      notes: draft.notes || null,
      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
    }
    updateMutation.mutate(payload)
  }

  function setDraftField(field) {
    return (value) => setDraft((d) => ({ ...d, [field]: value }))
  }

  if (bookLoading || logsLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-stone-100 rounded w-24 mb-8" />
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <div className="aspect-[2/3] bg-stone-100 rounded-xl" />
          <div className="flex flex-col gap-4 pt-2">
            <div className="h-8 bg-stone-100 rounded w-3/4" />
            <div className="h-4 bg-stone-100 rounded w-1/3" />
            <div className="h-24 bg-stone-100 rounded" />
            <div className="h-40 bg-stone-100 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (bookError || (!bookLoading && !book)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl font-bold text-stone-200 mb-2">404</p>
        <p className="text-lg font-semibold text-stone-900 mb-1">Book not found</p>
        <p className="text-sm text-stone-500 mb-6">This book doesn&apos;t exist on your shelf.</p>
        <Link to="/books" className="text-sm text-indigo-600 font-medium hover:text-indigo-700">
          Back to my shelf
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/books" className="py-2 inline-block text-sm text-stone-400 hover:text-indigo-600 transition-colors">
        ← My Shelf
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="max-w-64 sm:max-w-72 lg:max-w-none mx-auto lg:mx-0">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={book.title}
              className="aspect-[2/3] w-full rounded-xl object-cover shadow-sm ring-1 ring-stone-200"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
          ) : null}
          <div
            className="aspect-[2/3] w-full rounded-xl bg-stone-100 ring-1 ring-stone-200 items-center justify-center text-stone-300 text-5xl"
            style={{ display: coverSrc ? 'none' : 'flex' }}
          >
            ▪
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {log && <Badge status={log.status} />}
            {book.genre && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                {book.genre}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-semibold leading-tight text-stone-950 sm:text-4xl">
            {book.title}
          </h1>
          <p className="mt-2 text-lg text-stone-600">{book.author}</p>

          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <DetailItem label="Published" value={formatPublishedDate(book.published_date)} />
            <DetailItem label="Pages" value={book.page_count ? `${book.page_count} pages` : ''} />
            <DetailItem label="ISBN" value={book.isbn} />
          </div>

          <section className="mt-8 border-t border-stone-200 pt-6">
            <h2 className="text-base font-semibold text-stone-900">Description</h2>
            {book.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">
                {book.description}
              </p>
            ) : (
              <p className="mt-3 text-sm text-stone-400">No description is available for this book yet.</p>
            )}
          </section>
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-stone-900">Reading Record</h2>
          {log && !editing && (
            <button
              onClick={startEditing}
              className="py-2 px-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {!log && (
          <Card className="p-6">
            <p className="text-sm text-stone-500">No reading record is attached to this book yet.</p>
          </Card>
        )}

        {log && !editing && (
          <Card className="p-5 sm:p-6">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailItem label="Status" value={<Badge status={log.status} />} quiet="" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Rating</p>
                <div className="mt-1">
                  <StarDisplay rating={log.rating} />
                </div>
              </div>
              <DetailItem label="Pace" value={formatPace(log.pace_days)} quiet="No pace yet" />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <DetailItem label="Started" value={formatDate(log.start_date)} quiet="No start date" />
              <DetailItem label="Finished" value={formatDate(log.end_date)} quiet="No end date" />
              <DetailItem label="Mood" value={log.mood} quiet="No mood added" />
            </div>

            <div className="mt-6 border-t border-stone-100 pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Notes</p>
              {log.notes ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{log.notes}</p>
              ) : (
                <p className="mt-2 text-sm text-stone-400">No notes added yet.</p>
              )}
            </div>
          </Card>
        )}

        {log && editing && (
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-stone-900">Edit Reading Record</h3>
              <button
                onClick={cancelEditing}
                className="py-2 px-2 text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                Cancel
              </button>
            </div>

            <ErrorBanner message={saveError} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-status" className="text-xs font-medium text-stone-600">Status</label>
                <Select
                  id="edit-status"
                  value={draft.status}
                  onChange={(e) => setDraftField('status')(e.target.value)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-mood" className="text-xs font-medium text-stone-600">Mood</label>
                <Input
                  id="edit-mood"
                  value={draft.mood}
                  onChange={(e) => setDraftField('mood')(e.target.value)}
                  placeholder="Reflective, delighted, stuck..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-start-date" className="text-xs font-medium text-stone-600">Start date</label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={draft.start_date}
                  onChange={(e) => setDraftField('start_date')(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-end-date" className="text-xs font-medium text-stone-600">End date</label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={draft.end_date}
                  onChange={(e) => setDraftField('end_date')(e.target.value)}
                  min={draft.start_date || undefined}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-stone-600">Rating</label>
              <Stars value={draft.rating} onChange={setDraftField('rating')} />
            </div>

            <div className="mt-5 flex flex-col gap-1.5">
              <label htmlFor="edit-notes" className="text-xs font-medium text-stone-600">Notes</label>
              <Textarea
                id="edit-notes"
                value={draft.notes}
                onChange={(e) => setDraftField('notes')(e.target.value)}
                rows={5}
                className="resize-none"
                placeholder="What stood out, what to remember, who to recommend it to..."
              />
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={cancelEditing} className="sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={saveEditing}
                disabled={updateMutation.isPending}
                className="sm:w-auto"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </Card>
        )}
      </section>

      <div className="mt-8 border-t border-stone-200 pt-5">
        <button
          onClick={() => {
            if (confirm('Remove this book from your shelf?')) {
              deleteMutation.mutate()
            }
          }}
          disabled={deleteMutation.isPending}
          className="py-3 px-1 block text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Removing…' : 'Remove from shelf'}
        </button>
      </div>
    </div>
  )
}
