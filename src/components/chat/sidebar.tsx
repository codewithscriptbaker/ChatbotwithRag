'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AppIconButton } from '@/components/common/app-button'
import { ButtonWithTooltip } from '@/components/common/button-with-tooltip'
import { ConfirmActionDialog } from '@/components/common/confirm-action-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { selectOnDeleteChat, useChatStore } from '@/store/chat-store'
import {
  Bot,
  ChevronDown,
  Compass,
  ExternalLink,
  FileText,
  MoreHorizontal,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  PanelLeftClose,
  Plus,
  Search,
  Sparkles,
  Trash2
} from 'lucide-react'

import { SearchChatsDialog } from './search-chats-dialog'
import { SidebarThemeToggle } from './sidebar-theme-toggle'
import { SidebarChatGroups } from './sidebar-chat-groups'
import { SidebarKnowledgeDialog, type KnowledgeFolder } from './sidebar-knowledge-dialog'
import { SidebarRenameDialog } from './sidebar-rename-dialog'
import { useSidebarChats } from './use-sidebar-chats'

const WORKSPACE_LABEL = process.env.NEXT_PUBLIC_WORKSPACE_LABEL || 'Workspace'
const WORKSPACE_URL = process.env.NEXT_PUBLIC_WORKSPACE_URL || '/workspace'
const IS_WORKSPACE_EXTERNAL = /^https?:\/\//i.test(WORKSPACE_URL)

function preloadPersonaPanel(): void {
  if (typeof window !== 'undefined') {
    void import('@/app/chat/persona-panel')
  }
}

export function SideBar(): React.JSX.Element {
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()
  const onDeleteChat = useChatStore(selectOnDeleteChat)

  const closeMobile = useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  const {
    currentChatId,
    isChatHydrated,
    chatList,
    pinnedChats,
    recentChats,
    renamingChatId,
    renameValue,
    trimmedRenameValue,
    isDeleteConfirmOpen,
    handleNewChat,
    handleOpenPersonaLibrary,
    handleSelectChat,
    startRename,
    setRenameValue,
    cancelRename,
    confirmRename,
    handleTogglePin,
    handleDeleteChat,
    handleDeleteConfirmOpenChange,
    confirmDeleteChat
  } = useSidebarChats({ closeMobile })

  const handleNewChatAndNavigate = useCallback(() => {
    const created = handleNewChat()
    if (created?.id) {
      const nextPath = `/chat/${created.id}`
      if (pathname !== nextPath) {
        router.push(nextPath)
      }
      return
    }
    if (pathname !== '/chat') {
      router.push('/chat')
    }
  }, [handleNewChat, pathname, router])

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false)
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false)
  const [isChatsMenuOpen, setIsChatsMenuOpen] = useState(true)
  const [openFolderIds, setOpenFolderIds] = useState<Record<string, boolean>>({})
  const [knowledgeFolders, setKnowledgeFolders] = useState<KnowledgeFolder[]>([])
  const [isFolderDeleteConfirmOpen, setIsFolderDeleteConfirmOpen] = useState(false)
  const [folderPendingDelete, setFolderPendingDelete] = useState<KnowledgeFolder | null>(null)

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const response = await fetch('/api/rag/folders', { cache: 'no-store' })
        if (!response.ok) return
        const payload = (await response.json()) as KnowledgeFolder[]
        setKnowledgeFolders(payload)
      } catch {
        // silent: keep sidebar usable even if backend is unavailable
      }
    }
    void loadFolders()
  }, [])

  const handleSelectChatAndNavigate = useCallback(
    (chat: Parameters<typeof handleSelectChat>[0]) => {
      handleSelectChat(chat)
      if (chat.folderId) {
        const folderRoute = `/chat/folder/${chat.folderId}?name=${encodeURIComponent(chat.folderName || chat.title)}`
        if (pathname !== `/chat/folder/${chat.folderId}`) {
          router.push(folderRoute)
        }
        return
      }

      const nextPath = `/chat/${chat.id}`
      if (pathname !== nextPath) {
        router.push(nextPath)
      }
    },
    [handleSelectChat, pathname, router]
  )

  const handleSearchSelectChat = useCallback(
    (chat: Parameters<typeof handleSelectChat>[0]) => {
      handleSelectChat(chat)
      closeMobile()
      if (chat.folderId) {
        const folderRoute = `/chat/folder/${chat.folderId}?name=${encodeURIComponent(chat.folderName || chat.title)}`
        if (pathname !== `/chat/folder/${chat.folderId}`) {
          router.push(folderRoute)
        }
        return
      }

      const nextPath = `/chat/${chat.id}`
      if (pathname !== nextPath) {
        router.push(nextPath)
      }
    },
    [closeMobile, handleSelectChat, pathname, router]
  )

  const handleFolderSaved = useCallback((folder: KnowledgeFolder) => {
    setKnowledgeFolders((prev) => [folder, ...prev.filter((f) => f.folder_id !== folder.folder_id)])
    setIsFolderMenuOpen(true)
    setOpenFolderIds((prev) => ({ ...prev, [folder.folder_id]: true }))
  }, [])

  const handleOpenFolderChat = useCallback(
    (folderId: string, folderName: string) => {
      closeMobile()
      router.push(`/chat/folder/${folderId}?name=${encodeURIComponent(folderName)}`)
    },
    [closeMobile, router]
  )

  const toggleFolderOpen = useCallback((folderId: string) => {
    setOpenFolderIds((prev) => ({ ...prev, [folderId]: !prev[folderId] }))
  }, [])

  const handleAskDeleteFolder = useCallback((folder: KnowledgeFolder) => {
    setFolderPendingDelete(folder)
    setIsFolderDeleteConfirmOpen(true)
  }, [])

  const handleFolderDeleteOpenChange = useCallback((open: boolean) => {
    setIsFolderDeleteConfirmOpen(open)
    if (!open) {
      setFolderPendingDelete(null)
    }
  }, [])

  const confirmDeleteFolder = useCallback(async () => {
    if (!folderPendingDelete) return

    try {
      const response = await fetch(`/api/rag/folders/${folderPendingDelete.folder_id}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string }
        throw new Error(payload.detail || 'Failed to delete folder')
      }

      setKnowledgeFolders((prev) =>
        prev.filter((folder) => folder.folder_id !== folderPendingDelete.folder_id)
      )
      setOpenFolderIds((prev) => {
        const next = { ...prev }
        delete next[folderPendingDelete.folder_id]
        return next
      })

      for (const chat of chatList.filter((item) => item.folderId === folderPendingDelete.folder_id)) {
        onDeleteChat(chat)
      }

      if (pathname === `/chat/folder/${folderPendingDelete.folder_id}`) {
        router.push('/chat')
      }
    } catch {
      // Keep sidebar usable even if delete fails.
    } finally {
      setIsFolderDeleteConfirmOpen(false)
      setFolderPendingDelete(null)
    }
  }, [chatList, folderPendingDelete, onDeleteChat, pathname, router])

  return (
    <>
      <Sidebar side="left" collapsible="offcanvas">
        <SidebarHeader className="px-2 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <Link
              href="/chat"
              className="group focus-visible:ring-ring/50 focus-visible:ring-offset-background flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span
                className="text-primary/70 group-hover:text-primary font-serif text-lg transition-colors duration-200"
                aria-hidden="true"
              >
                ✦
              </span>
              <span className="text-foreground group-hover:text-primary font-display text-lg font-medium tracking-tight transition-colors duration-200">
                Cortexa
              </span>
            </Link>
            <ButtonWithTooltip label="Close sidebar" placement="bottom">
              <AppIconButton
                type="button"
                variant="ghost"
                onClick={toggleSidebar}
                className="hover:bg-primary/5 rounded-lg transition-colors duration-200"
                aria-label="Close sidebar"
              >
                <PanelLeftClose className="size-4" aria-hidden="true" />
              </AppIconButton>
            </ButtonWithTooltip>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleNewChatAndNavigate}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium shadow-sm transition-colors duration-150"
            >
              <Plus className="size-4" aria-hidden="true" />
              New chat
            </button>
            <ButtonWithTooltip label="Search chats (Ctrl+K)" placement="bottom">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="border-border/60 hover:bg-muted/60 text-sidebar-foreground/70 hover:text-sidebar-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150"
                aria-label="Search chats"
              >
                <Search className="size-4" aria-hidden="true" />
              </button>
            </ButtonWithTooltip>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Quick links */}
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-9">
                    <Link
                      href="/notes"
                      className="text-sidebar-foreground/85 hover:text-sidebar-foreground rounded-md"
                    >
                      <Sparkles className="text-sidebar-foreground/60 size-4" aria-hidden="true" />
                      <span>Notes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleOpenPersonaLibrary}
                    onMouseEnter={preloadPersonaPanel}
                    onFocus={preloadPersonaPanel}
                    className="h-9"
                  >

                    <Bot className="text-sidebar-foreground/60 size-4" aria-hidden="true" />
                    <span>Persona Library</span>

                  </SidebarMenuButton>
                </SidebarMenuItem> */}
                
                
                <SidebarMenuItem>
                  {IS_WORKSPACE_EXTERNAL ? (
                    <SidebarMenuButton asChild className="h-9">
                      <a
                        href={WORKSPACE_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group text-sidebar-foreground/85 hover:text-sidebar-foreground focus-visible:ring-ring/60 rounded-md"
                        aria-label={`${WORKSPACE_LABEL} (opens in new tab)`}
                      >
                        <Compass className="text-sidebar-foreground/60 size-4" aria-hidden="true" />
                        <span className="flex-1">{WORKSPACE_LABEL}</span>
                        <ExternalLink
                          className="text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 size-3 transition-colors"
                          aria-hidden="true"
                        />
                      </a>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild className="h-9">
                      <Link
                        href={WORKSPACE_URL}
                        className="group text-sidebar-foreground/85 hover:text-sidebar-foreground focus-visible:ring-ring/60 rounded-md"
                        aria-label={WORKSPACE_LABEL}
                      >
                        <Compass className="text-sidebar-foreground/60 size-4" aria-hidden="true" />
                        <span className="flex-1">{WORKSPACE_LABEL}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Separator */}
          <div className="bg-sidebar-border/60 mx-3 h-px" />

          {/* Folders */}
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <div>
                    <div className="text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-9 items-center gap-2 rounded-md px-2 text-sm">
                      <button
                        type="button"
                        onClick={() => setIsFolderMenuOpen((prev) => !prev)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-expanded={isFolderMenuOpen}
                        aria-controls="folder-main-dropdown"
                      >
                        <FolderClosed
                          className={cn(
                            'text-sidebar-foreground/60 size-4 transition-opacity duration-200',
                            isFolderMenuOpen ? 'hidden' : 'block'
                          )}
                          aria-hidden="true"
                        />
                        <FolderOpen
                          className={cn(
                            'text-sidebar-foreground/60 size-4 transition-opacity duration-200',
                            isFolderMenuOpen ? 'block' : 'hidden'
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex-1">Folder</span>
                        <ChevronDown
                          className={cn(
                            'text-sidebar-foreground/50 size-3.5 transition-transform duration-200',
                            isFolderMenuOpen ? 'rotate-180' : ''
                          )}
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsKnowledgeOpen(true)}
                        className="hover:bg-sidebar-accent/80 text-sidebar-foreground/75 hover:text-sidebar-foreground flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
                        aria-label="Create folder"
                        title="Create folder"
                      >
                        <FolderPlus className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div
                      id="folder-main-dropdown"
                      className={cn(
                        'grid transition-all duration-300 ease-out',
                        isFolderMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="mt-1 space-y-1 pl-6">
                          <button
                            type="button"
                            onClick={() => setIsKnowledgeOpen(true)}
                            className="text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-left text-xs"
                          >
                            <FolderPlus className="size-3.5 shrink-0" aria-hidden="true" />
                            <span>Create Folder</span>
                          </button>

                          {knowledgeFolders.length === 0 ? (
                            <div className="text-sidebar-foreground/50 px-2 py-1 text-xs">No folders yet</div>
                          ) : (
                            knowledgeFolders.map((folder) => (
                              <div key={folder.folder_id}>
                                <div className="flex h-8 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleFolderOpen(folder.folder_id)}
                                    className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground flex size-6 shrink-0 items-center justify-center rounded-md transition-all duration-200"
                                    aria-label={
                                      openFolderIds[folder.folder_id]
                                        ? `Collapse ${folder.name}`
                                        : `Expand ${folder.name}`
                                    }
                                  >
                                    <ChevronDown
                                      className={cn(
                                        'size-3.5 transition-transform duration-200',
                                        openFolderIds[folder.folder_id] ? 'rotate-180' : '-rotate-90'
                                      )}
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFolderChat(folder.folder_id, folder.name)}
                                    className="text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs"
                                    title={folder.name}
                                  >
                                    <FolderClosed className="size-3.5 shrink-0" aria-hidden="true" />
                                    <span className="truncate">{folder.name}</span>
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
                                        aria-label={`Folder actions for ${folder.name}`}
                                      >
                                        <MoreHorizontal className="size-3.5" aria-hidden="true" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive cursor-pointer"
                                        onClick={() => handleAskDeleteFolder(folder)}
                                      >
                                        <Trash2 className="mr-2 size-4" aria-hidden="true" />
                                        Delete folder
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div
                                  className={cn(
                                    'grid transition-all duration-300 ease-out',
                                    openFolderIds[folder.folder_id]
                                      ? 'grid-rows-[1fr] opacity-100'
                                      : 'grid-rows-[0fr] opacity-0'
                                  )}
                                >
                                  <div className="min-h-0 overflow-hidden">
                                    <div className="mt-0.5 space-y-1 pl-8">
                                      {folder.files.length > 0 ? (
                                        folder.files.map((file, index) => (
                                          <div
                                            key={file.document_id ?? `${folder.folder_id}-${file.filename}-${index}`}
                                            className="text-sidebar-foreground/65 hover:text-sidebar-foreground flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px]"
                                            title={file.filename}
                                          >
                                            <FileText className="size-3 shrink-0" aria-hidden="true" />
                                            <span className="truncate">{file.filename}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-sidebar-foreground/45 px-2 py-1 text-[11px]">
                                          No files uploaded
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Chat history */}
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <button
                    type="button"
                    onClick={() => setIsChatsMenuOpen((prev) => !prev)}
                    className="text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm"
                    aria-expanded={isChatsMenuOpen}
                    aria-controls="chats-main-dropdown"
                  >
                    <span className="flex-1 text-left">Chats</span>
                    <ChevronDown
                      className={cn(
                        'text-sidebar-foreground/50 size-3.5 transition-transform duration-200',
                        isChatsMenuOpen ? 'rotate-180' : ''
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
            <div
              id="chats-main-dropdown"
              className={cn(
                'grid transition-all duration-300 ease-out',
                isChatsMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <SidebarChatGroups
                  isChatHydrated={isChatHydrated}
                  chatListLength={chatList.length}
                  currentChatId={currentChatId}
                  pinnedChats={pinnedChats}
                  recentChats={recentChats}
                  onSelectChat={handleSelectChatAndNavigate}
                  onStartRename={startRename}
                  onTogglePin={handleTogglePin}
                  onDeleteChat={handleDeleteChat}
                />
              </div>
            </div>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="bg-sidebar-border/60 mx-1 mb-1 h-px" />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarThemeToggle />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarRenameDialog
        open={renamingChatId !== null}
        renameValue={renameValue}
        trimmedRenameValue={trimmedRenameValue}
        onRenameValueChange={setRenameValue}
        onCancel={cancelRename}
        onConfirm={confirmRename}
      />
      <ConfirmActionDialog
        open={isDeleteConfirmOpen}
        onOpenChange={handleDeleteConfirmOpenChange}
        title="Delete this chat?"
        description="This removes its messages and cannot be undone."
        confirmLabel="Delete chat"
        confirmVariant="destructive"
        onConfirm={confirmDeleteChat}
      />
      <ConfirmActionDialog
        open={isFolderDeleteConfirmOpen}
        onOpenChange={handleFolderDeleteOpenChange}
        title="Delete this folder?"
        description="This deletes the folder, its uploaded files, and related folder chats."
        confirmLabel="Delete folder"
        confirmVariant="destructive"
        onConfirm={confirmDeleteFolder}
      />
      <SearchChatsDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelectChat={handleSearchSelectChat}
      />
      <SidebarKnowledgeDialog
        open={isKnowledgeOpen}
        onOpenChange={setIsKnowledgeOpen}
        onSaved={handleFolderSaved}
      />
    </>
  )
}
