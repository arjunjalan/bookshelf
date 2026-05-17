import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { socialApi } from '../api/social'
import Button from './ui/Button'
import { Input } from './ui/Input'
import ErrorBanner from './ui/ErrorBanner'

const HANDLE_RE = /^[a-z0-9_]{1,30}$/

export default function OnboardingOverlay({ onSkip }) {
  const queryClient = useQueryClient()
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [handleAvailable, setHandleAvailable] = useState(null)
  const [checking, setChecking] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    const trimmed = handle.trim().toLowerCase()
    if (!trimmed || !HANDLE_RE.test(trimmed)) {
      setHandleAvailable(null)
      setChecking(false)
      return
    }
    setChecking(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await socialApi.checkHandle(trimmed)
        setHandleAvailable(res.data.available)
      } catch {
        setHandleAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [handle])

  const { mutate, isPending, error } = useMutation({
    mutationFn: (data) => socialApi.createProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', 'me'] })
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = handle.trim().toLowerCase()
    if (!HANDLE_RE.test(trimmed) || !handleAvailable) return
    mutate({ handle: trimmed, display_name: displayName.trim() || null })
  }

  const handleError = handle && !HANDLE_RE.test(handle.trim().toLowerCase())
    ? 'Handle must be 1–30 lowercase letters, numbers, or underscores'
    : null

  const submitDisabled = isPending || checking || !handleAvailable || !!handleError

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 w-full max-w-sm flex flex-col gap-5 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Set up your profile</h2>
          <p className="text-sm text-stone-500 mt-1">
            Choose a handle so others can find and follow you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">
              Handle <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm select-none">@</span>
              <Input
                className="pl-7"
                placeholder="yourhandle"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            {handleError && (
              <p className="text-xs text-red-600">{handleError}</p>
            )}
            {!handleError && handle && !checking && handleAvailable === true && (
              <p className="text-xs text-green-600">@{handle.trim().toLowerCase()} is available</p>
            )}
            {!handleError && handle && !checking && handleAvailable === false && (
              <p className="text-xs text-red-600">@{handle.trim().toLowerCase()} is taken</p>
            )}
            {checking && (
              <p className="text-xs text-stone-400">Checking…</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">
              Display name <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <Input
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
            />
          </div>

          <ErrorBanner message={error?.response?.data?.detail} />

          <div className="flex gap-3">
            <Button
              variant="ghost"
              type="button"
              className="flex-1"
              onClick={onSkip}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={submitDisabled}
            >
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
