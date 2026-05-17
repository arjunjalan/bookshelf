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
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`text-2xl transition-colors ${
            value >= n ? 'text-amber-400' : 'text-stone-200 hover:text-amber-200'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saveError, setSaveError] = useState('')

  const { data: book, isLoading: bookLoading, isError: bookError } = useQuery({
    queryKey: ['book', id],
    queryFn: () => client.get(`/books/${id}`).then((r) => r.data),
    retry: false,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['reading-logs', { book_id: id }],
    queryFn: () => client.get(`/reading-logs?book_id=${id}`).then((r) => r.data),
  })

  const log = logs?.[0]

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
      <div className="animate-pulse flex flex-col gap-4 max-w-lg">
        <div className="h-6 bg-stone-100 rounded w-1/3" />
        <div className="h-4 bg-stone-100 rounded w-1/2" />
        <div className="h-48 bg-stone-100 rounded" />
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
    <div className="max-w-lg">
      <Link to="/books" className="text-sm text-stone-400 hover:text-indigo-600 transition-colors">
        ← My Shelf
      </Link>

      <div className="mt-6 flex gap-5">
        {(() => {
          const coverSrc = book.cover_url || (book.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false` : null)
          return coverSrc ? (
            <img
              src={coverSrc}
              alt={book.title}
              className="w-20 h-28 object-cover rounded-lg flex-shrink-0 shadow-sm"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
          ) : null
        })()}
        <div
          className="w-20 h-28 bg-stone-100 rounded-lg flex-shrink-0 items-center justify-center text-stone-300 text-3xl"
          style={{ display: (book.cover_url || book.isbn) ? 'none' : 'flex' }}
        >
          ▪
        </div>
        <div className="flex flex-col justify-center gap-1">
          <h1 className="text-xl font-semibold text-stone-900">{book.title}</h1>
          <p className="text-stone-500 text-sm">{book.author}</p>
          {book.genre && <p className="text-xs text-stone-400">{book.genre}</p>}
          {book.isbn && <p className="text-xs text-stone-400">ISBN: {book.isbn}</p>}
          {(book.page_count || book.published_date) && (
            <p className="text-xs text-stone-400">
              {book.page_count && `${book.page_count} pages`}
              {book.page_count && book.published_date && ' · '}
              {book.published_date && `Published ${new Date(book.published_date).getUTCFullYear()}`}
            </p>
          )}
          {log && !editing && (
            <Badge status={log.status} className="w-fit mt-1" />
          )}
        </div>
      </div>

      {book.description && (
        <p className="mt-4 text-sm text-stone-600 whitespace-pre-wrap">{book.description}</p>
      )}

      {log && (
        <Card className="mt-6 p-5 flex flex-col gap-4">
          {!editing ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-stone-700">Reading record</h3>
                <button
                  onClick={startEditing}
                  className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
                >
                  Edit
                </button>
              </div>

              {log.rating && (
                <div>
                  <p className="text-xs text-stone-400 mb-1">Rating</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={n <= log.rating ? 'text-amber-400' : 'text-stone-200'}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(log.start_date || log.end_date) && (
                <div>
                  <p className="text-xs text-stone-400 mb-1">Dates</p>
                  <p className="text-sm text-stone-700">
                    {log.start_date && <>Started {log.start_date}</>}
                    {log.start_date && log.end_date && ' · '}
                    {log.end_date && <>Finished {log.end_date}</>}
                    {log.pace_days && (
                      <span className="text-stone-400"> ({log.pace_days} days)</span>
                    )}
                  </p>
                </div>
              )}

              {log.notes && (
                <div>
                  <p className="text-xs text-stone-400 mb-1">Notes</p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">{log.notes}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium text-stone-700">Edit reading record</h3>

              <ErrorBanner message={saveError} />

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

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-stone-600">Start date</label>
                  <Input
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => setDraftField('start_date')(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-stone-600">End date</label>
                  <Input
                    type="date"
                    value={draft.end_date}
                    onChange={(e) => setDraftField('end_date')(e.target.value)}
                    min={draft.start_date || undefined}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-600">Rating</label>
                <Stars value={draft.rating} onChange={setDraftField('rating')} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-notes" className="text-xs font-medium text-stone-600">Notes</label>
                <Textarea
                  id="edit-notes"
                  value={draft.notes}
                  onChange={(e) => setDraftField('notes')(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={saveEditing}
                  disabled={updateMutation.isPending}
                  className="flex-1"
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="ghost" onClick={cancelEditing} className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      <div className="mt-6">
        <button
          onClick={() => {
            if (confirm('Remove this book from your shelf?')) {
              deleteMutation.mutate()
            }
          }}
          disabled={deleteMutation.isPending}
          className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Removing…' : 'Remove from shelf'}
        </button>
      </div>
    </div>
  )
}
