import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import HardRedirect from '@/components/HardRedirect'

type Props = {
  params: { token: string }
}

export default async function InvitePage({ params }: Props) {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login`)

  const { data: rooms } = await supabase
    .rpc('get_room_by_invite_token', { token: params.token })

  const room = rooms?.[0] ?? null

  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">Link de convite inválido.</p>
          <a href="/chat" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
            Voltar para o chat
          </a>
        </div>
      </main>
    )
  }

  await supabase
    .from('room_members')
    .upsert({ room_id: room.id, user_id: user.id }, { onConflict: 'room_id,user_id' })

  return <HardRedirect url={`/chat?roomId=${room.id}`} />
}
