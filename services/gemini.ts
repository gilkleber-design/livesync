import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY não está definida nas variáveis de ambiente')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export type MessageContext = {
  role: 'user' | 'model'
  content: string
}

export async function getAIResponse(messages: MessageContext[]): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }))

  const chat = model.startChat({ history })

  const lastMessage = messages[messages.length - 1]?.content ?? 'Olá!'
  const result = await chat.sendMessage(lastMessage)
  return result.response.text()
}
