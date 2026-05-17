import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import { useDebounce } from '../hooks/useDebounce'

const FULL_SEARCH_LIMIT = 25

const STATUS_OPTIONS = [
  { label: 'Currently Reading', value: 'reading' },
  { label: 'Read', value: 'read' },
  { label: 'Want to Read', value: 'want_to_read' },
]

const QUICK_ADD_STATUS_OPTIONS = [
  { label: 'Want to Read', value: 'want_to_read' },
  { label: 'Reading', value: 'reading' },
  { label: 'Read', value: 'read' },
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
          className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
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
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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

function resultKey(result, index) {
  return [result.isbn, result.title, result.author, result.published_date, index]
    .filter(Boolean)
    .join('|')
}

function resultToBookPayload(result) {
  return {
    title: result.title?.trim() ?? '',
    author: result.author?.trim() ?? '',
    ...(result.isbn && { isbn: result.isbn.trim() }),
    ...(result.cover_url && { cover_url: result.cover_url.trim() }),
    ...(result.description && { description: result.description.trim() }),
    ...(result.page_count != null && { page_count: Number(result.page_count) }),
    ...(result.published_date && { published_date: result.published_date }),
  }
}

function friendlyAddError(err) {
  const detail = err.response?.data?.detail
  if (err.response?.status === 409) {
    return detail || 'This book is already on your shelf.'
  }
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(', ')
  }
  return detail || 'Could not add this book. Try another shelf or add it manually.'
}

function SearchResult({
  result,
  isActive,
  onQuickAdd,
  addingStatus,
  disabled,
  error,
  innerRef,
}) {
  const title = result.title || 'Untitled'
  const author = result.author || 'Unknown author'

  return (
    <li ref={innerRef}>
      <div
        className={`w-full flex flex-col gap-3 px-4 py-3 transition-colors ${
          isActive ? 'bg-stone-100' : 'hover:bg-stone-50'
        }`}
      >
        <div className="flex items-center gap-3">
          {result.cover_url ? (
            <img
              src={result.cover_url}
              alt={title}
              className="w-9 h-12 object-cover rounded flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-12 bg-stone-100 rounded flex-shrink-0 flex items-center justify-center text-stone-300 text-lg">
              ▪
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-stone-900 truncate">{title}</p>
            <p className="text-xs text-stone-500 truncate">{author}</p>
            {result.published_date && (
              <p className="text-xs text-stone-400">
                {new Date(result.published_date).getUTCFullYear()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pl-12">
          {QUICK_ADD_STATUS_OPTIONS.map((status) => (
            <button
              key={status.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onQuickAdd(result, status.value)}
              disabled={disabled}
              className="border border-stone-200 bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:border-indigo-400 disabled:opacity-50 disabled:hover:border-stone-200 transition-colors"
            >
              {addingStatus === status.value ? 'Adding...' : status.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="ml-12 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </li>
  )
}

export default function AddBook() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // mode: 'search' | 'manual'
  const [mode, setMode] = useState('search')

  // search state
  const [query, setQuery] = useState('')
  const [fullSearchQuery, setFullSearchQuery] = useState('')
  const [dropdownDismissed, setDropdownDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const debouncedQuery = useDebounce(query, 300)

  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const activeItemRef = useRef(null)
  const containerRef = useRef(null)

  // form state
  const [bookForm, setBookForm] = useState(EMPTY_MANUAL)
  const [logForm, setLogForm] = useState(EMPTY_LOG)
  const [submitError, setSubmitError] = useState('')
  const [quickAddErrorByResult, setQuickAddErrorByResult] = useState({})
  const [quickAddLoading, setQuickAddLoading] = useState(null)
  const [loading, setLoading] = useState(false)

  // typeahead: lite=true skips description fetching for fast results
  const { data: searchResults = [], isFetching: searchLoading, isError: searchFailed } = useQuery({
    queryKey: ['metadata-search', debouncedQuery],
    queryFn: () =>
      client.get('/metadata/search', { params: { q: debouncedQuery, lite: true } }).then((r) => r.data),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
    retry: false,
  })

  // full search: triggered by Search button, paginates lightweight result chunks
  const {
    data: fullSearchData,
    isFetching: fullFetching,
    isLoading: fullInitialLoading,
    isFetchingNextPage,
    isError: fullFailed,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['metadata-full-search', fullSearchQuery],
    queryFn: ({ pageParam = 0 }) =>
      client
        .get('/metadata/search', {
          params: {
            q: fullSearchQuery,
            limit: FULL_SEARCH_LIMIT,
            offset: pageParam,
            lite: true,
            paginated: true,
          },
        })
        .then((r) => r.data),
    enabled: fullSearchQuery.trim().length >= 2,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) return undefined
      return lastPage.offset + lastPage.limit
    },
    staleTime: 30_000,
    retry: false,
  })

  const fullPages = fullSearchData?.pages ?? []
  const fullResults = fullPages.flatMap((page) => page.results)
  const fullTotal = fullPages[0]?.total ?? fullResults.length
  const fullLoading = fullInitialLoading || (fullFetching && fullResults.length === 0)

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
  const showFullResults = fullSearchQuery.trim().length >= 2

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setFullSearchQuery(query.trim())
    setDropdownDismissed(true)
    setActiveIndex(-1)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    setFullSearchQuery('')
    setDropdownDismissed(false)
    setActiveIndex(-1)
    setQuickAddErrorByResult({})
  }

  function handleKeyDown(e) {
    if (dropdownDismissed || debouncedQuery.trim().length < 2) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setDropdownDismissed(true)
      setActiveIndex(-1)
      inputRef.current?.focus()
    }
  }

  function goManual() {
    setBookForm(EMPTY_MANUAL)
    setSubmitError('')
    setDropdownDismissed(true)
    setFullSearchQuery('')
    setMode('manual')
  }

  async function handleQuickAdd(result, status, key) {
    if (quickAddLoading) return
    const bookPayload = resultToBookPayload(result)
    if (!bookPayload.title || !bookPayload.author) {
      setQuickAddErrorByResult((errors) => ({
        ...errors,
        [key]: 'This result is missing a title or author. Add it manually to finish the details.',
      }))
      return
    }

    setQuickAddErrorByResult((errors) => ({ ...errors, [key]: '' }))
    setQuickAddLoading({ key, status })

    try {
      const { data: book } = await client.post('/books', bookPayload)
      await client.post('/reading-logs', { book_id: book.id, status })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reading-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      ])
      navigate(`/books/${book.id}`)
    } catch (err) {
      setQuickAddErrorByResult((errors) => ({
        ...errors,
        [key]: friendlyAddError(err),
      }))
    } finally {
      setQuickAddLoading(null)
    }
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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reading-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      ])
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
    'border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors'

  const dropdownVisible = !dropdownDismissed && !showFullResults && query.trim().length >= 2 && debouncedQuery.trim().length >= 2

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
                    disabled={fullFetching || !query.trim()}
                    className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {fullFetching && !isFetchingNextPage ? 'Searching…' : 'Search'}
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
                          (() => {
                            const key = resultKey(r, i)
                            return (
                              <SearchResult
                                key={key}
                                result={r}
                                isActive={i === activeIndex}
                                onQuickAdd={(result, status) => handleQuickAdd(result, status, key)}
                                addingStatus={quickAddLoading?.key === key ? quickAddLoading.status : null}
                                disabled={Boolean(quickAddLoading)}
                                error={quickAddErrorByResult[key]}
                                innerRef={i === activeIndex ? activeItemRef : null}
                              />
                            )
                          })()
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

          {/* ── Full results list (shown after Search button click) ── */}
          {showFullResults && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs text-stone-400">
                  {fullLoading
                    ? `Searching for "${fullSearchQuery}"…`
                    : fullFailed
                    ? 'Search failed.'
                    : `Showing ${fullResults.length} of ${fullTotal} results for "${fullSearchQuery}"`}
                </p>

                {hasNextPage && !fullLoading && !fullFailed && fullResults.length > 0 && (
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="flex-shrink-0 border border-stone-200 bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:border-indigo-400 disabled:opacity-50 transition-colors"
                  >
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>

              {fullLoading && (
                <ul className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
                  {[1, 2, 3, 4, 5].map((n) => (
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

              {!fullLoading && fullFailed && (
                <p className="text-sm text-stone-500 px-1">
                  Search failed.{' '}
                  <button onClick={goManual} className="underline hover:text-stone-700">
                    Add manually
                  </button>
                </p>
              )}

              {!fullLoading && !fullFailed && fullResults.length === 0 && (
                <p className="text-sm text-stone-500 px-1">
                  No results found.{' '}
                  <button onClick={goManual} className="underline hover:text-stone-700">
                    Add manually
                  </button>
                </p>
              )}

              {!fullLoading && !fullFailed && fullResults.length > 0 && (
                <ul className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden overflow-y-auto" style={{ maxHeight: '30rem' }}>
                  {fullResults.map((r, i) => {
                    const key = resultKey(r, i)
                    return (
                      <SearchResult
                        key={key}
                        result={r}
                        isActive={false}
                        onQuickAdd={(result, status) => handleQuickAdd(result, status, key)}
                        addingStatus={quickAddLoading?.key === key ? quickAddLoading.status : null}
                        disabled={Boolean(quickAddLoading)}
                        error={quickAddErrorByResult[key]}
                        innerRef={null}
                      />
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Manual mode ── */}
      {mode === 'manual' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-5"
        >
          <button
            type="button"
            onClick={() => setMode('search')}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors text-left -mb-1"
          >
            ← Back to search
          </button>

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
            className="bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Adding…' : 'Add book'}
          </button>
        </form>
      )}
    </div>
  )
}
