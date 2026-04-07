import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Globe, ArrowLeft, Eye, ThumbsUp, ChevronRight } from 'lucide-react'
import { rootWordsApi } from '@/lib/api/rootWords'
import { votesApi, bookmarksApi } from '@/lib/api/reference'
import { RootWordCard, RootWordCardSkeleton } from '@/components/rootwords/RootWordCard'
import { SortSelect, Pagination, EmptyState } from '@/components/ui'
import { useT, useDebounce, useCopyToClipboard } from '@/hooks'
import { useLangStore } from '@/store'
import { useAuth } from '@/hooks'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

// ─── Root Words List Page ─────────────────────────────────
export function RootWordsPage() {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [sort, setSort] = useState<string>(searchParams.get('sort') ?? 'recent')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (sort !== 'recent') params.set('sort', sort)
    if (page > 1) params.set('page', String(page))
    setSearchParams(params, { replace: true })
  }, [search, sort, page, setSearchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['root_words', { search: debouncedSearch, sort, page }],
    queryFn: () => rootWordsApi.list({ search: debouncedSearch, sort: sort as any, page, limit: 18 }),
  })

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'alphabetical', label: 'A → Z' },
  ]

  useEffect(() => { document.title = 'Root Words | Mozhi' }, [])

  return (
    <div className="page-container py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-amber-600 mb-2">
          <Globe className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Etymology</span>
        </div>
        <h1 className="font-display text-4xl font-bold text-ink-900">{t('roots.title')}</h1>
        <p className="font-tamil text-ink-500 mt-1">தமிழ் மூல சொற்கள் மற்றும் உலக மொழிகளில் தாக்கம்</p>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search root words..."
          className="input flex-1"
        />
        <SortSelect options={sortOptions} value={sort} onChange={(v) => { setSort(v); setPage(1) }} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <RootWordCardSkeleton key={i} />)}
        </div>
      ) : !data?.data.length ? (
        <EmptyState
          icon={<Globe className="w-12 h-12" />}
          title="No root words found"
          description="Try adjusting your search."
        ></EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {data.data.map((rw) => <RootWordCard key={rw.id} rootWord={rw} />)}
          </div>
          <Pagination page={page} totalPages={data.total_pages} onChange={setPage} />
        </>
      )}
    </div>
  )
}

// ─── Root Word Detail Page ────────────────────────────────
const LANG_FLAGS: Record<string, string> = {
  en: '🇬🇧', ta: '🇮🇳', sa: '🕉️', te: '🇮🇳', kn: '🇮🇳', ml: '🇮🇳',
  pt: '🇵🇹', fr: '🇫🇷', ms: '🇲🇾', id: '🇮🇩', si: '🇱🇰', th: '🇹🇭',
  el: '🇬🇷', la: '🏛️',
}

export function RootWordDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const t = useT()
  const { locale } = useLangStore()
  const { isAuthenticated } = useAuth()
  const { copy, copied } = useCopyToClipboard()
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const { data: rootWord, isLoading } = useQuery({
    queryKey: ['root_word', slug],
    queryFn: () => rootWordsApi.getBySlug(slug!),
    enabled: !!slug,
  })

  useEffect(() => {
    if (rootWord?.id) {
      rootWordsApi.incrementView(rootWord.id)
    }
  }, [rootWord?.id])

  useEffect(() => {
    if (!rootWord?.id || !isAuthenticated) return
    votesApi.getUserVote('root_word', rootWord.id).then(setUserVote)
    bookmarksApi.isBookmarked('root_word', rootWord.id).then(setIsBookmarked)
  }, [rootWord?.id, isAuthenticated])

  useEffect(() => {
    if (rootWord) document.title = `${rootWord.root_ta} (மூல சொல்) | Mozhi`
  }, [rootWord])

  const handleVote = async (value: 1 | -1) => {
    if (!isAuthenticated) { toast.error('Sign in to vote'); return }
    if (!rootWord) return
    const prev = userVote
    setUserVote(prev === value ? null : value)
    try { await votesApi.vote('root_word', rootWord.id, value) }
    catch { setUserVote(prev) }
  }

  const handleBookmark = async () => {
    if (!isAuthenticated || !rootWord) return
    const next = await bookmarksApi.toggle('root_word', rootWord.id)
    setIsBookmarked(next)
    toast.success(next ? 'Bookmarked!' : 'Removed')
  }

  if (isLoading) return <div className="page-container py-10"><div className="skeleton h-96 w-full" /></div>
  if (!rootWord) return <div className="page-container py-20 text-center text-ink-500">Root word not found.</div>

  // Group derived words by language
  const byLanguage = (rootWord.derived_words ?? []).reduce<Record<string, typeof rootWord.derived_words>>((acc, dw) => {
    const key = dw.language_name
    if (!acc[key]) acc[key] = []
    acc[key].push(dw)
    return acc
  }, {})

  return (
    <div className="page-container py-10 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink-500 mb-6">
        <Link to="/roots" className="hover:text-clay-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> {t('roots.title')}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span>{rootWord.root_transliteration}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <div className="card p-8">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium mb-4">
              <Globe className="w-3.5 h-3.5" /> Tamil Root Word
            </div>

            <h1 className="font-tamil text-5xl font-bold text-clay-800 leading-tight">
              {rootWord.root_ta}
            </h1>
            <p className="text-xl text-ink-500 italic mt-1">{rootWord.root_transliteration}</p>

            <div className="mt-5 space-y-2">
              <p className="text-ink-800"><strong>English:</strong> {rootWord.root_meaning_en}</p>
              <p className="font-tamil text-ink-700"><strong>தமிழ்:</strong> {rootWord.root_meaning_ta}</p>
              {rootWord.historical_period && (
                <p className="text-sm text-ink-500">
                  <strong>{t('roots.period')}:</strong> {rootWord.historical_period}
                </p>
              )}
            </div>
          </div>

          {/* Etymology */}
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold text-ink-900 mb-4">{t('roots.etymology')}</h2>
            <p className="text-ink-700 leading-relaxed">{rootWord.etymology_en}</p>
            {rootWord.etymology_ta && (
              <p className="font-tamil text-ink-600 leading-relaxed mt-3 border-t border-clay-100 pt-3">
                {rootWord.etymology_ta}
              </p>
            )}
          </div>

          {/* Derived words by language */}
          {Object.entries(byLanguage).length > 0 && (
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold text-ink-900 mb-5">{t('roots.derived')}</h2>
              <div className="space-y-6">
                {Object.entries(byLanguage).map(([langName, words]) => {
                  const iso = words[0]?.language_iso
                  return (
                    <div key={langName}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{LANG_FLAGS[iso] ?? '🌐'}</span>
                        <h3 className="font-semibold text-ink-800">{langName}</h3>
                        <span className="text-xs text-ink-400 uppercase">({iso})</span>
                      </div>
                      <div className="space-y-3 ml-8">
                        {words.map((dw, i) => (
                          <div key={i} className="border-l-2 border-clay-200 pl-4">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-ink-900 text-lg">{dw.word}</span>
                              <span className="text-sm text-ink-500">— {dw.meaning}</span>
                            </div>
                            {dw.example && <p className="text-sm text-ink-600 italic mt-0.5">"{dw.example}"</p>}
                            {dw.notes && <p className="text-xs text-ink-400 mt-0.5">{dw.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Linguistic notes */}
          {rootWord.linguistic_notes && (
            <div className="card p-6 bg-amber-50 border-amber-200">
              <h2 className="font-display text-xl font-bold text-ink-900 mb-3">{t('roots.linguistic_notes')}</h2>
              <p className="text-ink-700 leading-relaxed">{rootWord.linguistic_notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="card p-4">
            <button
              onClick={() => handleVote(1)}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all mb-2',
                userVote === 1 ? 'bg-clay-600 border-clay-600 text-white' : 'border-clay-200 text-ink-700 hover:bg-clay-50'
              )}
            >
              <ThumbsUp className="w-4 h-4" /> {rootWord.vote_count} votes
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleBookmark}
                className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm transition-all',
                  isBookmarked ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-clay-200 text-ink-700 hover:bg-clay-50'
                )}
              >
                {isBookmarked ? '★' : '☆'} Save
              </button>
              <button
                onClick={() => { copy(window.location.href); toast.success('Copied!') }}
                className="flex items-center justify-center px-3 py-2 rounded-xl border border-clay-200 text-ink-700 hover:bg-clay-50 text-sm"
              >
                {copied ? '✓' : '⤴'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm text-ink-600 mb-2">
              <Eye className="w-4 h-4 text-clay-400" />
              <span>{rootWord.view_count.toLocaleString()} views</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Object.keys(byLanguage).map((lang) => (
                <span key={lang} className="badge bg-clay-100 text-clay-700 text-xs">{lang}</span>
              ))}
            </div>
            <p className="text-xs text-ink-400 mt-3 pt-3 border-t border-clay-100">
              {rootWord.derived_words?.length ?? 0} derived words across {Object.keys(byLanguage).length} languages
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
