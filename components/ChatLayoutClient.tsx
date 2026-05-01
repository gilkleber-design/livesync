'use client'

import { Suspense, useState } from 'react'
import Sidebar from '@/components/Sidebar'

type Room = {
  id: string
  name: string
  invite_token: string
  owner_id: string
}

type Props = {
  rooms: Room[]
  currentUserId: string
  children: React.ReactNode
}

export default function ChatLayoutClient({ rooms, currentUserId, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Suspense>
          <Sidebar
            rooms={rooms}
            currentUserId={currentUserId}
            onClose={() => setSidebarOpen(false)}
          />
        </Suspense>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
            aria-label="Abrir menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-900">LiveSync</h1>
        </div>
        {children}
      </main>
    </div>
  )
}
