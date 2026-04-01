import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Upload, Search, Eye, CheckCircle,
  AlertCircle, FileDown, Loader2, X
} from 'lucide-react'
import Papa from 'papaparse'
import { wordsApi } from '@/lib/api/words'
import { supabase } from '@/lib/supabase'
import { StatusBadge, ConfirmDialog, Pagination } from '@/components/ui'
import { useRefDataStore } from '@/store'
import { useDebounce } from '@/hooks'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import type { Word, WordCSVRow } from '@/types'

export function AdminWordsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { getRegionById } = useRefDataStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'words', { search: debouncedSearch, status: statusFilter, page }],
    queryFn: () => wordsApi.adminList({ search: debouncedSearch, status: statusFilter || undefined, page, limit: 20 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wordsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'words'] })
      toast.success('Word deleted')
      setDeleteId(null)
    },
    onError: () => toast.error('Delete failed'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => wordsApi.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'words'] })
      toast.success(`${selectedIds.length} words deleted`)
      setSelectedIds([])
    },
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      wordsApi.update(id, { status: status as any, published_at: status === 'published' ? new Date().toISOString() : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'words'] })
      toast.success('Status updated')
    },
  })

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    const allIds = data?.data.map((w) => w.id) ?? []
    setSelectedIds(selectedIds.length === allIds.length ? [] : allIds)
  }

  // CSV Import
  const handleCSVImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    Papa.parse<WordCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let success = 0, failed = 0
        for (const row of results.data) {
          try {
            const slug = row.word_transliteration.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100)
            await wordsApi.create({
              word_ta: row.word_ta,
              word_transliteration: row.word_transliteration,
              word_en: row.word_en ?? null,
              meaning_ta: row.meaning_ta,
              meaning_en: row.meaning_en,
              word_type: row.word_type ?? 'other',
              status: 'draft',
              slug: `${slug}-${Date.now()}`,
              region_id: null,
              media_id: null,
              usage_examples: [],
              cultural_context_ta: null,
              cultural_context_en: row.cultural_context_en ?? null,
              pronunciation_guide: null,
              audio_url: null,
              tags: [],
              seo_title: null,
              seo_description: null,
              created_by: null,
              updated_by: null,
              published_at: null,
            })
            success++
          } catch {
            failed++
          }
        }
        queryClient.invalidateQueries({ queryKey: ['admin', 'words'] })
        toast.success(`Imported ${success} words. ${failed > 0 ? `${failed} failed.` : ''}`)
        setImporting(false)
        e.target.value = ''
      },
      error: () => {
        toast.error('CSV parse error')
        setImporting(false)
      },
    })
  }, [queryClient])

  const downloadCSVTemplate = () => {
    const headers = ['word_ta', 'word_transliteration', 'word_en', 'meaning_ta', 'meaning_en', 'word_type', 'region_slug', 'cultural_context_en', 'tags']
    const csv = Papa.unparse([headers, ['மொழி', 'mozhi', 'language', 'மொழி என்பது...', 'Language is...', 'noun', 'madurai', 'Cultural context here', 'colloquial,formal']])
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'mozhi-words-template.csv'; a.click()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Words</h1>
          <p className="text-ink-500 text-sm mt-0.5">
            {data?.count.toLocaleString() ?? '—'} total entries
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSVTemplate} className="btn-secondary btn-sm">
            <FileDown className="w-4 h-4" /> Template
          </button>
          <label className={clsx('btn-secondary btn-sm cursor-pointer', importing && 'opacity-50 cursor-not-allowed')}>
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import CSV
            <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" disabled={importing} />
          </label>
          <Link to="/admin/words/new" className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Add Word
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search words..."
            className="input pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="input w-auto"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="archived">Archived</option>
        </select>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-ink-600">{selectedIds.length} selected</span>
            <button
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="btn-danger btn-sm"
            >
              <Trash2 className="w-4 h-4" /> Delete selected
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === (data?.data.length ?? 0) && (data?.data.length ?? 0) > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th>Word</th>
                <th>Transliteration</th>
                <th>Meaning (EN)</th>
                <th>Region</th>
                <th>Type</th>
                <th>Status</th>
                <th>Views</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j}><div className="skeleton h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : (data?.data ?? []).map((word) => (
                <tr key={word.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(word.id)}
                      onChange={() => toggleSelected(word.id)}
                      className="rounded"
                    />
                  </td>
                  <td>
                    <span className="font-tamil text-lg font-bold text-clay-800">{word.word_ta}</span>
                  </td>
                  <td className="text-ink-600 italic">{word.word_transliteration}</td>
                  <td className="max-w-[200px] truncate text-ink-700">{word.meaning_en}</td>
                  <td className="text-ink-500 text-xs">
                    {word.region_id ? getRegionById(word.region_id)?.name_en : '—'}
                  </td>
                  <td>
                    <span className="badge bg-clay-100 text-clay-700 capitalize text-xs">{word.word_type}</span>
                  </td>
                  <td><StatusBadge status={word.status} /></td>
                  <td className="text-ink-500 text-xs">{word.view_count.toLocaleString()}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => publishMutation.mutate({
                          id: word.id,
                          status: word.status === 'published' ? 'draft' : 'published'
                        })}
                        className={clsx(
                          'p-1.5 rounded-lg transition-colors',
                          word.status === 'published'
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-ink-400 hover:bg-clay-50'
                        )}
                        title={word.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/word/${word.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-ink-400 hover:bg-clay-50 transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/admin/words/${word.id}/edit`}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteId(word.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isLoading && !data?.data.length && (
            <div className="text-center py-12 text-ink-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No words found
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={data?.total_pages ?? 1} onChange={setPage} />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Word"
        message="This action cannot be undone. The word will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </div>
  )
}
