import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Minus, Loader2, X, Save, Eye, Trash2, Pencil,
  Search, AlertCircle, CheckCircle, Upload, FileDown,
} from 'lucide-react'
import Papa from 'papaparse'
import { rootWordsApi } from '@/lib/api/rootWords'
import { TagPicker, StatusBadge, ConfirmDialog, Pagination } from '@/components/ui'
import { useRefDataStore } from '@/store'
import { generateSlug, useDebounce } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { DerivedWord } from '@/types'

// ─── CSV row shape ─────────────────────────────────────────
// Each CSV row is one derived-word entry. Rows with the same
// root_transliteration are grouped into a single root_word record.
// A root with no derived words uses a single row with blank derived_* cols.
interface RootWordCSVRow {
  root_ta: string
  root_transliteration: string
  root_meaning_ta: string
  root_meaning_en: string
  etymology_en: string
  etymology_ta?: string
  linguistic_notes?: string
  historical_period?: string
  // Derived word columns (repeat rows to add more)
  derived_language_iso?: string   // e.g. "en", "pt", "ms"
  derived_word?: string           // e.g. "cash"
  derived_meaning?: string        // e.g. "money in hand"
  derived_example?: string
  derived_notes?: string
}

// ─── Import result types ────────────────────────────────────
interface ImportResult {
  succeeded: number
  failed: number
  skipped: number            // duplicates skipped
  errors: ImportRowError[]
}

interface ImportRowError {
  row: number
  root: string
  reason: string
}

// ─── Import progress modal ──────────────────────────────────
function ImportProgressModal({
  open,
  progress,
  total,
  result,
  onClose,
}: {
  open: boolean
  progress: number
  total: number
  result: ImportResult | null
  onClose: () => void
}) {
  if (!open) return null

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0
  const isComplete = result !== null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-clay-200 p-6 w-full max-w-md animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            isComplete ? 'bg-green-100' : 'bg-clay-100'
          )}>
            {isComplete
              ? <CheckCircle className="w-5 h-5 text-green-600" />
              : <Loader2 className="w-5 h-5 text-clay-600 animate-spin" />
            }
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink-900">
              {isComplete ? 'Import Complete' : 'Importing Root Words…'}
            </h3>
            {!isComplete && (
              <p className="text-sm text-ink-500">
                Processing {progress} of {total} root words
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!isComplete && (
          <div className="mb-5">
            <div className="h-2.5 bg-clay-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-clay-600 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-ink-400 mt-1.5 text-right">{pct}%</p>
          </div>
        )}

        {/* Results summary */}
        {isComplete && result && (
          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Imported', value: result.succeeded, color: 'text-green-700 bg-green-50 border-green-200' },
                { label: 'Skipped', value: result.skipped,   color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { label: 'Failed',  value: result.failed,    color: 'text-red-700 bg-red-50 border-red-200' },
              ].map(({ label, value, color }) => (
                <div key={label} className={clsx('text-center py-3 rounded-xl border', color)}>
                  <p className="text-2xl font-bold font-display">{value}</p>
                  <p className="text-xs font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Error list */}
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-red-700 mb-2">
                  Errors ({result.errors.length})
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 leading-relaxed">
                    <span className="font-medium">Row {e.row} ({e.root}):</span> {e.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {isComplete && (
          <button onClick={onClose} className="btn-primary w-full justify-center">
            Done
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Root Words List ───────────────────────────────────────
export function AdminRootWordsPage() {
  const queryClient = useQueryClient()
  const { languages } = useRefDataStore()

  // List state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // ── Queries ──────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'root-words', { search: debouncedSearch, status: statusFilter, page }],
    queryFn: () => rootWordsApi.adminList({
      search: debouncedSearch,
      status: statusFilter || undefined,
      page,
      limit: 20,
    }),
    placeholderData: (prev) => prev,
  })

  // ── Mutations ─────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => rootWordsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'root-words'] })
      toast.success('Root word deleted')
      setDeleteId(null)
    },
    onError: () => toast.error('Delete failed'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => rootWordsApi.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'root-words'] })
      toast.success(`${selectedIds.length} root words deleted`)
      setSelectedIds([])
    },
    onError: () => toast.error('Bulk delete failed'),
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      rootWordsApi.update(id, {
        status: status as any,
        published_at: status === 'published' ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'root-words'] })
      toast.success('Status updated')
    },
  })

  // ── Selection helpers ─────────────────────────────────────
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const toggleAll = useCallback(() => {
    const allIds = data?.data.map((rw) => rw.id) ?? []
    setSelectedIds((prev) => (prev.length === allIds.length ? [] : allIds))
  }, [data?.data])

  // ── CSV template download ─────────────────────────────────
  const downloadTemplate = useCallback(() => {
    const headers: (keyof RootWordCSVRow)[] = [
      'root_ta', 'root_transliteration', 'root_meaning_ta', 'root_meaning_en',
      'etymology_en', 'etymology_ta', 'linguistic_notes', 'historical_period',
      'derived_language_iso', 'derived_word', 'derived_meaning', 'derived_example', 'derived_notes',
    ]

    // Two sample rows — same root, two derived words
    const rows = [
      headers,
      [
        'காசு', 'kaasu', 'பணம்', 'Money / cash',
        'From Tamil "kaasu" meaning a small coin; spread via trade routes to Portuguese, Malay and English.',
        'காசு என்பது சிறிய நாணயத்தை குறிக்கும்.',
        'One of the few Tamil words that entered English directly.',
        'Sangam Period',
        'pt', 'caixa', 'cash box / treasury', 'Ela vai ao caixa.', 'Via Portuguese colonial trade',
      ],
      [
        // same root — second derived word row (root fields repeated)
        'காசு', 'kaasu', 'பணம்', 'Money / cash',
        'From Tamil "kaasu" meaning a small coin; spread via trade routes to Portuguese, Malay and English.',
        '', '', '',
        'en', 'cash', 'ready money', 'Pay in cash.', 'Via Portuguese "caixa"',
      ],
      [
        // root with no derived words
        'அரிசி', 'arisi', 'நெல்', 'Rice (husked)',
        'Tamil "arisi" travelled via Arabic "aruzz" into European languages as "rice".',
        '', '', 'Pre-classical Tamil',
        'en', 'rice', 'the grain', '', '',
      ],
    ]

    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mozhi-root-words-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // ── CSV import ────────────────────────────────────────────
  const handleCSVImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      e.target.value = '' // reset so same file can be re-selected

      Papa.parse<RootWordCSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),

        complete: async (results) => {
          const rows = results.data

          // ── Group rows by root_transliteration ─────────────
          // Each unique transliteration = one root_word record.
          // Multiple rows with the same transliteration accumulate derived_words.
          const grouped = new Map<string, {
            meta: Omit<RootWordCSVRow, 'derived_language_iso' | 'derived_word' | 'derived_meaning' | 'derived_example' | 'derived_notes'>
            derived: DerivedWord[]
            firstRowIndex: number
          }>()

          rows.forEach((row, idx) => {
            const key = (row.root_transliteration ?? '').trim().toLowerCase()
            if (!key) return // skip blank rows

            if (!grouped.has(key)) {
              grouped.set(key, {
                meta: {
                  root_ta:             (row.root_ta ?? '').trim(),
                  root_transliteration:(row.root_transliteration ?? '').trim(),
                  root_meaning_ta:     (row.root_meaning_ta ?? '').trim(),
                  root_meaning_en:     (row.root_meaning_en ?? '').trim(),
                  etymology_en:        (row.etymology_en ?? '').trim(),
                  etymology_ta:        (row.etymology_ta ?? '').trim() || undefined,
                  linguistic_notes:    (row.linguistic_notes ?? '').trim() || undefined,
                  historical_period:   (row.historical_period ?? '').trim() || undefined,
                },
                derived: [],
                firstRowIndex: idx + 2, // +2 = 1-based + header row
              })
            }

            // Accumulate a derived word if columns are present
            const langIso = (row.derived_language_iso ?? '').trim().toLowerCase()
            const word    = (row.derived_word ?? '').trim()
            if (langIso && word) {
              // Resolve language_id from the loaded languages reference data
              const lang = languages.find((l) => l.iso_code === langIso)
              grouped.get(key)!.derived.push({
                language_id:   lang?.id ?? '',
                language_name: lang?.name_en ?? langIso,
                language_iso:  langIso,
                word,
                meaning: (row.derived_meaning ?? '').trim(),
                example: (row.derived_example ?? '').trim() || undefined,
                notes:   (row.derived_notes ?? '').trim() || undefined,
              })
            }
          })

          const rootGroups = [...grouped.values()]
          const total = rootGroups.length

          setImportTotal(total)
          setImportProgress(0)
          setImportResult(null)
          setImportOpen(true)

          const { data: { user } } = await supabase.auth.getUser()

          let succeeded = 0
          let failed    = 0
          let skipped   = 0
          const errors: ImportRowError[] = []

          for (let i = 0; i < rootGroups.length; i++) {
            const group = rootGroups[i]
            const { meta, derived, firstRowIndex } = group

            // ── Validation ───────────────────────────────────
            const missingFields: string[] = []
            if (!meta.root_ta)             missingFields.push('root_ta')
            if (!meta.root_transliteration) missingFields.push('root_transliteration')
            if (!meta.root_meaning_en)     missingFields.push('root_meaning_en')
            if (!meta.etymology_en)        missingFields.push('etymology_en')

            if (missingFields.length > 0) {
              errors.push({
                row: firstRowIndex,
                root: meta.root_transliteration || '(blank)',
                reason: `Missing required fields: ${missingFields.join(', ')}`,
              })
              failed++
              setImportProgress(i + 1)
              continue
            }

            // ── Duplicate check ───────────────────────────────
            const slug = meta.root_transliteration
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
              .slice(0, 100)

            const { data: existing } = await supabase
              .from('root_words')
              .select('id')
              .ilike('root_transliteration', meta.root_transliteration)
              .limit(1)

            if (existing && existing.length > 0) {
              errors.push({
                row: firstRowIndex,
                root: meta.root_transliteration,
                reason: 'Duplicate — a root word with this transliteration already exists',
              })
              skipped++
              setImportProgress(i + 1)
              continue
            }

            // ── Insert ───────────────────────────────────────
            try {
              await rootWordsApi.create({
                root_ta:             meta.root_ta,
                root_transliteration: meta.root_transliteration,
                root_meaning_ta:     meta.root_meaning_ta || meta.root_meaning_en,
                root_meaning_en:     meta.root_meaning_en,
                etymology_en:        meta.etymology_en,
                etymology_ta:        meta.etymology_ta ?? null,
                linguistic_notes:    meta.linguistic_notes ?? null,
                historical_period:   meta.historical_period ?? null,
                derived_words:       derived,
                influence_map:       {},
                status:              'draft',
                slug:                `${slug}-${Date.now()}`,
                tags:                [],
                media_id:            null,
                seo_title:           null,
                seo_description:     null,
                created_by:          user?.id ?? null,
                updated_by:          null,
                published_at:        null,
              })
              succeeded++
            } catch (err: any) {
              errors.push({
                row: firstRowIndex,
                root: meta.root_transliteration,
                reason: err?.message ?? 'Unknown error',
              })
              failed++
            }

            setImportProgress(i + 1)
          }

          // ── Finalise ─────────────────────────────────────
          setImportResult({ succeeded, failed, skipped, errors })
          queryClient.invalidateQueries({ queryKey: ['admin', 'root-words'] })
        },

        error: (err) => {
          toast.error(`CSV parse error: ${err.message}`)
        },
      })
    },
    [queryClient, languages]
  )

  const handleImportClose = useCallback(() => {
    setImportOpen(false)
    setImportResult(null)
    setImportProgress(0)
    setImportTotal(0)
  }, [])

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Root Words</h1>
          <p className="text-ink-500 text-sm mt-0.5">
            {data?.count.toLocaleString() ?? '—'} total entries
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="btn-secondary btn-sm">
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Template</span>
          </button>

          <label className="btn-secondary btn-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import CSV</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVImport}
            />
          </label>

          <Link to="/admin/root-words/new" className="btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Root Word</span>
          </Link>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search root words…"
            className="input pl-9 w-full"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="input w-full sm:w-auto"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="archived">Archived</option>
        </select>

        {/* Bulk actions — only shown when rows selected */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0">
            <span className="text-sm text-ink-600 whitespace-nowrap">
              {selectedIds.length} selected
            </span>
            <button
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              disabled={bulkDeleteMutation.isPending}
              className="btn-danger btn-sm"
            >
              {bulkDeleteMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />
              }
              Delete
            </button>
          </div>
        )}
      </div>

      {/* ── Table (desktop) ── */}
      <div className="card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === (data?.data.length ?? 0) &&
                      (data?.data.length ?? 0) > 0
                    }
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th>Root Word</th>
                <th>Transliteration</th>
                <th>Meaning (EN)</th>
                <th>Derived</th>
                <th>Status</th>
                <th>Views</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j}><div className="skeleton h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : (data?.data ?? []).map((rw) => (
                    <tr key={rw.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rw.id)}
                          onChange={() => toggleSelected(rw.id)}
                          className="rounded"
                        />
                      </td>
                      <td>
                        <span className="font-tamil text-lg font-bold text-clay-800">
                          {rw.root_ta}
                        </span>
                      </td>
                      <td className="italic text-ink-600">{rw.root_transliteration}</td>
                      <td className="max-w-[180px] truncate text-ink-700 text-sm">
                        {rw.root_meaning_en}
                      </td>
                      <td className="text-ink-500 text-sm">
                        {rw.derived_words?.length ?? 0}
                      </td>
                      <td><StatusBadge status={rw.status} /></td>
                      <td className="text-ink-500 text-xs">{rw.view_count.toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => publishMutation.mutate({
                              id: rw.id,
                              status: rw.status === 'published' ? 'draft' : 'published',
                            })}
                            title={rw.status === 'published' ? 'Unpublish' : 'Publish'}
                            className={clsx(
                              'p-1.5 rounded transition-colors',
                              rw.status === 'published'
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-ink-400 hover:bg-clay-50'
                            )}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/root/${rw.slug}`}
                            target="_blank"
                            title="View"
                            className="p-1.5 rounded text-ink-400 hover:bg-clay-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/admin/root-words/${rw.id}/edit`}
                            title="Edit"
                            className="p-1.5 rounded text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteId(rw.id)}
                            title="Delete"
                            className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>

          {!isLoading && !data?.data.length && (
            <div className="text-center py-12 text-ink-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No root words found
            </div>
          )}
        </div>

        {/* ── Card list (mobile) ── */}
        <div className="md:hidden divide-y divide-clay-100">
          {isLoading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="skeleton h-6 w-28" />
                  <div className="skeleton h-4 w-full" />
                  <div className="flex gap-2">
                    <div className="skeleton h-5 w-20 rounded-full" />
                    <div className="skeleton h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))
            : (data?.data ?? []).map((rw) => (
                <div key={rw.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(rw.id)}
                        onChange={() => toggleSelected(rw.id)}
                        className="rounded mt-1 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-tamil text-xl font-bold text-clay-800">
                            {rw.root_ta}
                          </span>
                          <span className="text-sm italic text-ink-500">
                            {rw.root_transliteration}
                          </span>
                        </div>
                        <p className="text-sm text-ink-700 mt-0.5 line-clamp-1">
                          {rw.root_meaning_en}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-400">
                          <StatusBadge status={rw.status} />
                          <span>{rw.derived_words?.length ?? 0} derived</span>
                          <span><Eye className="w-3 h-3 inline mr-0.5" />{rw.view_count}</span>
                        </div>
                      </div>
                    </div>

                    {/* Compact action row */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => publishMutation.mutate({
                          id: rw.id,
                          status: rw.status === 'published' ? 'draft' : 'published',
                        })}
                        className={clsx(
                          'p-2 rounded-lg transition-colors',
                          rw.status === 'published'
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-ink-400 hover:bg-clay-50'
                        )}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/admin/root-words/${rw.id}/edit`}
                        className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteId(rw.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
          }

          {!isLoading && !data?.data.length && (
            <div className="text-center py-12 text-ink-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No root words found
            </div>
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="mt-4">
        <Pagination
          page={page}
          totalPages={data?.total_pages ?? 1}
          onChange={setPage}
        />
      </div>

      {/* ── Modals ── */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Root Word"
        message="This action cannot be undone. The root word and all its derived word data will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        danger
      />

      <ImportProgressModal
        open={importOpen}
        progress={importProgress}
        total={importTotal}
        result={importResult}
        onClose={handleImportClose}
      />
    </div>
  )
}

// ─── Root Word Form ────────────────────────────────────────
interface RootFormData {
  root_ta: string
  root_transliteration: string
  root_meaning_ta: string
  root_meaning_en: string
  etymology_en: string
  etymology_ta: string
  linguistic_notes: string
  historical_period: string
  derived_words: DerivedWord[]
  tags: string[]
  status: string
}

const EMPTY_ROOT_FORM: RootFormData = {
  root_ta: '', root_transliteration: '', root_meaning_ta: '', root_meaning_en: '',
  etymology_en: '', etymology_ta: '', linguistic_notes: '', historical_period: '',
  derived_words: [], tags: [], status: 'draft',
}

const EMPTY_DERIVED: DerivedWord = {
  language_id: '', language_name: '', language_iso: '', word: '', meaning: '', example: '', notes: '',
}

export function AdminRootWordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { tags, languages } = useRefDataStore()
  const isEdit = !!id

  const [form, setForm] = useState<RootFormData>(EMPTY_ROOT_FORM)
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)

  const { data: existing } = useQuery({
    queryKey: ['root-word-edit', id],
    queryFn: () => rootWordsApi.getById(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        root_ta: existing.root_ta, root_transliteration: existing.root_transliteration,
        root_meaning_ta: existing.root_meaning_ta, root_meaning_en: existing.root_meaning_en,
        etymology_en: existing.etymology_en, etymology_ta: existing.etymology_ta ?? '',
        linguistic_notes: existing.linguistic_notes ?? '', historical_period: existing.historical_period ?? '',
        derived_words: existing.derived_words, tags: existing.tags, status: existing.status,
      })
      setSlug(existing.slug)
      setSlugManual(true)
    }
  }, [existing, isEdit])

  useEffect(() => {
    if (!slugManual && form.root_transliteration) {
      setSlug(generateSlug(form.root_transliteration))
    }
  }, [form.root_transliteration, slugManual])

  const set = (k: keyof RootFormData, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const addDerived = () => set('derived_words', [...form.derived_words, { ...EMPTY_DERIVED }])
  const removeDerived = (i: number) => set('derived_words', form.derived_words.filter((_, idx) => idx !== i))
  const updateDerived = (i: number, key: keyof DerivedWord, value: string) => {
    const updated = [...form.derived_words]
    updated[i] = { ...updated[i], [key]: value }
    // Auto-fill language name and iso from selection
    if (key === 'language_id') {
      const lang = languages.find((l) => l.id === value)
      if (lang) {
        updated[i].language_name = lang.name_en
        updated[i].language_iso = lang.iso_code
        updated[i].language_id = lang.id
      }
    }
    set('derived_words', updated)
  }

  const saveMutation = useMutation({
    mutationFn: async (publish?: boolean) => {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        ...form,
        status: (publish ? 'published' : form.status) as any,
        slug: slug || generateSlug(form.root_transliteration),
        etymology_ta: form.etymology_ta || null,
        linguistic_notes: form.linguistic_notes || null,
        historical_period: form.historical_period || null,
        media_id: existing?.media_id ?? null,
        influence_map: {},
        seo_title: null,
        seo_description: null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        published_at: publish ? new Date().toISOString() : (existing?.published_at ?? null),
      }
      if (isEdit && id) return rootWordsApi.update(id, payload)
      return rootWordsApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'root-words'] })
      toast.success(isEdit ? 'Root word updated!' : 'Root word created!')
      navigate('/admin/root-words')
    },
    onError: (err: any) => toast.error(err.message ?? 'Save failed'),
  })

  const isValid = form.root_ta && form.root_transliteration && form.root_meaning_en && form.etymology_en

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          {isEdit ? 'Edit Root Word' : 'Add Root Word'}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/admin/root-words')} className="btn-ghost"><X className="w-4 h-4" /> Cancel</button>
          <button onClick={() => saveMutation.mutate(false)} disabled={!isValid || saveMutation.isPending} className="btn-secondary">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => saveMutation.mutate(true)} disabled={!isValid || saveMutation.isPending} className="btn-primary">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Root word */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider">Root Word</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Tamil Root <span className="text-red-500">*</span></label>
                <input type="text" value={form.root_ta} onChange={(e) => set('root_ta', e.target.value)} className="input-tamil" placeholder="e.g. தமிழ்" dir="auto" />
              </div>
              <div>
                <label className="label">Transliteration <span className="text-red-500">*</span></label>
                <input type="text" value={form.root_transliteration} onChange={(e) => { set('root_transliteration', e.target.value); setSlugManual(false) }} className="input" placeholder="e.g. Tamil" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Meaning (English) <span className="text-red-500">*</span></label>
                <input type="text" value={form.root_meaning_en} onChange={(e) => set('root_meaning_en', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Meaning (Tamil) <span className="text-red-500">*</span></label>
                <input type="text" value={form.root_meaning_ta} onChange={(e) => set('root_meaning_ta', e.target.value)} className="input-tamil" dir="auto" />
              </div>
            </div>
            <div>
              <label className="label">Historical Period</label>
              <input type="text" value={form.historical_period} onChange={(e) => set('historical_period', e.target.value)} className="input" placeholder="e.g. Sangam Period (300 BCE – 300 CE)" />
            </div>
          </div>

          {/* Etymology */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider">Etymology</h2>
            <div>
              <label className="label">Etymology (English) <span className="text-red-500">*</span></label>
              <textarea value={form.etymology_en} onChange={(e) => set('etymology_en', e.target.value)} className="input min-h-[120px] resize-y" placeholder="Detailed etymology explanation..." />
            </div>
            <div>
              <label className="label">Etymology (Tamil)</label>
              <textarea value={form.etymology_ta} onChange={(e) => set('etymology_ta', e.target.value)} className="input-tamil min-h-[100px] resize-y" dir="auto" placeholder="சொல்லுற்பத்தி விளக்கம்..." />
            </div>
            <div>
              <label className="label">Linguistic Notes</label>
              <textarea value={form.linguistic_notes} onChange={(e) => set('linguistic_notes', e.target.value)} className="input min-h-[80px] resize-y" placeholder="Academic linguistic notes, references..." />
            </div>
          </div>

          {/* Derived words */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider">
                Derived Words ({form.derived_words.length})
              </h2>
              <button onClick={addDerived} className="btn-secondary btn-sm">
                <Plus className="w-3.5 h-3.5" /> Add Language
              </button>
            </div>

            {form.derived_words.map((dw, i) => (
              <div key={i} className="bg-clay-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-700">Derived word {i + 1}</span>
                  <button onClick={() => removeDerived(i)} className="text-red-500"><Minus className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Language</label>
                    <select
                      value={dw.language_id}
                      onChange={(e) => updateDerived(i, 'language_id', e.target.value)}
                      className="input"
                    >
                      <option value="">Select language...</option>
                      {languages.map((l) => <option key={l.id} value={l.id}>{l.name_en} ({l.iso_code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Derived Word</label>
                    <input type="text" value={dw.word} onChange={(e) => updateDerived(i, 'word', e.target.value)} className="input" placeholder="Word in target language" />
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Meaning</label>
                  <input type="text" value={dw.meaning} onChange={(e) => updateDerived(i, 'meaning', e.target.value)} className="input" placeholder="Meaning in that language" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Example Sentence</label>
                    <input type="text" value={dw.example ?? ''} onChange={(e) => updateDerived(i, 'example', e.target.value)} className="input" placeholder="Optional example" />
                  </div>
                  <div>
                    <label className="label text-xs">Notes</label>
                    <input type="text" value={dw.notes ?? ''} onChange={(e) => updateDerived(i, 'notes', e.target.value)} className="input" placeholder="Optional notes" />
                  </div>
                </div>
              </div>
            ))}

            {form.derived_words.length === 0 && (
              <p className="text-sm text-ink-400 text-center py-4">No derived words yet. Click "Add Language" to add cross-language influence.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="card p-5">
            <label className="label">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="pending_review">Pending Review</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="card p-5">
            <label className="label">URL Slug</label>
            <div className="flex gap-1 items-center mt-1">
              <span className="text-xs text-ink-400">/root/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }}
                className="input flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <div className="card p-5">
            <label className="label">Tags</label>
            <TagPicker allTags={tags} selected={form.tags} onChange={(ids) => set('tags', ids)} />
          </div>
        </div>
      </div>
    </div>
  )
}
