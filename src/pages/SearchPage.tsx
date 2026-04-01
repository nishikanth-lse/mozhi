import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, BookOpen, Globe } from 'lucide-react'
import { wordsApi } from '@/lib/api/words'
import { rootWordsApi } from '@/lib/api/rootWords'
import { WordCard, WordCardSkeleton } from '@/components/vernacular/WordCard'
import { RootWordCard } from '@/components/rootwords/RootWordCard'
import { useDebounce } from '@/hooks'
import { clsx } from 'clsx'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [tab, setTab] = useState<'words' | 'roots'>('words')
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (tab !== 'words') params.set('tab', tab)
    setSearchParams(params, { replace: true })
  }, [query, tab, setSearchParams])

  useEffect(() => {
    document.title = query ? `"${query}" — Search | Mozhi` : 'Search | Mozhi'
  }, [query])

  const { data: wordsData, isLoading: loadingWords } = useQuery({
    queryKey: ['search', 'words', debouncedQuery],
    queryFn: () => wordsApi.list({ search: debouncedQuery, limit: 20 }),
    enabled: debouncedQuery.length >= 2,
  })

  const { data: rootsData, isLoading: loadingRoots } = useQuery({
    queryKey: ['search', 'roots', debouncedQuery],
    queryFn: () => rootWordsApi.list({ search: debouncedQuery, limit: 12 }),
    enabled: debouncedQuery.length >= 2,
  })

  const totalResults = (wordsData?.count ?? 0) + (rootsData?.count ?? 0)

  return (
    <div className="page-container py-10 max-w-5xl">
      <h1 className="font-display text-3xl font-bold text-ink-900 mb-6">Search</h1>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words, meanings, etymology..."
          className="input pl-12 py-3 text-base w-full"
          autoFocus
        />
      </div>

      {debouncedQuery.length >= 2 && (
        <>
          <div className="flex items-center gap-2 mb-6">
            <p className="text-sm text-ink-500">
              {totalResults.toLocaleString()} results for "<strong>{debouncedQuery}</strong>"
            </p>
            <div className="flex gap-2 ml-auto">
              {[
                { key: 'words', label: 'Words', icon: BookOpen, count: wordsData?.count },
                { key: 'roots', label: 'Root Words', icon: Globe, count: rootsData?.count },
              ].map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key as any)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    tab === key ? 'bg-clay-600 text-white' : 'bg-clay-100 text-clay-700 hover:bg-clay-200'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {count !== undefined && <span className="badge bg-white/20 text-current text-xs">{count}</span>}
                </button>
              ))}
            </div>
          </div>

          {tab === 'words' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingWords
                ? [...Array(6)].map((_, i) => <WordCardSkeleton key={i} />)
                : (wordsData?.data ?? []).map((word) => <WordCard key={word.id} word={word} />)
              }
              {!loadingWords && !wordsData?.data.length && (
                <div className="col-span-2 text-center py-12 text-ink-500">No words found.</div>
              )}
            </div>
          )}

          {tab === 'roots' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingRoots
                ? [...Array(6)].map((_, i) => <div key={i} className="skeleton h-40" />)
                : (rootsData?.data ?? []).map((rw) => <RootWordCard key={rw.id} rootWord={rw} />)
              }
              {!loadingRoots && !rootsData?.data.length && (
                <div className="col-span-3 text-center py-12 text-ink-500">No root words found.</div>
              )}
            </div>
          )}
        </>
      )}

      {debouncedQuery.length < 2 && (
        <div className="text-center py-16">
          <SearchIcon className="w-12 h-12 mx-auto mb-4 text-clay-200" />
          <p className="text-ink-500 text-lg">Start typing to search the Tamil word archive</p>
          <p className="font-tamil text-clay-400 mt-2">தமிழ் சொற்களை தேடுங்கள்</p>
        </div>
      )}
    </div>
  )
}
