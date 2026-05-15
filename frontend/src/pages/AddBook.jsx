import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

const STATUS_OPTIONS = [
  { label: 'Currently Reading', value: 'reading' },
  { label: 'Read', value: 'read' },
  { label: 'Want to Read', value: 'want_to_read' },
]

export default function AddBook() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    title: '',
    author: '',
    genre: '',
    isbn: '',
    cover_url: '',
    status: 'reading',
    start_date: '',
    end_date: '',
    rating: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function validate() {
    if (!form.title.trim()) return 'Title is required'
    if (!form.author.trim()) return 'Author is required'
    if (form.rating && (Number(form.rating) < 1 || Number(form.rating) > 5))
      return 'Rating must be between 1 and 5'
    if (form.start_date && form.end_date && form.end_date < form.start_date)
      return 'End date must be on or after start date'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setLoading(true)
    try {
      const bookPayload = {
        title: form.title.trim(),
        author: form.author.trim(),
        ...(form.genre && { genre: form.genre.trim() }),
        ...(form.isbn && { isbn: form.isbn.trim() }),
        ...(form.cover_url && { cover_url: form.cover_url.trim() }),
      }
      const { data: book } = await client.post('/books', bookPayload)

      const logPayload = {
        book_id: book.id,
        status: form.status,
        ...(form.start_date && { start_date: form.start_date }),
        ...(form.end_date && { end_date: form.end_date }),
        ...(form.rating && { rating: Number(form.rating) }),
        ...(form.notes && { notes: form.notes.trim() }),
      }
      await client.post('/reading-logs', logPayload)

      queryClient.invalidateQueries({ queryKey: ['reading-logs'] })
      navigate(`/books/${book.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add book')
    } finally {
      setLoading(false)
    }
  }

  const isRead = form.status === 'read'

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-stone-400 hover:text-stone-700 transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-xl font-semibold text-stone-900">Add a book</h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-5"
      >
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={set('title')}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">
              Author <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.author}
              onChange={set('author')}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Genre</label>
            <input
              type="text"
              value={form.genre}
              onChange={set('genre')}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">ISBN</label>
            <input
              type="text"
              value={form.isbn}
              onChange={set('isbn')}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Cover URL</label>
            <input
              type="url"
              value={form.cover_url}
              onChange={set('cover_url')}
              placeholder="https://…"
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
        </div>

        <hr className="border-stone-100" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">
              Status <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={form.status}
              onChange={set('status')}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Start date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={set('start_date')}
                className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>

            {isRead && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700">End date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={set('end_date')}
                  min={form.start_date || undefined}
                  className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                />
              </div>
            )}
          </div>

          {isRead && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rating: String(n) }))}
                    className={`text-2xl transition-colors ${
                      Number(form.rating) >= n ? 'text-amber-400' : 'text-stone-200 hover:text-amber-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
                {form.rating && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rating: '' }))}
                    className="text-xs text-stone-400 hover:text-stone-600 ml-1 self-center"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Adding…' : 'Add book'}
        </button>
      </form>
    </div>
  )
}
