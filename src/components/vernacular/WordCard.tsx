import { Link } from 'react-router-dom'
import { Eye, ThumbsUp, MapPin, Bookmark } from 'lucide-react'
import { clsx } from 'clsx'
import type { Word } from '@/types'
import { useT } from '@/hooks'
import { useRefDataStore } from '@/store'

interface WordCardProps {
  word: Word
  className?: string
  compact?: boolean
}

const WORD_TYPE_COLORS: Record<string, string> = {
  noun: 'bg-blue-100 text-blue-700',
  verb: 'bg-purple-100 text-purple-700',
  adjective: 'bg-green-100 text-green-700',
  adverb: 'bg-teal-100 text-teal-700',
  idiom: 'bg-orange-100 text-orange-700',
  phrase: 'bg-pink-100 text-pink-700',
  exclamation: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-700',
}

export function WordCard({ word, className, compact = false }: WordCardProps) {
  const t = useT()
  const { getTagById } = useRefDataStore()

  const tags = word.tags.slice(0, 3).map(getTagById).filter(Boolean)

  return (
    <Link
      to={`/word/${word.slug}`}
      className={clsx('word-card block animate-fade-up', className)}
    >
      <div className="flex gap-4">
        {/* Image */}
        {word.media && !compact && (
          <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-clay-100">
            <img
              src={word.media.public_url}
              alt={word.media.alt_text ?? word.word_en ?? ''}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-tamil text-2xl font-bold text-clay-800 leading-tight group-hover:text-clay-600 transition-colors">
                  {word.word_ta}
                </span>
                <span className="text-sm text-ink-500 italic font-body">
                  {word.word_transliteration}
                </span>
              </div>
              {word.word_en && (
                <span className="text-xs text-ink-400 mt-0.5 block">{word.word_en}</span>
              )}
            </div>
            <span className={clsx('badge text-xs flex-shrink-0', WORD_TYPE_COLORS[word.word_type])}>
              {word.word_type}
            </span>
          </div>

          {/* Meaning */}
          <p className="text-sm text-ink-700 mt-2 line-clamp-2 leading-relaxed">
            {word.meaning_en}
          </p>

          {!compact && (
            <>
              {/* Tamil meaning */}
              <p className="font-tamil text-sm text-ink-600 mt-1 line-clamp-1">
                {word.meaning_ta}
              </p>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => tag && (
                    <span
                      key={tag.id}
                      className="badge text-xs"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.name_en}
                    </span>
                  ))}
                  {word.tags.length > 3 && (
                    <span className="badge bg-clay-100 text-clay-600">+{word.tags.length - 3}</span>
                  )}
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 mt-3 text-xs text-ink-400">
            {word.region && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {word.region.name_en}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {word.view_count.toLocaleString()} {t('word.views')}
            </span>
            {word.vote_count > 0 && (
              <span className="flex items-center gap-1 text-clay-500">
                <ThumbsUp className="w-3 h-3" />
                {word.vote_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────
export function WordCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex gap-4">
        <div className="skeleton w-16 h-16 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-7 w-32" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
          <div className="flex gap-2 pt-1">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Featured Word Card ────────────────────────────────────
export function FeaturedWordCard({ word }: { word: Word }) {
  return (
    <Link
      to={`/word/${word.slug}`}
      className="block card overflow-hidden group hover:border-clay-300 transition-all"
    >
      {word.media && (
        <div className="h-48 overflow-hidden bg-clay-100">
          <img
            src={word.media.public_url}
            alt={word.media.alt_text ?? ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-tamil text-3xl font-bold text-clay-800">{word.word_ta}</span>
          <span className="text-sm text-ink-500 italic">{word.word_transliteration}</span>
        </div>
        <p className="text-sm text-ink-700 line-clamp-2">{word.meaning_en}</p>
        {word.region && (
          <span className="flex items-center gap-1 text-xs text-ink-400 mt-2">
            <MapPin className="w-3 h-3" />
            {word.region.name_en}
          </span>
        )}
      </div>
    </Link>
  )
}
