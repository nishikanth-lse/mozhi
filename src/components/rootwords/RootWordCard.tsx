import { Link } from 'react-router-dom'
import { Globe, ArrowRight, Eye } from 'lucide-react'
import { clsx } from 'clsx'
import type { RootWord } from '@/types'

interface RootWordCardProps {
  rootWord: RootWord
  className?: string
}

// Language flag emoji map
const LANG_FLAGS: Record<string, string> = {
  en: '🇬🇧', ta: '🇮🇳', sa: '🕉️', te: '🇮🇳', kn: '🇮🇳', ml: '🇮🇳',
  pt: '🇵🇹', fr: '🇫🇷', ms: '🇲🇾', id: '🇮🇩', si: '🇱🇰', th: '🇹🇭',
  el: '🇬🇷', la: '🏛️',
}

export function RootWordCard({ rootWord, className }: RootWordCardProps) {
  const derivedCount = rootWord.derived_words?.length ?? 0
  const languages = [...new Set(rootWord.derived_words?.map((d) => d.language_iso) ?? [])].slice(0, 6)

  return (
    <Link
      to={`/root/${rootWord.slug}`}
      className={clsx('word-card block group animate-fade-up', className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Root word */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-tamil text-2xl font-bold text-clay-800">{rootWord.root_ta}</span>
            <span className="text-sm text-ink-500 italic">{rootWord.root_transliteration}</span>
          </div>

          {/* Meaning */}
          <p className="text-sm font-medium text-ink-800 mt-1">{rootWord.root_meaning_en}</p>
          <p className="font-tamil text-sm text-ink-600 mt-0.5 line-clamp-1">{rootWord.root_meaning_ta}</p>

          {/* Etymology snippet */}
          <p className="text-sm text-ink-500 mt-2 line-clamp-2 leading-relaxed">
            {rootWord.etymology_en}
          </p>

          {/* Language badges */}
          {languages.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <Globe className="w-3.5 h-3.5 text-ink-400" />
              {languages.map((iso) => (
                <span key={iso} className="badge bg-clay-100 text-clay-700 text-xs gap-1">
                  <span>{LANG_FLAGS[iso] ?? '🌐'}</span>
                  <span>{iso.toUpperCase()}</span>
                </span>
              ))}
              {derivedCount > 6 && (
                <span className="text-xs text-ink-400">+{derivedCount - 6} more</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3 text-xs text-ink-400">
            <span>{derivedCount} derived word{derivedCount !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {rootWord.view_count.toLocaleString()}
            </span>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-clay-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
      </div>
    </Link>
  )
}

export function RootWordCardSkeleton() {
  return (
    <div className="card p-5 space-y-2">
      <div className="skeleton h-7 w-28" />
      <div className="skeleton h-4 w-48" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-3/4" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-5 w-12 rounded-full" />
        <div className="skeleton h-5 w-12 rounded-full" />
        <div className="skeleton h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}
