import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import { useDebounce } from '../hooks/useDebounce'

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

function SearchResult({ result, isActive, onSelect, innerRef }) {
  return (
    <li ref={innerRef}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onSelect(result) }}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
          isActive ? 'bg-stone-100' : 'hover:bg-stone-50'
        }`}
      >
        {result.cover_url ? (
          <img
            src={result.cover_url}
            alt={result.title}
            className="w-9 h-12 object-cover rounded flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-12 bg-stone-100 rounded flex-shrink-0 flex items-center justify-center text-stone-300 text-lg">
            ▪
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-900 truncate">{result.title}</p>
          <p className="text-xs text-stone-500 truncate">{result.author}</p>
          {result.published_date && (
            <p className="text-xs text-stone-400">
              {new Date(result.published_date).getUTCFullYear()}
            </p>
          )}
        </div>
      </button>
    </li>
  )
}

export default function AddBook() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // mode: 'search' | 'confirm' | 'manual'
  const [mode, setMode] = useState('search')

  // search state
  const [query, setQuery] = useState('')
  const [committedQuery, setCommittedQuery] = useState('')
  const [dropdownDismissed, setDropdownDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const debouncedQuery = useDebounce(query, 300)
  // committedQuery is set immediately when Search is clicked, bypassing debounce
  const effectiveQuery = committedQuery || debouncedQuery

  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const activeItemRef = useRef(null)
  const containerRef = useRef(null)

  // form state
  const [bookForm, setBookForm] = useState(EMPTY_MANUAL)
  const [logForm, setLogForm] = useState(EMPTY_LOG)
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: searchResults = [], isFetching: searchLoading, isError: searchFailed } = useQuery({
    queryKey: ['metadata-search', effectiveQuery],
    queryFn: () =>
      client.get('/metadata/search', { params: { q: effectiveQuery } }).then((r) => r.data),
    enabled: effectiveQuery.trim().length >= 2,
    staleTime: 30_000,
    retry: false,
  })

  // close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownDismissed(true)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // scroll active item into view
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const visibleResults = searchResults.slice(0, 10)

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    // bypass debounce — trigger immediately
    setCommittedQuery(query.trim())
    setDropdownDismissed(false)
    setActiveIndex(-1)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    // clear committed so debounce takes over; re-open dropdown on new input
    setCommittedQuery('')
    setDropdownDismissed(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e) {
    if (dropdownDismissed || effectiveQuery.trim().length < 2) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectResult(visibleResults[activeIndex])
    } else if (e.key === 'Escape') {
      setDropdownDismissed(true)
      setActiveIndex(-1)
      inputRef.current?.focus()
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
    setDropdownDismissed(true)
    setActiveIndex(-1)
    setSubmitError('')
    setMode('confirm')
  }

  function goManual() {
    setBookForm(EMPTY_MANUAL)
    setSubmitError('')
    setDropdownDismissed(true)
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

  // gate on both raw query (instant) and effectiveQuery (debounced) to avoid ghost dropdown on clear
  const dropdownVisible = !dropdownDismissed && query.trim().length >= 2 && effectiveQuery.trim().length >= 2

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
              <label htmlFor="book-search" className="text-sm font-medium text-stone-700">
                Search for a book
              </label>

              {/* input + dropdown wrapper */}
              <div className="relative" ref={containerRef}>
                <div className="flex gap-2">
                  <input
                    id="book-search"
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => query.trim().length >= 2 && setDropdownDismissed(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Title, author, or ISBN…"
                    autoComplete="off"
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    type="submit"
                    disabled={searchLoading || !query.trim()}
                    className="bg-stone-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
                  >
                    {searchLoading ? 'Searching…' : 'Search'}
                  </button>
                </div>

                {/* typeahead dropdown */}
                {dropdownVisible && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-stone-200 shadow-lg z-10 overflow-hidden"
                  >
                    {searchLoading && (
                      <ul className="divide-y divide-stone-100">
                        {[1, 2, 3].map((n) => (
                          <li key={n} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                            <div className="w-9 h-12 bg-stone-100 rounded flex-shrink-0" />
                            <div className="flex flex-col gap-2 flex-1">
                              <div className="h-3 bg-stone-100 rounded w-3/4" />
                              <div className="h-3 bg-stone-100 rounded w-1/2" />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {!searchLoading && searchFailed && (
                      <p className="px-4 py-3 text-sm text-stone-500">
                        Search failed.{' '}
                        <button
                          type="button"
                          onClick={goManual}
                          className="underline hover:text-stone-700"
                        >
                          Add manually
                        </button>
                      </p>
                    )}

                    {!searchLoading && !searchFailed && visibleResults.length === 0 && (
                      <p className="px-4 py-3 text-sm text-stone-500">
                        No results found.{' '}
                        <button
                          type="button"
                          onClick={goManual}
                          className="underline hover:text-stone-700"
                        >
                          Add manually
                        </button>
                      </p>
                    )}

                    {!searchLoading && !searchFailed && visibleResults.length > 0 && (
                      <ul
                        className="divide-y divide-stone-100 overflow-y-auto"
                        style={{ maxHeight: '19.5rem' /* ~5 rows × 3.9rem */ }}
                      >
                        {visibleResults.map((r, i) => (
                          <SearchResult
                            key={i}
                            result={r}
                            isActive={i === activeIndex}
                            onSelect={selectResult}
                            innerRef={i === activeIndex ? activeItemRef : null}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
