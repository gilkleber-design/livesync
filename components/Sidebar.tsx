'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Room = {
  id: string
  name: string
  invite_token: string
  owner_id: string
}

type Props = {
  rooms: Room[]
  currentUserId: string
}

export default function Sidebar({ rooms: initialRooms, currentUserId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeRoomId = searchParams.get('roomId')

  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [showModal, setShowModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRooms((prev) => {
      const merged = [...initialRooms]
      for (const room of prev) {
        if (!merged.some((r) => r.id === room.id)) merged.push(room)
      }
      return merged
    })
  }, [initialRooms])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('rooms:realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, (payload) => {
        const newRoom = payload.new as Room
        setRooms((prev) => prev.some((r) => r.id === newRoom.id) ? prev : [...prev, newRoom])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, (payload) => {
        const updated = payload.new as Room
        setRooms((prev) => prev.map((r) => r.id === updated.id ? { ...r, name: updated.name } : r))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms' }, (payload) => {
        const deleted = payload.old as { id: string }
        setRooms((prev) => prev.filter((r) => r.id !== deleted.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (showModal) setTimeout(() => createInputRef.current?.focus(), 50)
  }, [showModal])

  useEffect(() => {
    if (renamingId) setTimeout(() => renameInputRef.current?.focus(), 50)
  }, [renamingId])

  // Fecha menu ao clicar fora
  useEffect(() => {
    if (!menuOpenId) return
    const close = () => setMenuOpenId(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuOpenId])

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault()
    const name = roomName.trim()
    if (!name) return
    setCreating(true)
    setCreateError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('rooms')
      .insert({ name, owner_id: currentUserId })
      .select('id, name, invite_token, owner_id')
      .single()
    if (error || !data) { setCreateError(error?.message ?? 'Erro'); setCreating(false); return }
    setRooms((prev) => prev.some((r) => r.id === data.id) ? prev : [...prev, data])
    setRoomName('')
    setShowModal(false)
    setCreating(false)
    router.push(`/chat?roomId=${data.id}`)
  }

  async function handleRename(roomId: string) {
    const name = renameValue.trim()
    if (!name) return
    const supabase = createClient()
    await supabase.from('rooms').update({ name }).eq('id', roomId)
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, name } : r))
    setRenamingId(null)
  }

  async function handleDelete(roomId: string) {
    const supabase = createClient()
    await supabase.from('rooms').delete().eq('id', roomId)
    setRooms((prev) => prev.filter((r) => r.id !== roomId))
    setConfirmDeleteId(null)
    if (activeRoomId === roomId) router.push('/chat')
  }

  function copyInviteLink(token: string, roomId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
    setCopiedId(roomId)
    setTimeout(() => setCopiedId(null), 2000)
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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Salas</p>
            <button
              onClick={() => setShowModal(true)}
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
              <div key={room.id} className="group relative flex items-center gap-1">
                {renamingId === room.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRename(room.id) }}
                    className="flex-1 flex gap-1 px-1"
                  >
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setRenamingId(null)}
                      className="flex-1 bg-gray-800 text-white text-sm px-2 py-1 rounded border border-indigo-500 outline-none"
                    />
                    <button type="submit" className="text-xs text-indigo-400 hover:text-white px-1">OK</button>
                  </form>
                ) : (
                  <button
                    onClick={() => router.push(`/chat?roomId=${room.id}`)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeRoomId === room.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    # {room.name}
                  </button>
                )}

                {!renamingId && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition">
                    {/* Copiar link */}
                    <button
                      onClick={() => copyInviteLink(room.invite_token, room.id)}
                      title="Copiar link de convite"
                      className="p-1.5 rounded text-gray-400 hover:text-white"
                    >
                      {copiedId === room.id ? (
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                    </button>

                    {/* Menu dono */}
                    {(!room.owner_id || room.owner_id === currentUserId) && (
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === room.id ? null : room.id) }}
                          title="Mais opções"
                          className="p-1.5 rounded text-gray-400 hover:text-white"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                          </svg>
                        </button>

                        {menuOpenId === room.id && (
                          <div
                            className="absolute right-0 top-7 z-50 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { setRenamingId(room.id); setRenameValue(room.name); setMenuOpenId(null) }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition"
                            >
                              Renomear
                            </button>
                            <button
                              onClick={() => { setConfirmDeleteId(room.id); setMenuOpenId(null) }}
                              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setRoomName(''); setCreateError(null) } }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova sala</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <input
                ref={createInputRef}
                type="text"
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="ex: design, backend, geral…"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {createError && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{createError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowModal(false); setRoomName('') }}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || !roomName.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-sm font-semibold text-white transition">
                  {creating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Excluir sala</h2>
            <p className="text-sm text-gray-500 mb-6">
              Todas as mensagens serão apagadas. Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
