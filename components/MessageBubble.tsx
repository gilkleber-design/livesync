type Props = {
  content: string
  isAI: boolean
  isOwn: boolean
  createdAt: string
}

export default function MessageBubble({ content, isAI, isOwn, createdAt }: Props) {
  const time = new Date(createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (isAI) {
    return (
      <div className="flex items-start gap-3 px-4 py-1.5">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          AI
        </div>
        <div className="max-w-[75%]">
          <div className="bg-purple-50 border border-purple-200 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-1">{time}</p>
        </div>
      </div>
    )
  }

  if (isOwn) {
    return (
      <div className="flex items-start gap-3 px-4 py-1.5 justify-end">
        <div className="max-w-[75%]">
          <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
          <p className="text-xs text-gray-400 mt-1 mr-1 text-right">{time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-1.5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold shadow-sm">
        U
      </div>
      <div className="max-w-[75%]">
        <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-1">{time}</p>
      </div>
    </div>
  )
}
