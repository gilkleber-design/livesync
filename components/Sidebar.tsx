'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Room = {
  id: string
  name: string
}

type Props = {
  rooms: Room[]
}

export default function Sidebar({ rooms: initialRooms }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeRoomId = searchParams.get('roomId')

  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [showModal, setShowModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincroniza com initialRooms quando o Server Component re-renderiza
  // (ex: navegação entre rotas que re-executa o layout)
  useEffect(() => {
    setRooms((prev) => {
      const merged = [...initialRooms]
      for (const room of prev) {
        if (!merged.some((r) => r.id === room.id)) merged.push(room)
      }
      return merged
    })
  }, [initialRooms])

  // Realtime: recebe salas criadas por outros usuários
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('rooms:realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rooms' },
        (payload) => {
          const newRoom = payload.new as Room
          setRooms((prev) => {
            if (prev.some((r) => r.id === newRoom.id)) return prev
            return [...prev, newRoom]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Foca o input quando o modal abre
  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 50)
  }, [showModal])

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault()
    const name = roomName.trim()
    if (!name) return

    setCreating(true)
    setError(null)

    const supabase = createClient()
    const { data, error: insertError } = await supabase
      .from('rooms')
      .insert({ name })
      .select('id, name')
      .single()

    if (insertError || !data) {
      setError(insertError?.message ?? 'Erro ao criar sala')
      setCreating(false)
      return
    }

    // Adiciona ao estado local imediatamente — não espera o Realtime
    setRooms((prev) => {
      if (prev.some((r) => r.id === data.id)) return prev
      return [...prev, data]
    })

    setRoomName('')
    setShowModal(false)
    setCreating(false)
    router.push(`/chat?roomId=${data.id}`)
  }

  function handleCloseModal() {
    setShowModal(false)
    setRoomName('')
    setError(null)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <aside className="w-64 flex flex-col bg-gray-900 text-white shrink-0">
        <div className="px-5 py-4 border-b border-gray-700">
          <h1 className="text-xl font-bold tracking-tight">LiveSync</h1>
          <p className="text-xs text-gray-400 mt-0.5">Chat com IA em tempo real</p>
        </div>

        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Salas
            </p>
            <button
              onClick={() => setShowModal(true)}
              title="Nova sala"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova sala
            </button>
          </div>

          <nav className="space-y-0.5">
            {rooms.length === 0 && (
              <p className="text-sm text-gray-500 px-2">Nenhuma sala ainda</p>
            )}
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => router.push(`/chat?roomId=${room.id}`)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeRoomId === room.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                # {room.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="px-4 py-4 border-t border-gray-700">
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Modal Nova Sala */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal() }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova sala</h2>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label htmlFor="room-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da sala
                </label>
                <input
                  id="room-name"
                  ref={inputRef}
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="ex: design, backend, geral…"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !roomName.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-sm font-semibold text-white transition"
                >
                  {creating ? 'Criando...' : 'Criar sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
