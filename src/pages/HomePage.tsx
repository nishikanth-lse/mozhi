import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Globe, Flame, Sparkles } from 'lucide-react'
import { wordsApi } from '@/lib/api/words'
import { rootWordsApi } from '@/lib/api/rootWords'
import { WordCard, WordCardSkeleton } from '@/components/vernacular/WordCard'
import { RootWordCard } from '@/components/rootwords/RootWordCard'
import { SearchTrigger } from '@/components/ui/GlobalSearch'
import { useRefData, useT } from '@/hooks'
import { useRefDataStore } from '@/store'
import { clsx } from 'clsx'

const STATS = [
  { labelKey: 'home.stats.words' as const, value: '2,400+', icon: BookOpen },
  { labelKey: 'home.stats.regions' as const, value: '12', icon: Globe },
  { labelKey: 'home.stats.languages' as const, value: '14', icon: Sparkles },
  { labelKey: 'home.stats.contributors' as const, value: '340+', icon: Flame },
]

export function HomePage() {
  const t = useT()
  useRefData()
  const { regions } = useRefDataStore()

  const { data: trending, isLoading: loadingTrending } = useQuery({
    queryKey: ['words', 'trending'],
    queryFn: () => wordsApi.getTrending(6),
  })

  const { data: recent, isLoading: loadingRecent } = useQuery({
    queryKey: ['words', 'recent'],
    queryFn: () => wordsApi.getRecent(4),
  })

  const { data: rootsResult } = useQuery({
    queryKey: ['root_words', 'recent'],
    queryFn: () => rootWordsApi.list({ limit: 3 }),
  })

  useEffect(() => {
    document.title = 'Mozhi | மொழி — Tamil Language Preservation'
  }, [])

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-ink-950 text-white min-h-[85vh] flex items-center">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, #dc712a 0%, transparent 50%), radial-gradient(circle at 80% 20%, #f59e0b 0%, transparent 40%)',
            }}
          />
        </div>

        {/* Decorative Tamil characters */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {['அ', 'ஆ', 'இ', 'ம', 'ழ', 'ி', 'த', 'ன', 'ல', 'ர'].map((char, i) => (
            <span
              key={i}
              className="absolute font-tamil text-white/5 font-bold"
              style={{
                fontSize: `${80 + (i % 4) * 40}px`,
                left: `${(i * 13) % 90}%`,
                top: `${(i * 17) % 80}%`,
                transform: `rotate(${(i % 3 - 1) * 15}deg)`,
              }}
            >
              {char}
            </span>
          ))}
        </div>

        <div className="page-container relative z-10 py-24">
          <div className="max-w-3xl">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-clay-600/20 border border-clay-600/30 text-clay-300 text-sm mb-6 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Living archive of Tamil linguistic heritage</span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-4 animate-fade-up">
              {t('home.hero.title')}
            </h1>

            <p className="font-tamil text-2xl sm:text-3xl text-clay-400 mb-4 animate-fade-up animate-delay-100">
              தமிழின் குரலைப்பாதுகாப்போம்
            </p>

            <p className="text-lg text-ink-300 max-w-2xl mb-8 leading-relaxed animate-fade-up animate-delay-200">
              {t('home.hero.subtitle')}
            </p>

            {/* Search */}
            <div className="animate-fade-up animate-delay-300 mb-8">
              <SearchTrigger />
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 animate-fade-up animate-delay-400">
              <Link to="/vernacular" className="btn-primary btn-lg">
                {t('home.hero.cta.explore')}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/roots" className="btn btn-lg bg-white/10 text-white hover:bg-white/20 border border-white/20">
                {t('home.hero.cta.roots')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-clay-600 text-white py-10">
        <div className="page-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map(({ labelKey, value, icon: Icon }, i) => (
              <div
                key={labelKey}
                className={clsx('text-center animate-fade-up')}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <Icon className="w-6 h-6 mx-auto mb-2 text-clay-200" />
                <div className="font-display text-3xl font-bold">{value}</div>
                <div className="text-clay-200 text-sm mt-1">{t(labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trending words ── */}
      <section className="section">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink-900 flex items-center gap-2">
                <Flame className="w-7 h-7 text-clay-500" />
                {t('home.trending')}
              </h2>
              <p className="font-tamil text-ink-500 text-sm mt-1">இந்த வாரம் பிரபலமானவை</p>
            </div>
            <Link to="/vernacular?sort=popular" className="btn-ghost text-clay-600 hover:text-clay-800">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingTrending
              ? [...Array(6)].map((_, i) => <WordCardSkeleton key={i} />)
              : (trending ?? []).map((word, i) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    className={`animate-delay-${Math.min(i * 100, 500)}`}
                  />
                ))}
          </div>
        </div>
      </section>

      {/* ── Browse by region ── */}
      <section className="section bg-clay-50/50">
        <div className="page-container">
          <h2 className="font-display text-3xl font-bold text-ink-900 mb-2">Browse by Region</h2>
          <p className="font-tamil text-ink-500 mb-6">பகுதி வாரியாக தேடுங்கள்</p>
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => (
              <Link
                key={region.id}
                to={`/vernacular?region=${region.id}`}
                className="px-4 py-2 rounded-full border border-clay-200 bg-white text-sm font-medium text-ink-700 hover:border-clay-400 hover:bg-clay-50 transition-colors"
              >
                <span>{region.name_en}</span>
                <span className="font-tamil text-xs text-ink-400 ml-1.5">· {region.name_ta}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Root words preview ── */}
      <section className="section">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink-900 flex items-center gap-2">
                <Globe className="w-7 h-7 text-amber-500" />
                {t('roots.title')}
              </h2>
              <p className="font-tamil text-ink-500 text-sm mt-1">மூல சொற்கள் மற்றும் உலக மொழிகளில் தாக்கம்</p>
            </div>
            <Link to="/roots" className="btn-ghost text-clay-600">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(rootsResult?.data ?? []).map((rw) => (
              <RootWordCard key={rw.id} rootWord={rw} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent ── */}
      <section className="section bg-clay-50/50">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-3xl font-bold text-ink-900">{t('home.recent')}</h2>
            <Link to="/vernacular" className="btn-ghost text-clay-600">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingRecent
              ? [...Array(4)].map((_, i) => <WordCardSkeleton key={i} />)
              : (recent ?? []).map((word) => <WordCard key={word.id} word={word} />)}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="section">
        <div className="page-container">
          <div className="bg-clay-600 rounded-3xl p-10 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #f59e0b, transparent 70%)' }}
            />
            <div className="relative">
              <p className="font-tamil text-2xl text-clay-200 mb-2">உங்கள் வழக்கு சொல்லை பகிருங்கள்</p>
              <h2 className="font-display text-4xl font-bold mb-4">Know a Tamil dialect word?</h2>
              <p className="text-clay-200 mb-6 max-w-lg mx-auto">
                Help preserve Tamil's rich linguistic diversity by contributing dialect words, slang, and regional expressions.
              </p>
              <Link to="/contribute" className="btn btn-lg bg-white text-clay-700 hover:bg-clay-50 font-semibold">
                Contribute a Word
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
