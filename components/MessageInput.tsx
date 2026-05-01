'use client'

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Props = {
  roomId: string
  userId: string
  broadcast: (event: string, payload: Record<string, unknown>) => void
}

export default function MessageInput({ roomId, userId, broadcast }: Props) {
  const [text, setText] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const emitTyping = useCallback(() => {
    broadcast('typing', { userId })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {}, 2500)
  }, [broadcast, userId])

  async function sendRegularMessage(content: string) {
    const supabase = createClient()
    await supabase.from('messages').insert({
      room_id: roomId,
      user_id: userId,
      content,
      is_ai: false,
      role: 'user',
    })
  }

  async function requestAI() {
    setLoadingAI(true)
    broadcast('ai_thinking', { userId, active: true })
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      })
      if (!res.ok) {
        const data = await res.json()
        console.error('Erro ao chamar IA:', data.error)
        broadcast('ai_thinking', { userId, active: false })
      }
    } catch {
      broadcast('ai_thinking', { userId, active: false })
    } finally {
      setLoadingAI(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')

    if (trimmed.startsWith('/ai')) {
      const userMessage = trimmed.replace(/^\/ai\s*/, '').trim()
      if (userMessage) await sendRegularMessage(userMessage)
      await requestAI()
    } else {
      await sendRegularMessage(trimmed)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); emitTyping() }}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem… ou use /ai para consultar a IA"
            rows={1}
            className="w-full resize-none px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-base sm:text-sm leading-relaxed"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>

        <button
          type="button"
          onClick={requestAI}
          disabled={loadingAI}
          title="Perguntar à IA com contexto das últimas mensagens"
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-purple-100 hover:bg-purple-200 disabled:bg-purple-50 text-purple-700 disabled:text-purple-400 transition"
        >
          {loadingAI ? (
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
        </button>

        <button
          type="submit"
          disabled={!text.trim()}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white disabled:text-gray-400 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>

      <p className="hidden sm:block text-xs text-gray-400 mt-1.5 px-1">
        Enter para enviar · Shift+Enter para nova linha · /ai para consultar a IA
      </p>
    </div>
  )
}
