import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import BookCard from '../components/BookCard'

const TABS = [
  { label: 'Reading', fullLabel: 'Currently Reading', value: 'reading' },
  { label: 'Read', fullLabel: 'Read', value: 'read' },
  { label: 'Want to Read', fullLabel: 'Want to Read', value: 'want_to_read' },
]

function SkeletonCard() {
  return (
    <div className="flex gap-4 p-4 bg-white rounded-lg border border-stone-200 animate-pulse">
      <div className="w-10 h-14 bg-stone-100 rounded flex-shrink-0" />
      <div className="flex flex-col justify-center gap-2 flex-1">
        <div className="h-3 bg-stone-100 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
        <div className="h-3 bg-stone-100 rounded w-1/4" />
      </div>
    </div>
  )
}

export default function Books() {
  const [activeTab, setActiveTab] = useState('reading')
  const queryClient = useQueryClient()

  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['reading-logs', activeTab],
    queryFn: () =>
      client.get('/reading-logs', { params: { status: activeTab } }).then((r) => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ log, status }) =>
      client.patch(`/reading-logs/${log.id}`, { status }).then((r) => r.data),
    onSuccess: (updatedLog) => {
      queryClient.invalidateQueries({ queryKey: ['reading-logs'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['book', updatedLog.book.id] })
      queryClient.invalidateQueries({ queryKey: ['reading-logs', { book_id: updatedLog.book.id }] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (log) => client.delete(`/books/${log.book.id}`),
    onSuccess: (_data, log) => {
      queryClient.invalidateQueries({ queryKey: ['reading-logs'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['book', log.book.id] })
      queryClient.invalidateQueries({ queryKey: ['reading-logs', { book_id: log.book.id }] })
    },
  })

  function getPendingAction(log) {
    if (statusMutation.isPending && statusMutation.variables?.log.id === log.id) {
      return statusMutation.variables.status
    }
    if (removeMutation.isPending && removeMutation.variables?.id === log.id) {
      return 'remove'
    }
    return null
  }

  function handleStatusChange(log, status) {
    if (log.status === status || statusMutation.isPending || removeMutation.isPending) return
    statusMutation.mutate({ log, status })
  }

  function handleRemove(log) {
    if (statusMutation.isPending || removeMutation.isPending) return
    const confirmed = window.confirm(`Remove "${log.book.title}" from your shelf?`)
    if (!confirmed) return
    removeMutation.mutate(log)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-stone-900">My Shelf</h2>
        <Link
          to="/books/add"
          className="text-sm bg-indigo-600 text-white px-4 py-3 sm:py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors min-h-[44px] inline-flex items-center"
        >
          + Add book
        </Link>
      </div>

      <div className="flex gap-1 border-b border-stone-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`whitespace-nowrap px-4 py-3 sm:py-2 text-sm font-medium transition-colors border-b-2 -mb-px min-h-[44px] ${
              activeTab === tab.value
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <span className="sm:hidden">{tab.label}</span>
            <span className="hidden sm:inline">{tab.fullLabel}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">Failed to load books. Please try again.</p>
      )}

      {(statusMutation.isError || removeMutation.isError) && (
        <p className="mb-4 text-sm text-red-600">
          Could not update your shelf. Please try again.
        </p>
      )}

      {!isLoading && !isError && logs?.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm">Nothing here yet — add your first book</p>
          <Link
            to="/books/add"
            className="mt-4 inline-block text-sm text-indigo-600 font-medium hover:text-indigo-700"
          >
            Add a book
          </Link>
        </div>
      )}

      {!isLoading && !isError && logs?.length > 0 && (
        <div className="flex flex-col gap-3">
          {logs.map((log) => (
            <BookCard
              key={log.id}
              log={log}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
              pendingAction={getPendingAction(log)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
