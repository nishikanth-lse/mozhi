import { clsx } from 'clsx'
import { ChevronDown, X, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

// ─── Multi-Select Filter ───────────────────────────────────
interface Option { id: string; label: string; labelTa?: string; color?: string }

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  locale?: 'en' | 'ta'
}

export function MultiSelect({ options, selected, onChange, placeholder = 'Select...', locale = 'en' }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  const selectedLabels = options
    .filter((o) => selected.includes(o.id))
    .map((o) => locale === 'ta' && o.labelTa ? o.labelTa : o.label)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-clay-200 bg-white text-sm text-ink-700 hover:border-clay-400 transition-colors min-w-[140px] max-w-[200px]"
      >
        <span className="flex-1 text-left truncate">
          {selected.length === 0 ? (
            <span className="text-ink-400">{placeholder}</span>
          ) : selected.length === 1 ? (
            selectedLabels[0]
          ) : (
            <span>{selected.length} selected</span>
          )}
        </span>
        <ChevronDown className={clsx('w-4 h-4 text-ink-400 transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-clay-200 rounded-xl shadow-lg z-30 min-w-[200px] max-h-60 overflow-y-auto py-1">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink-700 hover:bg-clay-50 transition-colors text-left"
            >
              <div className={clsx(
                'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                selected.includes(opt.id) ? 'bg-clay-600 border-clay-600' : 'border-clay-300'
              )}>
                {selected.includes(opt.id) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              {opt.color && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
              )}
              <span>{locale === 'ta' && opt.labelTa ? opt.labelTa : opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.slice(0, 3).map((id) => {
            const opt = options.find((o) => o.id === id)
            if (!opt) return null
            return (
              <span key={id} className="flex items-center gap-1 badge bg-clay-100 text-clay-700">
                {locale === 'ta' && opt.labelTa ? opt.labelTa : opt.label}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(id) }}
                  className="hover:text-clay-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
          {selected.length > 3 && (
            <span className="badge bg-clay-100 text-clay-600">+{selected.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sort Select ───────────────────────────────────────────
interface SortOption { value: string; label: string }

interface SortSelectProps {
  options: SortOption[]
  value: string
  onChange: (value: string) => void
}

export function SortSelect({ options, value, onChange }: SortSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-3 pr-8 py-2 rounded-lg border border-clay-200 bg-white text-sm text-ink-700 hover:border-clay-400 transition-colors appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-clay-300"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
    </div>
  )
}

// ─── Pagination ────────────────────────────────────────────
interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })

  return (
    <div className="flex items-center gap-1 justify-center">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm rounded-lg border border-clay-200 bg-white text-ink-700 hover:bg-clay-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ←
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={clsx(
            'px-3 py-1.5 text-sm rounded-lg border transition-colors',
            p === page
              ? 'bg-clay-600 border-clay-600 text-white'
              : 'border-clay-200 bg-white text-ink-700 hover:bg-clay-50'
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm rounded-lg border border-clay-200 bg-white text-ink-700 hover:bg-clay-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        →
      </button>
    </div>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, danger }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-clay-200 p-6 w-full max-w-sm animate-fade-up">
        <h3 className="font-display font-bold text-xl text-ink-900 mb-2">{title}</h3>
        <p className="text-sm text-ink-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-clay-300">{icon}</div>}
      <h3 className="font-display font-bold text-xl text-ink-700 mb-2">{title}</h3>
      {description && <p className="text-sm text-ink-500 max-w-xs">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-${status}`}>{status.replace('_', ' ')}</span>
}

// ─── Tag Picker ───────────────────────────────────────────
interface TagPickerProps {
  allTags: Array<{ id: string; name_en: string; color: string }>
  selected: string[]
  onChange: (ids: string[]) => void
}

export function TagPicker({ allTags, selected, onChange }: TagPickerProps) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allTags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => toggle(tag.id)}
          className={clsx(
            'badge text-sm cursor-pointer transition-all',
            selected.includes(tag.id)
              ? 'ring-2 ring-offset-1 opacity-100'
              : 'opacity-60 hover:opacity-80'
          )}
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
            ...(selected.includes(tag.id) ? { ringColor: tag.color } : {}),
          }}
        >
          {selected.includes(tag.id) && <Check className="w-3 h-3" />}
          {tag.name_en}
        </button>
      ))}
    </div>
  )
}
