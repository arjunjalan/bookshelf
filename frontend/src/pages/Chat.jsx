import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import client, { clearAuthAndRedirect } from '../api/client'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Chat() {
  const queryClient = useQueryClient()
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [liveMessages, setLiveMessages] = useState([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef(null)
  const streamingContentRef = useRef('')
  const sessionIdCaptured = useRef(false)
  const resolvedSessionIdRef = useRef(null)

  const { data: sessions = [] } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => client.get('/chat/sessions').then((r) => r.data),
  })

  // 'new' sentinel = user explicitly wants a blank chat; null = auto-select most recent
  const effectiveSessionId =
    activeSessionId === 'new' ? null : (activeSessionId ?? sessions[0]?.id ?? null)

  const { data: sessionMessages = [] } = useQuery({
    queryKey: ['chat-messages', effectiveSessionId],
    queryFn: () =>
      client.get(`/chat/sessions/${effectiveSessionId}/messages`).then((r) => r.data),
    enabled: !!effectiveSessionId,
  })

  // In-flight streaming messages layered on top of persisted session messages
  const displayMessages = useMemo(
    () => [...sessionMessages, ...liveMessages],
    [sessionMessages, liveMessages],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, isStreaming])

  function handleSelectSession(id) {
    if (id === effectiveSessionId) return
    setActiveSessionId(id)
    setLiveMessages([])
    setError('')
    sessionIdCaptured.current = false
  }

  function handleNewChat() {
    setActiveSessionId('new')
    setLiveMessages([])
    setError('')
    sessionIdCaptured.current = false
  }

  async function sendMessage(text) {
    if (!text || isStreaming) return
    setInput('')
    setError('')
    setIsStreaming(true)
    streamingContentRef.current = ''
    sessionIdCaptured.current = false
    resolvedSessionIdRef.current = effectiveSessionId

    setLiveMessages([
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ])

    try {
      const token = localStorage.getItem('bs_token')
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, session_id: effectiveSessionId ?? null }),
      })

      if (response.status === 401) {
        clearAuthAndRedirect()
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'Something went wrong. Please try again.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop()

        for (const event of events) {
          const line = event.trim()
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)

            // Capture session_id from first chunk when a new session was created server-side
            if (parsed.session_id && !sessionIdCaptured.current) {
              sessionIdCaptured.current = true
              resolvedSessionIdRef.current = parsed.session_id
              if (parsed.session_id !== effectiveSessionId) {
                setActiveSessionId(parsed.session_id)
                queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
              }
            }

            if (parsed.chunk) {
              streamingContentRef.current += parsed.chunk
              const content = streamingContentRef.current
              setLiveMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content }
                return updated
              })
            }
          } catch (e) {
            if (e.message !== 'Unexpected token') throw e
          }
        }
      }

      // Await the messages refetch before clearing liveMessages — otherwise the window
      // blanks for the duration of the round-trip (setLiveMessages clears instantly,
      // but sessionMessages is still [] until invalidateQueries resolves).
      await queryClient.invalidateQueries({ queryKey: ['chat-messages', resolvedSessionIdRef.current] })
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
      setLiveMessages([])
    } catch (err) {
      if (streamingContentRef.current) {
        setLiveMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: streamingContentRef.current }
          return updated
        })
        setError(err.message || 'Response ended unexpectedly.')
      } else {
        setLiveMessages([])
        setError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex gap-4 -mx-4 sm:-mx-6 -my-8 h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-stone-200 bg-white flex flex-col overflow-hidden">
        <div className="p-3 border-b border-stone-100">
          <button
            onClick={handleNewChat}
            className="w-full text-sm bg-stone-900 text-white rounded-lg px-3 py-2 hover:bg-stone-700 transition-colors"
          >
            + New chat
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-1">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => handleSelectSession(s.id)}
                className={`w-full text-left px-3 py-2.5 transition-colors ${
                  s.id === effectiveSessionId
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <p className="text-xs font-medium truncate">{s.title}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">{formatDate(s.updated_at)}</p>
              </button>
            </li>
          ))}
          {sessions.length === 0 && (
            <li className="px-3 py-4 text-xs text-stone-400 text-center">No chats yet</li>
          )}
        </ul>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col gap-3 py-8 pr-4 sm:pr-6 min-w-0">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Reading companion</h2>
          <p className="text-sm text-stone-500 mt-1">
            Ask anything about your books, reading habits, or what to read next.
          </p>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-stone-200 p-5 flex flex-col gap-3 overflow-y-auto min-h-0">
          {displayMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-stone-400 text-sm">No messages yet.</p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {[
                  'What should I read next?',
                  'Which author do I seem to enjoy most?',
                  'How has my reading pace changed?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="text-sm text-stone-600 border border-stone-200 rounded-lg px-3 py-2 hover:bg-stone-50 transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {displayMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'user' ? (
                <p className="px-4 py-2 rounded-xl rounded-br-sm text-sm max-w-[80%] whitespace-pre-wrap leading-relaxed bg-stone-900 text-white">
                  {m.content}
                </p>
              ) : (
                <div className="max-w-[80%]">
                  <div className="px-4 py-2 rounded-xl rounded-bl-sm text-sm bg-stone-100 text-stone-900 prose prose-sm prose-stone max-w-none overflow-x-auto">
                    {m.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noreferrer">{children}</a>
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-stone-400 animate-pulse">Thinking…</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input.trim())
              }
            }}
            rows={2}
            placeholder="Ask about your reading…"
            className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
          />
          <button
            type="button"
            onClick={() => sendMessage(input.trim())}
            disabled={isStreaming || !input.trim()}
            className="bg-stone-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            {isStreaming ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
