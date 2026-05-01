import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type Props = {
  params: { token: string }
}

export default async function InvitePage({ params }: Props) {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login`)

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('invite_token', params.token)
    .single()

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

  redirect(`/chat?roomId=${room.id}`)
}
