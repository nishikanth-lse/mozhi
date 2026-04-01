import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale, Profile, Region, Tag, Language } from '@/types'

// ─── Language Store ─────────────────────────────────────────
interface LangState {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === 'en' ? 'ta' : 'en' }),
    }),
    { name: 'mozhi-locale' }
  )
)

// ─── Auth Store ────────────────────────────────────────────
interface AuthState {
  profile: Profile | null
  isLoading: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  isAdmin: () => boolean
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  profile: null,
  isLoading: true,
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  isAdmin: () => get().profile?.role === 'admin',
  isAuthenticated: () => get().profile !== null,
}))

// ─── Reference Data Store ──────────────────────────────────
interface RefDataState {
  regions: Region[]
  tags: Tag[]
  languages: Language[]
  setRegions: (regions: Region[]) => void
  setTags: (tags: Tag[]) => void
  setLanguages: (languages: Language[]) => void
  getTagById: (id: string) => Tag | undefined
  getRegionById: (id: string) => Region | undefined
  getLanguageById: (id: string) => Language | undefined
}

export const useRefDataStore = create<RefDataState>()((set, get) => ({
  regions: [],
  tags: [],
  languages: [],
  setRegions: (regions) => set({ regions }),
  setTags: (tags) => set({ tags }),
  setLanguages: (languages) => set({ languages }),
  getTagById: (id) => get().tags.find((t) => t.id === id),
  getRegionById: (id) => get().regions.find((r) => r.id === id),
  getLanguageById: (id) => get().languages.find((l) => l.id === id),
}))

// ─── Search Store ──────────────────────────────────────────
interface SearchState {
  query: string
  isOpen: boolean
  history: string[]
  setQuery: (q: string) => void
  setOpen: (open: boolean) => void
  addToHistory: (q: string) => void
  clearHistory: () => void
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      query: '',
      isOpen: false,
      history: [],
      setQuery: (query) => set({ query }),
      setOpen: (isOpen) => set({ isOpen }),
      addToHistory: (q) => {
        const history = [q, ...get().history.filter((h) => h !== q)].slice(0, 10)
        set({ history })
      },
      clearHistory: () => set({ history: [] }),
    }),
    { name: 'mozhi-search-history' }
  )
)

// ─── Admin Store ───────────────────────────────────────────
interface AdminState {
  activeTab: string
  selectedIds: string[]
  setActiveTab: (tab: string) => void
  setSelectedIds: (ids: string[]) => void
  toggleSelected: (id: string) => void
  clearSelected: () => void
}

export const useAdminStore = create<AdminState>()((set, get) => ({
  activeTab: 'words',
  selectedIds: [],
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  toggleSelected: (id) => {
    const current = get().selectedIds
    set({
      selectedIds: current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    })
  },
  clearSelected: () => set({ selectedIds: [] }),
}))
