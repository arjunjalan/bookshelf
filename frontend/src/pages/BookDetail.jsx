import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

const STATUS_OPTIONS = [
  { label: 'Currently Reading', value: 'reading' },
  { label: 'Read', value: 'read' },
  { label: 'Want to Read', value: 'want_to_read' },
]

const STATUS_COLOR = {
  reading: 'bg-blue-50 text-blue-700',
  read: 'bg-green-50 text-green-700',
  want_to_read: 'bg-amber-50 text-amber-700',
}

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
    queryKey: ['reading-logs'],
    queryFn: () => client.get('/reading-logs').then((r) => r.data),
  })

  const log = logs?.find((l) => l.book_id === id)

  const updateMutation = useMutation({
    mutationFn: (payload) => client.patch(`/reading-logs/${log.id}`, payload).then((r) => r.data),
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
    mutationFn: () => client.delete(`/reading-logs/${log.id}`),
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
        <Link to="/books" className="text-sm text-stone-900 font-medium hover:underline">
          Back to my shelf
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <Link to="/books" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
        ← My Shelf
      </Link>

      <div className="mt-6 flex gap-5">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-20 h-28 object-cover rounded-lg flex-shrink-0 shadow-sm"
          />
        ) : (
          <div className="w-20 h-28 bg-stone-100 rounded-lg flex-shrink-0 flex items-center justify-center text-stone-300 text-3xl">
            ▪
          </div>
        )}
        <div className="flex flex-col justify-center gap-1">
          <h1 className="text-xl font-semibold text-stone-900">{book.title}</h1>
          <p className="text-stone-500 text-sm">{book.author}</p>
          {book.genre && <p className="text-xs text-stone-400">{book.genre}</p>}
          {book.isbn && <p className="text-xs text-stone-400">ISBN: {book.isbn}</p>}
          {log && !editing && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit mt-1 ${STATUS_COLOR[log.status]}`}
            >
              {STATUS_OPTIONS.find((o) => o.value === log.status)?.label}
            </span>
          )}
        </div>
      </div>

      {log && (
        <div className="mt-6 bg-white rounded-xl border border-stone-200 p-5 flex flex-col gap-4">
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

              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-600">Status</label>
                <select
                  value={draft.status}
                  onChange={(e) => setDraftField('status')(e.target.value)}
                  className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-stone-600">Start date</label>
                  <input
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => setDraftField('start_date')(e.target.value)}
                    className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-stone-600">End date</label>
                  <input
                    type="date"
                    value={draft.end_date}
                    onChange={(e) => setDraftField('end_date')(e.target.value)}
                    min={draft.start_date || undefined}
                    className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-600">Rating</label>
                <Stars value={draft.rating} onChange={setDraftField('rating')} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-600">Notes</label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraftField('notes')(e.target.value)}
                  rows={4}
                  className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveEditing}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-stone-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={cancelEditing}
                  className="flex-1 border border-stone-200 text-stone-700 rounded-lg py-2 text-sm hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
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
