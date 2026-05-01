'use client'

import { useEffect } from 'react'

export default function HardRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.replace(url)
  }, [url])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Entrando na sala…</p>
    </main>
  )
}
