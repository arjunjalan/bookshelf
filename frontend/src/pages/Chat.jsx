import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import client from '../api/client'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const chatMutation = useMutation({
    mutationFn: ({ message, history }) =>
      client.post('/chat', { message, history }).then((r) => r.data),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      setError('')
    },
  })

  function sendMessage(text) {
    if (!text || chatMutation.isPending) return
    const prevMessages = messages
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    chatMutation.mutate(
      { message: text, history: prevMessages },
      {
        onError: (err) => {
          setMessages(prevMessages)
          setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
        },
      }
    )
  }

  function handleSend() {
    sendMessage(input.trim())
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatMutation.isPending])

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
            <p
              className={`px-4 py-2 rounded-xl text-sm max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-stone-900 text-white rounded-br-sm'
                  : 'bg-stone-100 text-stone-900 rounded-bl-sm'
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex justify-start">
            <p className="px-4 py-2 rounded-xl rounded-bl-sm text-sm bg-stone-100 text-stone-400 animate-pulse">
              Thinking…
            </p>
          </div>
        )}

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
          disabled={chatMutation.isPending || !input.trim()}
          className="bg-stone-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          {chatMutation.isPending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
