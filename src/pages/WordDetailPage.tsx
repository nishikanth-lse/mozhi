import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Eye, ThumbsUp, ThumbsDown, Bookmark, Share2,
  Tag, ArrowLeft, BookOpen, MessageSquarePlus
} from 'lucide-react'
import { wordsApi } from '@/lib/api/words'
import { votesApi, bookmarksApi } from '@/lib/api/reference'
import { useT, useCopyToClipboard } from '@/hooks'
import { useRefDataStore, useLangStore } from '@/store'
import { useAuth } from '@/hooks'
import { StatusBadge } from '@/components/ui'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

export function WordDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const t = useT()
  const { locale } = useLangStore()
  const { isAuthenticated } = useAuth()
  const { getTagById, getRegionById } = useRefDataStore()
  const { copy, copied } = useCopyToClipboard()
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [optimisticVotes, setOptimisticVotes] = useState<number | null>(null)

  const { data: word, isLoading, error } = useQuery({
    queryKey: ['word', slug],
    queryFn: () => wordsApi.getBySlug(slug!),
    enabled: !!slug,
  })

  // Increment view count on load
  useEffect(() => {
    if (word?.id) {
      wordsApi.incrementView(word.id)
    }
  }, [word?.id])

  // Load vote and bookmark state
  useEffect(() => {
    if (!word?.id || !isAuthenticated) return
    votesApi.getUserVote('word', word.id).then(setUserVote)
    bookmarksApi.isBookmarked('word', word.id).then(setIsBookmarked)
  }, [word?.id, isAuthenticated])

  useEffect(() => {
    if (word) {
      document.title = `${word.word_ta} — ${word.word_transliteration} | Mozhi`
    }
  }, [word])

  const handleVote = async (value: 1 | -1) => {
    if (!isAuthenticated) { toast.error('Sign in to vote'); return }
    if (!word) return
    const prev = userVote
    const newVote = prev === value ? null : value
    setUserVote(newVote)
    setOptimisticVotes((word.vote_count) + (newVote ?? 0) - (prev ?? 0))
    try {
      await votesApi.vote('word', word.id, value)
    } catch {
      setUserVote(prev)
      setOptimisticVotes(null)
    }
  }

  const handleBookmark = async () => {
    if (!isAuthenticated) { toast.error('Sign in to bookmark'); return }
    if (!word) return
    const next = await bookmarksApi.toggle('word', word.id)
    setIsBookmarked(next)
    toast.success(next ? 'Bookmarked!' : 'Removed from bookmarks')
  }

  const handleShare = () => {
    copy(window.location.href)
    toast.success(t('common.copied'))
  }

  if (isLoading) return <WordDetailSkeleton />
  if (error || !word) return (
    <div className="page-container py-20 text-center">
      <p className="text-ink-500">Word not found.</p>
      <Link to="/vernacular" className="btn-primary mt-4">← Back to Library</Link>
    </div>
  )

  const tags = word.tags.map(getTagById).filter(Boolean)

  return (
    <div className="page-container py-10 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink-500 mb-6">
        <Link to="/vernacular" className="hover:text-clay-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> {t('nav.vernacular')}
        </Link>
        <span>/</span>
        <span>{word.word_transliteration}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero card */}
          <div className="card p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="font-tamil text-5xl font-bold text-clay-800 leading-tight">
                  {word.word_ta}
                </h1>
                <p className="text-xl text-ink-500 italic mt-1 font-body">{word.word_transliteration}</p>
                {word.word_en && (
                  <p className="text-base text-ink-600 mt-1">{word.word_en}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={word.status} />
                <span className="badge bg-clay-100 text-clay-700 capitalize">{word.word_type}</span>
              </div>
            </div>

            {/* Image */}
            {word.media && (
              <div className="rounded-xl overflow-hidden mb-6 h-48 sm:h-64 bg-clay-100">
                <img src={word.media.public_url} alt={word.media.alt_text ?? ''} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Meaning */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">
                  {t('word.meaning')} — English
                </h2>
                <p className="text-ink-800 leading-relaxed">{word.meaning_en}</p>
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">
                  {t('word.meaning')} — தமிழ்
                </h2>
                <p className="font-tamil text-ink-800 leading-relaxed text-lg">{word.meaning_ta}</p>
              </div>
              {word.pronunciation_guide && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">Pronunciation</h2>
                  <p className="font-mono text-sm bg-clay-50 rounded-lg px-3 py-2 text-ink-700">{word.pronunciation_guide}</p>
                </div>
              )}
            </div>
          </div>

          {/* Usage examples */}
          {word.usage_examples.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold text-ink-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-clay-500" /> {t('word.usage')}
              </h2>
              <div className="space-y-4">
                {word.usage_examples.map((ex, i) => (
                  <div key={i} className="border-l-2 border-clay-300 pl-4">
                    <p className="font-tamil text-ink-800 text-lg leading-relaxed">{ex.ta}</p>
                    {ex.transliteration && (
                      <p className="text-sm text-ink-500 italic mt-0.5">{ex.transliteration}</p>
                    )}
                    <p className="text-sm text-ink-600 mt-1">{ex.en}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cultural context */}
          {(word.cultural_context_en || word.cultural_context_ta) && (
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold text-ink-900 mb-4">{t('word.context')}</h2>
              {word.cultural_context_en && <p className="text-ink-700 leading-relaxed mb-3">{word.cultural_context_en}</p>}
              {word.cultural_context_ta && (
                <p className="font-tamil text-ink-600 leading-relaxed">{word.cultural_context_ta}</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="card p-4">
            <div className="flex gap-2 mb-4">
              {/* Upvote */}
              <button
                onClick={() => handleVote(1)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  userVote === 1
                    ? 'bg-clay-600 border-clay-600 text-white'
                    : 'border-clay-200 text-ink-700 hover:bg-clay-50'
                )}
              >
                <ThumbsUp className="w-4 h-4" />
                {optimisticVotes !== null ? optimisticVotes : word.vote_count}
              </button>

              {/* Downvote */}
              <button
                onClick={() => handleVote(-1)}
                className={clsx(
                  'flex items-center justify-center px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  userVote === -1
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : 'border-clay-200 text-ink-700 hover:bg-red-50'
                )}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBookmark}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm transition-all',
                  isBookmarked
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'border-clay-200 text-ink-700 hover:bg-clay-50'
                )}
              >
                <Bookmark className={clsx('w-4 h-4', isBookmarked && 'fill-current')} />
                {isBookmarked ? 'Saved' : t('word.bookmark')}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center justify-center px-3 py-2 rounded-xl border border-clay-200 text-ink-700 hover:bg-clay-50 transition-all text-sm"
              >
                <Share2 className="w-4 h-4" />
                {copied ? '✓' : ''}
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="card p-5 space-y-3">
            {word.region && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">
                  {t('word.region')}
                </p>
                <div className="flex items-center gap-1.5 text-ink-700">
                  <MapPin className="w-4 h-4 text-clay-500" />
                  <span>{locale === 'ta' ? word.region.name_ta : word.region.name_en}</span>
                  <span className="text-ink-400 text-xs">({word.region.country})</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">Stats</p>
              <div className="flex gap-4 text-sm text-ink-600">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {word.view_count.toLocaleString()}</span>
              </div>
            </div>

            {tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> {t('word.tags')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => tag && (
                    <Link
                      key={tag.id}
                      to={`/vernacular?tag=${tag.id}`}
                      className="badge text-xs"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {locale === 'ta' ? tag.name_ta : tag.name_en}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-ink-400 pt-2 border-t border-clay-100">
              Added {new Date(word.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* Contribute correction */}
          <Link to={`/contribute?word=${word.id}`} className="btn-ghost w-full justify-center text-sm text-ink-500">
            <MessageSquarePlus className="w-4 h-4" />
            {t('word.contribute_correction')}
          </Link>
        </div>
      </div>
    </div>
  )
}

function WordDetailSkeleton() {
  return (
    <div className="page-container py-10 max-w-4xl">
      <div className="skeleton h-5 w-48 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-8 space-y-4">
            <div className="skeleton h-14 w-48" />
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-40 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4"><div className="skeleton h-24 w-full" /></div>
          <div className="card p-5 space-y-3">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  )
}
