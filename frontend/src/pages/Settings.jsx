import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { socialApi } from '../api/social'
import client from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import ErrorBanner from '../components/ui/ErrorBanner'

const HANDLE_RE = /^[a-z0-9_]{1,30}$/

const GENRE_SUGGESTIONS = [
  'Biography',
  'Business',
  'Classics',
  'Fantasy',
  'History',
  'Horror',
  'Literary fiction',
  'Memoir',
  'Mystery',
  'Nonfiction',
  'Philosophy',
  'Poetry',
  'Psychology',
  'Romance',
  'Science',
  'Science fiction',
  'Self-help',
  'Thriller',
]

const AUTHOR_SUGGESTIONS = [
  'Agatha Christie',
  'Andy Weir',
  'Brandon Sanderson',
  'Celeste Ng',
  'Colson Whitehead',
  'Emily St. John Mandel',
  'Frank Herbert',
  'George Orwell',
  'Haruki Murakami',
  'James Clear',
  'Jane Austen',
  'Kazuo Ishiguro',
  'Margaret Atwood',
  'Neil Gaiman',
  'Octavia E. Butler',
  'Toni Morrison',
  'Ursula K. Le Guin',
]

function uniqSorted(values) {
  return [...new Set(values.filter(Boolean).map((v) => v.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
}

function TagInput({ label, values, onChange, suggestions = [] }) {
  const [draft, setDraft] = useState('')
  const inputId = useId()

  const normalizedValues = new Set(values.map((v) => v.toLowerCase()))
  const matches = draft.trim()
    ? suggestions.filter((item) =>
        item.toLowerCase().includes(draft.trim().toLowerCase()) &&
        !normalizedValues.has(item.toLowerCase())
      ).slice(0, 6)
    : suggestions.filter((item) => !normalizedValues.has(item.toLowerCase())).slice(0, 6)

  function add(value = draft) {
    const v = value.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }

  function remove(idx) {
    onChange(values.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-stone-700">{label}</label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Type to search or add your own"
        />
        <Button variant="ghost" type="button" size="sm" onClick={add}>Add</Button>
      </div>
      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matches.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => add(item)}
              className="rounded-full border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {item}
            </button>
          ))}
        </div>
      )}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-xs px-2 py-1 rounded-full">
              {v}
              <button type="button" onClick={() => remove(i)} className="text-stone-400 hover:text-stone-600 leading-none">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['social-profile', 'me'],
    queryFn: () =>
      socialApi.getMyProfile()
        .then((r) => r.data)
        .catch((err) => {
          if (err.response?.status === 404) return null
          throw err
        }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: books = [] } = useQuery({
    queryKey: ['books', 'profile-suggestions'],
    queryFn: () => client.get('/books', { params: { limit: 100 } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [topGenres, setTopGenres] = useState([])
  const [favouriteAuthors, setFavouriteAuthors] = useState([])
  const [handleAvailableRaw, setHandleAvailableRaw] = useState(null)
  const [checking, setChecking] = useState(false)
  const debounceRef = useRef(null)
  const [saved, setSaved] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (profile) {
      setHandle(profile.handle ?? '')
      setDisplayName(profile.display_name ?? '')
      setBio(profile.bio ?? '')
      setTopGenres(profile.top_genres ?? [])
      setFavouriteAuthors(profile.favourite_authors ?? [])
    }
  }, [profile])
  /* eslint-enable react-hooks/set-state-in-effect */

  const originalHandle = profile?.handle ?? ''

  // Derive availability at render time — true if unchanged, null if invalid
  const handleTrimmed = handle.trim().toLowerCase()
  const handleAvailable = handleTrimmed === originalHandle
    ? true
    : (HANDLE_RE.test(handleTrimmed) ? handleAvailableRaw : null)

  useEffect(() => {
    const trimmed = handle.trim().toLowerCase()
    clearTimeout(debounceRef.current)
    if (!trimmed || trimmed === originalHandle || !HANDLE_RE.test(trimmed)) return
    debounceRef.current = setTimeout(async () => {
      setChecking(true)
      try {
        const res = await socialApi.checkHandle(trimmed)
        setHandleAvailableRaw(res.data.available)
      } catch {
        setHandleAvailableRaw(null)
      } finally {
        setChecking(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [handle, originalHandle])

  const createMutation = useMutation({
    mutationFn: (data) => socialApi.createProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', 'me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => socialApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', 'me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const activeError = profile ? updateMutation.error : createMutation.error
  const isPending = profile ? updateMutation.isPending : createMutation.isPending

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = handle.trim().toLowerCase()
    if (!HANDLE_RE.test(trimmed) || !handleAvailable) return

    const data = {
      handle: trimmed,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      top_genres: topGenres,
      favourite_authors: favouriteAuthors,
    }

    if (profile) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleError = handle && !HANDLE_RE.test(handle.trim().toLowerCase())
    ? 'Must be 1–30 lowercase letters, numbers, or underscores'
    : null

  const submitDisabled = isPending || checking || !handleAvailable || !!handleError
  const genreSuggestions = uniqSorted([
    ...GENRE_SUGGESTIONS,
    ...books.map((book) => book.genre),
  ])
  const authorSuggestions = uniqSorted([
    ...AUTHOR_SUGGESTIONS,
    ...books.map((book) => book.author),
  ])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-7 w-32 bg-stone-100 rounded animate-pulse" />
        <div className="h-48 bg-stone-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-stone-900">Profile</h1>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-stone-900 mb-4">Public profile</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">
              Handle <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm select-none">@</span>
              <Input
                className="pl-7"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </div>
            {handleError && <p className="text-xs text-red-600">{handleError}</p>}
            {!handleError && handle && !checking && handleAvailable === false && handle.trim().toLowerCase() !== originalHandle && (
              <p className="text-xs text-red-600">@{handle.trim().toLowerCase()} is already taken</p>
            )}
            {checking && <p className="text-xs text-stone-400">Checking…</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">
              Display name <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              placeholder="Your name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">
              Bio <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A few words about you and your reading…"
            />
          </div>

          <TagInput
            label="Favourite genres (declared preferences for reading suggestions)"
            values={topGenres}
            onChange={setTopGenres}
            suggestions={genreSuggestions}
          />

          <TagInput
            label="Favourite authors (declared preferences for reading suggestions)"
            values={favouriteAuthors}
            onChange={setFavouriteAuthors}
            suggestions={authorSuggestions}
          />

          <ErrorBanner message={activeError?.response?.data?.detail} />

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitDisabled}>
              {isPending ? 'Saving…' : profile ? 'Save changes' : 'Create profile'}
            </Button>
            {saved && <span className="text-sm text-green-600">Saved</span>}
          </div>
        </form>
      </Card>
    </div>
  )
}
