import FolderChatPageClient from './folder-chat-page-client'

type FolderChatPageProps = {
  params: Promise<{ folderId: string }>
}

export default async function FolderChatPage({
  params
}: FolderChatPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params
  const { folderId } = resolvedParams
  return <FolderChatPageClient folderId={folderId} />
}

