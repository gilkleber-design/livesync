import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name')
    .order('created_at', { ascending: true })

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Suspense>
        <Sidebar rooms={rooms ?? []} />
      </Suspense>
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
