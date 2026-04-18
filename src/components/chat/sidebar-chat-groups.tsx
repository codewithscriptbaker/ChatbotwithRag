import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu
} from '@/components/ui/sidebar'
import { MessageSquare, Pin } from 'lucide-react'

import { SidebarChatItem } from './sidebar-chat-item'
import type { SidebarChatListItem } from './use-sidebar-chats'

type SidebarChatGroupsProps = {
  isChatHydrated: boolean
  chatListLength: number
  currentChatId: string | undefined
  pinnedChats: SidebarChatListItem[]
  recentChats: SidebarChatListItem[]
  onSelectChat: (chat: SidebarChatListItem) => void
  onStartRename: (chatId: string, currentTitle: string) => void
  onTogglePin: (chatId: string, nextPinned: boolean) => void
  onDeleteChat: (chat: SidebarChatListItem) => void
}

export function SidebarChatGroups({
  isChatHydrated,
  chatListLength,
  currentChatId,
  pinnedChats,
  recentChats,
  onSelectChat,
  onStartRename,
  onTogglePin,
  onDeleteChat
}: SidebarChatGroupsProps): React.JSX.Element {
  if (chatListLength === 0 && isChatHydrated) {
    return (
      <Empty className="items-start gap-4 border-0 px-2 py-12 text-left">
        <EmptyHeader className="items-start text-left">
          <EmptyMedia
            variant="icon"
            className="border-border/40 relative mb-0 size-14 rounded-2xl border shadow-sm [&_svg:not([class*='size-'])]:size-6"
          >
            <MessageSquare className="text-muted-foreground/60 size-6" aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle className="text-sidebar-foreground/70 text-sm font-normal">
            No conversations yet
          </EmptyTitle>
          <EmptyDescription className="text-sidebar-foreground/45 text-xs">
            Start a new chat above
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      {pinnedChats.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 flex items-center gap-1.5 px-2 text-[11px] font-semibold tracking-wider uppercase">
            <Pin className="size-3" aria-hidden="true" />
            Pinned
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pinnedChats.map((chat) => (
                <SidebarChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  onSelect={onSelectChat}
                  onStartRename={onStartRename}
                  onTogglePin={onTogglePin}
                  onDelete={onDeleteChat}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
      {recentChats.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 px-2 text-[11px] font-semibold tracking-wider uppercase">
            Recent
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentChats.map((chat) => (
                <SidebarChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  onSelect={onSelectChat}
                  onStartRename={onStartRename}
                  onTogglePin={onTogglePin}
                  onDelete={onDeleteChat}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  )
}
