import { createServerSupabaseClient } from '@/lib/supabase-server'
import ChatLayoutClient from '@/components/ChatLayoutClient'

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient()

  const [{ data: { user } }, { data: rooms }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('rooms')
      .select('id, name, invite_token, owner_id')
      .order('created_at', { ascending: true }),
  ])

  return (
    <ChatLayoutClient rooms={rooms ?? []} currentUserId={user?.id ?? ''}>
      {children}
    </ChatLayoutClient>
  )
}
