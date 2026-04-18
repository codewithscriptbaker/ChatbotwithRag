'use client'

import { SideBar } from '@/components/chat/sidebar'
import { Header } from '@/components/header/header'
import { SidebarProvider } from '@/components/ui/sidebar'
import { FolderChat } from '@/components/chat/folder-chat'

type FolderChatPageClientProps = {
  folderId: string
}

export default function FolderChatPageClient({
  folderId
}: FolderChatPageClientProps): React.JSX.Element {
  return (
    <SidebarProvider className="reduced-motion-sidebar min-h-0 flex-1">
      <SideBar />
      <div
        data-slot="sidebar-inset"
        className="bg-background relative flex w-full min-h-0 flex-1 flex-col overflow-hidden md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2"
      >
        <Header />
        <FolderChat folderId={folderId} />
      </div>
    </SidebarProvider>
  )
}

