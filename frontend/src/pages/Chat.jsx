import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef(null)

  async function sendMessage(text) {
    if (!text || isStreaming) return
    const prevMessages = messages
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setError('')
    setIsStreaming(true)

    let assistantContent = ''
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const token = localStorage.getItem('bs_token')
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history: prevMessages }),
      })

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
            if (parsed.chunk) {
              assistantContent += parsed.chunk
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                return updated
              })
            }
          } catch (e) {
            if (e.message !== 'Unexpected token') throw e
          }
        }
      }
    } catch (err) {
      if (assistantContent) {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
          return updated
        })
        setError(err.message || 'Response ended unexpectedly.')
      } else {
        setMessages(prevMessages)
        setError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setIsStreaming(false)
    }
  }

  function handleSend() {
    sendMessage(input.trim())
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Reading companion</h2>
        <p className="text-sm text-stone-500 mt-1">
          Ask anything about your books, reading habits, or what to read next.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 flex flex-col gap-3 h-[60vh] overflow-y-auto">
        {messages.length === 0 && (
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

        {messages.map((m, i) => (
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
              handleSend()
            }
          }}
          rows={2}
          placeholder="Ask about your reading…"
          className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          className="bg-stone-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          {isStreaming ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
