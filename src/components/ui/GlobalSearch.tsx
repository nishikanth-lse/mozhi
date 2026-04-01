import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { useSearchStore } from '@/store'
import { useDebounce } from '@/hooks'
import type { Word, RootWord } from '@/types'

interface SearchResult {
  type: 'word' | 'root_word'
  id: string
  slug: string
  primary: string
  secondary: string
  tertiary?: string
}

export function GlobalSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { query, setQuery, isOpen, setOpen, history, addToHistory } = useSearchStore()
  const debouncedQuery = useDebounce(query, 250)

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setOpen])

  // Search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      return
    }

    const search = async () => {
      setLoading(true)
      try {
        const [wordsRes, rootsRes] = await Promise.all([
          supabase
            .from('words')
            .select('id, slug, word_ta, word_transliteration, meaning_en, region:regions(name_en)')
            .eq('status', 'published')
            .or(`word_ta.ilike.%${debouncedQuery}%,word_transliteration.ilike.%${debouncedQuery}%,meaning_en.ilike.%${debouncedQuery}%`)
            .limit(6),
          supabase
            .from('root_words')
            .select('id, slug, root_ta, root_transliteration, root_meaning_en')
            .eq('status', 'published')
            .or(`root_ta.ilike.%${debouncedQuery}%,root_transliteration.ilike.%${debouncedQuery}%,root_meaning_en.ilike.%${debouncedQuery}%`)
            .limit(4),
        ])

        const wordResults: SearchResult[] = (wordsRes.data ?? []).map((w: any) => ({
          type: 'word' as const,
          id: w.id,
          slug: w.slug,
          primary: w.word_ta,
          secondary: w.word_transliteration,
          tertiary: w.meaning_en,
        }))

        const rootResults: SearchResult[] = (rootsRes.data ?? []).map((r: any) => ({
          type: 'root_word' as const,
          id: r.id,
          slug: r.slug,
          primary: r.root_ta,
          secondary: r.root_transliteration,
          tertiary: r.root_meaning_en,
        }))

        // Fuzzy re-rank
        const allResults = [...wordResults, ...rootResults]
        const fuse = new Fuse(allResults, {
          keys: ['primary', 'secondary', 'tertiary'],
          threshold: 0.4,
        })
        const fuzzyResults = fuse.search(debouncedQuery).map((r) => r.item)
        setResults(fuzzyResults.length > 0 ? fuzzyResults : allResults)
      } finally {
        setLoading(false)
      }
    }

    search()
  }, [debouncedQuery])

  const handleSelect = useCallback((result: SearchResult) => {
    addToHistory(query)
    setOpen(false)
    setQuery('')
    navigate(result.type === 'word' ? `/word/${result.slug}` : `/root/${result.slug}`)
  }, [query, addToHistory, setOpen, setQuery, navigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      handleSelect(results[activeIndex])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-clay-200 overflow-hidden animate-fade-up">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-clay-100">
          <Search className="w-5 h-5 text-ink-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1) }}
            onKeyDown={handleKeyDown}
            placeholder="Search words, meanings, regions..."
            className="flex-1 text-base outline-none text-ink-900 placeholder:text-ink-400 bg-transparent"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-ink-400 hover:text-ink-700">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-xs text-ink-400 bg-clay-100 px-2 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-ink-500 text-sm">
              No results for <span className="font-semibold">"{query}"</span>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                    activeIndex === index ? 'bg-clay-100' : 'hover:bg-clay-50'
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                    result.type === 'word' ? 'bg-clay-100 text-clay-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {result.type === 'word' ? 'W' : 'R'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-tamil text-base font-bold text-clay-800">{result.primary}</span>
                      <span className="text-xs text-ink-500 italic">{result.secondary}</span>
                    </div>
                    {result.tertiary && (
                      <p className="text-xs text-ink-500 truncate">{result.tertiary}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-300 flex-shrink-0" />
                </button>
              ))}

              {/* See all results */}
              <button
                onClick={() => {
                  addToHistory(query)
                  setOpen(false)
                  navigate(`/search?q=${encodeURIComponent(query)}`)
                }}
                className="w-full flex items-center justify-center gap-2 mt-1 px-3 py-2 text-sm text-clay-600 hover:bg-clay-50 rounded-xl transition-colors"
              >
                See all results for "{query}"
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* History */}
          {!query && history.length > 0 && (
            <div className="p-3">
              <p className="text-xs font-medium text-ink-400 px-2 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recent searches
              </p>
              {history.slice(0, 5).map((h) => (
                <button
                  key={h}
                  onClick={() => setQuery(h)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-clay-50 rounded-xl text-left transition-colors"
                >
                  <Clock className="w-4 h-4 text-ink-400" />
                  {h}
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!query && history.length === 0 && (
            <div className="p-6 text-center text-ink-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Start typing to search Tamil words</p>
              <p className="font-tamil mt-1 text-xs">தமிழ் சொற்களை தேடுங்கள்</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Search trigger button ─────────────────────────────────
export function SearchTrigger() {
  const { setOpen } = useSearchStore()
  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2.5 w-full max-w-lg rounded-xl border border-clay-200 bg-white text-ink-400 text-sm hover:border-clay-400 transition-colors shadow-sm"
    >
      <Search className="w-4 h-4" />
      <span>Search words, meanings, regions...</span>
      <kbd className="ml-auto hidden sm:flex items-center gap-0.5 text-xs bg-clay-100 px-1.5 py-0.5 rounded">
        ⌘K
      </kbd>
    </button>
  )
}
