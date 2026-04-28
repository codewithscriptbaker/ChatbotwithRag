import ChatPageClient from '../chat-page-client'

type ChatByIdPageProps = {
  params: Promise<{ chatId: string }>
}

export default async function ChatByIdPage({
  params
}: ChatByIdPageProps): Promise<React.JSX.Element> {
  const { chatId } = await params
  return <ChatPageClient chatId={chatId} />
}
