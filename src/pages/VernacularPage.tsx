import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Filter, X } from 'lucide-react'
import { wordsApi } from '@/lib/api/words'
import { WordCard, WordCardSkeleton } from '@/components/vernacular/WordCard'
import { MultiSelect, SortSelect, Pagination, EmptyState } from '@/components/ui'
import { useT, useDebounce } from '@/hooks'
import { useRefDataStore, useLangStore } from '@/store'
import type { WordFilters, WordType } from '@/types'
import { clsx } from 'clsx'

const WORD_TYPES: WordType[] = ['noun', 'verb', 'adjective', 'adverb', 'idiom', 'phrase', 'exclamation', 'other']

export function VernacularPage() {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const { regions, tags } = useRefDataStore()
  const { locale } = useLangStore()
  const [showFilters, setShowFilters] = useState(false)

  // Parse filters from URL
  const [filters, setFilters] = useState<WordFilters>({
    search: searchParams.get('q') ?? '',
    region_ids: searchParams.get('region') ? [searchParams.get('region')!] : [],
    tag_ids: searchParams.getAll('tag'),
    word_type: (searchParams.get('type') as WordType) || undefined,
    sort: (searchParams.get('sort') as WordFilters['sort']) || 'recent',
    page: Number(searchParams.get('page')) || 1,
    limit: 20,
  })

  const debouncedSearch = useDebounce(filters.search, 350)

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('q', filters.search)
    if (filters.region_ids?.length) filters.region_ids.forEach((r) => params.append('region', r))
    if (filters.tag_ids?.length) filters.tag_ids.forEach((t) => params.append('tag', t))
    if (filters.word_type) params.set('type', filters.word_type)
    if (filters.sort !== 'recent') params.set('sort', filters.sort!)
    if (filters.page && filters.page > 1) params.set('page', String(filters.page))
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams])

  const activeFilters = {
    ...filters,
    search: debouncedSearch,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['words', activeFilters],
    queryFn: () => wordsApi.list(activeFilters),
  })

  const updateFilter = <K extends keyof WordFilters>(key: K, value: WordFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ sort: 'recent', page: 1, limit: 20 })
  }

  const activeFilterCount = [
    filters.search,
    ...(filters.region_ids ?? []),
    ...(filters.tag_ids ?? []),
    filters.word_type,
  ].filter(Boolean).length

  const sortOptions = [
    { value: 'recent', label: t('vernacular.sort.recent') },
    { value: 'popular', label: t('vernacular.sort.popular') },
    { value: 'alphabetical', label: t('vernacular.sort.alpha') },
    { value: 'votes', label: t('vernacular.sort.votes') },
  ]

  useEffect(() => {
    document.title = 'Vernacular Library | Mozhi'
  }, [])

  return (
    <div className="page-container py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-clay-600 mb-2">
          <BookOpen className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Library</span>
        </div>
        <h1 className="font-display text-4xl font-bold text-ink-900">{t('vernacular.title')}</h1>
        <p className="font-tamil text-ink-500 mt-1">{t('vernacular.subtitle')}</p>
        {data && (
          <p className="text-sm text-ink-500 mt-2">
            {data.count.toLocaleString()} words found
          </p>
        )}
      </div>

      {/* Search + filters bar */}
      <div className="bg-white rounded-2xl border border-clay-200 p-4 mb-6 shadow-sm">
        {/* Search */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder={t('common.search')}
            className="input flex-1"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'btn border border-clay-200',
              showFilters || activeFilterCount > 0 ? 'bg-clay-100 text-clay-700' : 'bg-white text-ink-700 hover:bg-clay-50'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="badge bg-clay-600 text-white text-xs ml-1">{activeFilterCount}</span>
            )}
          </button>
          <SortSelect options={sortOptions} value={filters.sort!} onChange={(v) => updateFilter('sort', v as WordFilters['sort'])} />
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="border-t border-clay-100 pt-4 flex flex-wrap gap-4 items-start">
            <div>
              <label className="label">{t('vernacular.filter.region')}</label>
              <MultiSelect
                options={regions.map((r) => ({ id: r.id, label: r.name_en, labelTa: r.name_ta }))}
                selected={filters.region_ids ?? []}
                onChange={(ids) => updateFilter('region_ids', ids)}
                placeholder="All regions"
                locale={locale}
              />
            </div>

            <div>
              <label className="label">{t('vernacular.filter.tag')}</label>
              <MultiSelect
                options={tags.map((tag) => ({ id: tag.id, label: tag.name_en, labelTa: tag.name_ta ?? undefined, color: tag.color }))}
                selected={filters.tag_ids ?? []}
                onChange={(ids) => updateFilter('tag_ids', ids)}
                placeholder="All tags"
              />
            </div>

            <div>
              <label className="label">{t('vernacular.filter.type')}</label>
              <div className="flex flex-wrap gap-1.5">
                {WORD_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => updateFilter('word_type', filters.word_type === type ? undefined : type)}
                    className={clsx(
                      'badge cursor-pointer capitalize',
                      filters.word_type === type
                        ? 'bg-clay-600 text-white'
                        : 'bg-clay-100 text-clay-700 hover:bg-clay-200'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="btn-ghost text-red-600 hover:bg-red-50 self-end">
                <X className="w-4 h-4" /> Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(10)].map((_, i) => <WordCardSkeleton key={i} />)}
        </div>
      ) : !data?.data.length ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12" />}
          title={t('vernacular.no_results')}
          description="Try removing some filters or searching with different terms."
          action={<button onClick={clearFilters} className="btn-secondary">Clear filters</button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {data.data.map((word) => (
              <WordCard key={word.id} word={word} />
            ))}
          </div>
          <Pagination
            page={filters.page!}
            totalPages={data.total_pages}
            onChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </>
      )}
    </div>
  )
}
