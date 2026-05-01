import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAIResponse, type MessageContext } from '@/services/gemini'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let roomId: string | undefined
  try {
    const body = await request.json()
    roomId = body.roomId
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!roomId) {
    return NextResponse.json({ error: 'roomId é obrigatório' }, { status: 400 })
  }

  const { data: messages, error: fetchError } = await supabase
    .from('messages')
    .select('content, is_ai, role')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Inverte para ordem cronológica e mapeia para o formato do Gemini
  // Usa a coluna role quando disponível; cai no is_ai como fallback
  const context: MessageContext[] = (messages ?? [])
    .reverse()
    .map((m) => ({
      role: (m.role === 'assistant' ? 'model' : m.role) as MessageContext['role'] ?? (m.is_ai ? 'model' : 'user'),
      content: m.content,
    }))

  // Se não há mensagens ainda, adiciona um prompt padrão
  if (context.length === 0) {
    context.push({ role: 'user', content: 'Olá! Você pode nos ajudar nesta sala de chat?' })
  }

  let aiText: string
  try {
    aiText = await getAIResponse(context)
  } catch (err) {
    console.error('Erro ao chamar Gemini:', err)
    return NextResponse.json({ error: 'Erro ao processar IA' }, { status: 500 })
  }

  const { error: insertError } = await supabase.from('messages').insert({
    room_id: roomId,
    user_id: user.id,
    content: aiText,
    is_ai: true,
    role: 'assistant',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
