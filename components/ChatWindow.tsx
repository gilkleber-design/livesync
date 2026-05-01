'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import MessageBubble from '@/components/MessageBubble'
import MessageInput from '@/components/MessageInput'

type Message = {
  id: string
  content: string
  is_ai: boolean
  user_id: string
  created_at: string
}

type Props = {
  roomId: string
  currentUserId: string
}

export default function ChatWindow({ roomId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [someoneTyping, setSomeoneTyping] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    setLoading(true)
    setSomeoneTyping(false)
    setAiThinking(false)

    supabase
      .from('messages')
      .select('id, content, is_ai, user_id, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg])
          // Limpa indicadores quando mensagem chega
          if (newMsg.is_ai) setAiThinking(false)
          else setSomeoneTyping(false)
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === currentUserId) return
        setSomeoneTyping(true)
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => setSomeoneTyping(false), 3000)
      })
      .on('broadcast', { event: 'ai_thinking' }, ({ payload }) => {
        if (payload.userId === currentUserId) return
        setAiThinking(payload.active as boolean)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [roomId, currentUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, someoneTyping, aiThinking])

  const broadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: 'broadcast', event, payload })
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Nenhuma mensagem ainda. Seja o primeiro a escrever!
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            content={msg.content}
            isAI={msg.is_ai}
            isOwn={!msg.is_ai && msg.user_id === currentUserId}
            createdAt={msg.created_at}
          />
        ))}

        {/* Indicadores de estado */}
        {someoneTyping && !aiThinking && (
          <div className="flex items-center gap-2 px-4 py-1.5">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-gray-400">alguém está digitando</span>
          </div>
        )}
        {aiThinking && (
          <div className="flex items-center gap-2 px-4 py-1.5">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-purple-400">IA está pensando</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        roomId={roomId}
        userId={currentUserId}
        broadcast={broadcast}
      />
    </div>
  )
}
