import { generateId } from '@/lib/id'
import { create } from 'zustand'

const NOTES_STORAGE_KEY = 'notes_items_v1'

export type NoteItem = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

type SaveNoteInput = {
  id?: string
  title: string
  content: string
}

type NotesState = {
  notes: NoteItem[]
  isHydrated: boolean
  hydrate: () => void
  getNoteById: (id: string) => NoteItem | undefined
  saveNote: (input: SaveNoteInput) => string
  deleteNote: (id: string) => void
}

function sortByRecent(notes: NoteItem[]): NoteItem[] {
  return [...notes].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

function loadPersistedNotes(): NoteItem[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is NoteItem => {
      return (
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.content === 'string' &&
        typeof item.createdAt === 'string' &&
        typeof item.updatedAt === 'string'
      )
    })
  } catch {
    return []
  }
}

function persistNotes(notes: NoteItem[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  isHydrated: false,
  hydrate: () => {
    if (get().isHydrated) return
    const notes = sortByRecent(loadPersistedNotes())
    set({ notes, isHydrated: true })
  },
  getNoteById: (id) => get().notes.find((note) => note.id === id),
  saveNote: ({ id, title, content }) => {
    const nowIso = new Date().toISOString()
    const normalizedTitle = title.trim() || 'Untitled note'
    const normalizedContent = content
    let savedId = id

    set((state) => {
      let nextNotes: NoteItem[]

      if (savedId) {
        const exists = state.notes.some((note) => note.id === savedId)
        if (exists) {
          nextNotes = state.notes.map((note) =>
            note.id === savedId
              ? { ...note, title: normalizedTitle, content: normalizedContent, updatedAt: nowIso }
              : note
          )
        } else {
          const created: NoteItem = {
            id: savedId,
            title: normalizedTitle,
            content: normalizedContent,
            createdAt: nowIso,
            updatedAt: nowIso
          }
          nextNotes = [created, ...state.notes]
        }
      } else {
        savedId = generateId()
        const created: NoteItem = {
          id: savedId,
          title: normalizedTitle,
          content: normalizedContent,
          createdAt: nowIso,
          updatedAt: nowIso
        }
        nextNotes = [created, ...state.notes]
      }

      const sorted = sortByRecent(nextNotes)
      persistNotes(sorted)
      return { notes: sorted }
    })

    return savedId as string
  },
  deleteNote: (id) => {
    set((state) => {
      const next = state.notes.filter((note) => note.id !== id)
      persistNotes(next)
      return { notes: next }
    })
  }
}))
