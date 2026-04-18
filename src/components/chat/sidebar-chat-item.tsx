import { memo, useCallback, useMemo } from 'react'
import { ButtonWithTooltip } from '@/components/common/button-with-tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { resolveChatTitle } from '@/lib/chat-utils'
import { cn } from '@/lib/utils'
import { MessageSquare, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'

import type { SidebarChatListItem } from './use-sidebar-chats'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(diffMs / 86_400_000)
  if (days < 7) return `${days}d`
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type SidebarChatItemProps = {
  chat: SidebarChatListItem
  isActive: boolean
  onSelect: (chat: SidebarChatListItem) => void
  onStartRename: (chatId: string, currentTitle: string) => void
  onTogglePin: (chatId: string, nextPinned: boolean) => void
  onDelete: (chat: SidebarChatListItem) => void
}

export const SidebarChatItem = memo(function SidebarChatItem({
  chat,
  isActive,
  onSelect,
  onStartRename,
  onTogglePin,
  onDelete
}: SidebarChatItemProps): React.JSX.Element {
  const chatTitle = resolveChatTitle(chat)
  const isPinned = chat.pinned === true
  const timeLabel = useMemo(() => formatRelativeTime(chat.updatedAt), [chat.updatedAt])

  const handleSelect = useCallback(() => {
    onSelect(chat)
  }, [chat, onSelect])

  const handleRenameMenuClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation()
      onStartRename(chat.id, chatTitle)
    },
    [chat.id, chatTitle, onStartRename]
  )

  const handlePinMenuClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation()
      onTogglePin(chat.id, !isPinned)
    },
    [chat.id, isPinned, onTogglePin]
  )

  const handleDeleteMenuClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation()
      onDelete(chat)
    },
    [chat, onDelete]
  )

  return (
    <SidebarMenuItem className="[contain-intrinsic-size:auto_44px] [content-visibility:auto]">
      <ButtonWithTooltip
        placement="right"
        label={<p className="text-pretty break-words">{chatTitle}</p>}
      >
        <SidebarMenuButton
          isActive={isActive}
          onClick={handleSelect}
          className={cn(
            'group/chat-item relative h-11 pr-10 md:h-9',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'hover:bg-sidebar-accent/50'
          )}
        >
          {isActive && (
            <span
              className="bg-primary absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r-full"
              aria-hidden="true"
            />
          )}
          <MessageSquare
            className={cn(
              'size-3.5 shrink-0',
              isActive ? 'text-primary' : 'text-sidebar-foreground/40'
            )}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{chatTitle}</span>
          <span
            className={cn(
              'text-[10px] tabular-nums shrink-0 transition-opacity',
              isActive ? 'text-sidebar-foreground/50' : 'text-sidebar-foreground/35',
              'group-hover/chat-item:opacity-0'
            )}
          >
            {timeLabel}
          </span>
        </SidebarMenuButton>
      </ButtonWithTooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            showOnHover
            className="!top-0 !right-0 !size-11 rounded-lg md:!size-9"
            aria-label="Chat options"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer" onClick={handleRenameMenuClick}>
              <Pencil className="mr-2 size-4" aria-hidden="true" />
              Rename...
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handlePinMenuClick}>
              {isPinned ? (
                <PinOff className="mr-2 size-4" aria-hidden="true" />
              ) : (
                <Pin className="mr-2 size-4" aria-hidden="true" />
              )}
              {isPinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={handleDeleteMenuClick}
            >
              <Trash2 className="mr-2 size-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
})
