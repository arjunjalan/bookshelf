import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

const STATUS_OPTIONS = [
  { label: 'Currently Reading', value: 'reading' },
  { label: 'Read', value: 'read' },
  { label: 'Want to Read', value: 'want_to_read' },
]

const EMPTY_LOG = {
  status: 'reading',
  start_date: '',
  end_date: '',
  rating: '',
  notes: '',
}

const EMPTY_MANUAL = {
  title: '',
  author: '',
  genre: '',
  isbn: '',
  cover_url: '',
  description: '',
  page_count: '',
  published_date: '',
}

function LogSection({ form, setForm }) {
  const isRead = form.status === 'read'

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="log-status" className="text-sm font-medium text-stone-700">
          Status <span className="text-red-400">*</span>
        </label>
        <select
          id="log-status"
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
        <label htmlFor="log-notes" className="text-sm font-medium text-stone-700">Notes</label>
        <textarea
          id="log-notes"
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
        />
      </div>
    </div>
  )
}

export default function AddBook() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // mode: 'search' | 'confirm' | 'manual'
  const [mode, setMode] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [bookForm, setBookForm] = useState(EMPTY_MANUAL)
  const [logForm, setLogForm] = useState(EMPTY_LOG)
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    setResults([])
    try {
      const { data } = await client.get('/metadata/search', { params: { q: query.trim() } })
      setResults(data)
      if (data.length === 0) setSearchError('No results found.')
    } catch {
      setSearchError('Search failed. Try again or add manually.')
    } finally {
      setSearching(false)
    }
  }

  function selectResult(result) {
    setBookForm({
      title: result.title ?? '',
      author: result.author ?? '',
      genre: '',
      isbn: result.isbn ?? '',
      cover_url: result.cover_url ?? '',
      description: result.description ?? '',
      page_count: result.page_count != null ? String(result.page_count) : '',
      published_date: result.published_date ?? '',
    })
    setSubmitError('')
    setMode('confirm')
  }

  function goManual() {
    setBookForm(EMPTY_MANUAL)
    setSubmitError('')
    setMode('manual')
  }

  function validate() {
    if (!bookForm.title.trim()) return 'Title is required'
    if (!bookForm.author.trim()) return 'Author is required'
    if (bookForm.page_count && (isNaN(Number(bookForm.page_count)) || Number(bookForm.page_count) < 1))
      return 'Page count must be a positive number'
    if (logForm.rating && (Number(logForm.rating) < 1 || Number(logForm.rating) > 5))
      return 'Rating must be between 1 and 5'
    if (logForm.start_date && logForm.end_date && logForm.end_date < logForm.start_date)
      return 'End date must be on or after start date'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setSubmitError(validationError)
      return
    }
    setSubmitError('')
    setLoading(true)
    try {
      const bookPayload = {
        title: bookForm.title.trim(),
        author: bookForm.author.trim(),
        ...(bookForm.genre && { genre: bookForm.genre.trim() }),
        ...(bookForm.isbn && { isbn: bookForm.isbn.trim() }),
        ...(bookForm.cover_url && { cover_url: bookForm.cover_url.trim() }),
        ...(bookForm.description && { description: bookForm.description.trim() }),
        ...(bookForm.page_count && { page_count: Number(bookForm.page_count) }),
        ...(bookForm.published_date && { published_date: bookForm.published_date }),
      }
      const { data: book } = await client.post('/books', bookPayload)

      const logPayload = {
        book_id: book.id,
        status: logForm.status,
        ...(logForm.start_date && { start_date: logForm.start_date }),
        ...(logForm.end_date && { end_date: logForm.end_date }),
        ...(logForm.rating && { rating: Number(logForm.rating) }),
        ...(logForm.notes && { notes: logForm.notes.trim() }),
      }
      await client.post('/reading-logs', logPayload)

      queryClient.invalidateQueries({ queryKey: ['reading-logs'] })
      navigate(`/books/${book.id}`)
    } catch (err) {
      setSubmitError(err.response?.data?.detail || 'Failed to add book')
    } finally {
      setLoading(false)
    }
  }

  function setBookField(field) {
    return (e) => setBookForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const inputCls =
    'border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300'

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

      {/* ── Search mode ── */}
      {mode === 'search' && (
        <div className="flex flex-col gap-4">
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="book-search" className="text-sm font-medium text-stone-700">Search for a book</label>
              <div className="flex gap-2">
                <input
                  id="book-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Title, author, or ISBN…"
                  className={`flex-1 ${inputCls}`}
                />
                <button
                  type="submit"
                  disabled={searching || !query.trim()}
                  className="bg-stone-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
                >
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={goManual}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors text-left"
            >
              Add manually instead
            </button>
          </form>

          {searchError && (
            <p className="text-sm text-stone-500 px-1">
              {searchError}{' '}
              <button
                onClick={goManual}
                className="underline hover:text-stone-700 transition-colors"
              >
                Add manually
              </button>
            </p>
          )}

          {results.length > 0 && (
            <ul className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => selectResult(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                  >
                    {r.cover_url ? (
                      <img
                        src={r.cover_url}
                        alt={r.title}
                        className="w-9 h-12 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-12 bg-stone-100 rounded flex-shrink-0 flex items-center justify-center text-stone-300 text-lg">
                        ▪
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{r.title}</p>
                      <p className="text-xs text-stone-500 truncate">{r.author}</p>
                      {r.published_date && (
                        <p className="text-xs text-stone-400">
                          {new Date(r.published_date).getUTCFullYear()}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Confirm / Manual mode ── */}
      {(mode === 'confirm' || mode === 'manual') && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-5"
        >
          {mode === 'confirm' && (
            <button
              type="button"
              onClick={() => setMode('search')}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors text-left -mb-1"
            >
              ← Back to search
            </button>
          )}

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label htmlFor="book-title" className="text-sm font-medium text-stone-700">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="book-title"
                type="text"
                required
                value={bookForm.title}
                onChange={setBookField('title')}
                className={inputCls}
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <label htmlFor="book-author" className="text-sm font-medium text-stone-700">
                Author <span className="text-red-400">*</span>
              </label>
              <input
                id="book-author"
                type="text"
                required
                value={bookForm.author}
                onChange={setBookField('author')}
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Genre</label>
              <input
                type="text"
                value={bookForm.genre}
                onChange={setBookField('genre')}
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">ISBN</label>
              <input
                type="text"
                value={bookForm.isbn}
                onChange={setBookField('isbn')}
                className={inputCls}
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Cover URL</label>
              <input
                type="url"
                value={bookForm.cover_url}
                onChange={setBookField('cover_url')}
                placeholder="https://…"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Pages</label>
              <input
                type="number"
                min="1"
                value={bookForm.page_count}
                onChange={setBookField('page_count')}
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Published</label>
              <input
                type="date"
                value={bookForm.published_date}
                onChange={setBookField('published_date')}
                className={inputCls}
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">Description</label>
              <textarea
                value={bookForm.description}
                onChange={setBookField('description')}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          <hr className="border-stone-100" />

          <LogSection form={logForm} setForm={setLogForm} />

          <button
            type="submit"
            disabled={loading}
            className="bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Adding…' : 'Add book'}
          </button>
        </form>
      )}
    </div>
  )
}
