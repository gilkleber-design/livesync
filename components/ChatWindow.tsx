'use client'

import { useEffect, useRef, useState } from 'react'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    setLoading(true)

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, content, is_ai, user_id, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      setMessages(data ?? [])
      setLoading(false)
    }

    fetchMessages()

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const newMsg = payload.new as Message
            // Evita duplicatas caso a mensagem já tenha sido inserida otimisticamente
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

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
        <div ref={messagesEndRef} />
      </div>

      <MessageInput roomId={roomId} userId={currentUserId} />
    </div>
  )
}
