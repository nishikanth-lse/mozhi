import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Minus, Loader2, X, Save, Eye, Trash2, Pencil, Search, AlertCircle, CheckCircle } from 'lucide-react'
import { rootWordsApi } from '@/lib/api/rootWords'
import { TagPicker, StatusBadge, ConfirmDialog, Pagination } from '@/components/ui'
import { useRefDataStore } from '@/store'
import { generateSlug } from '@/hooks'
import { useDebounce } from '@/hooks'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { DerivedWord } from '@/types'

// ─── Root Words List ───────────────────────────────────────
export function AdminRootWordsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'root-words', { search: debouncedSearch, page }],
    queryFn: () => rootWordsApi.adminList({ search: debouncedSearch, page, limit: 20 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rootWordsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'root-words'] })
      toast.success('Root word deleted')
      setDeleteId(null)
    },
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      rootWordsApi.update(id, { status: status as any, published_at: status === 'published' ? new Date().toISOString() : null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'root-words'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Root Words</h1>
          <p className="text-ink-500 text-sm">{data?.count.toLocaleString() ?? '—'} entries</p>
        </div>
        <Link to="/admin/root-words/new" className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add Root Word
        </Link>
      </div>

      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search root words..."
            className="input pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Root Word</th>
              <th>Transliteration</th>
              <th>Meaning</th>
              <th>Derived Words</th>
              <th>Status</th>
              <th>Views</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="skeleton h-4 w-full" /></td>)}</tr>
                ))
              : (data?.data ?? []).map((rw) => (
                  <tr key={rw.id}>
                    <td><span className="font-tamil text-lg font-bold text-clay-800">{rw.root_ta}</span></td>
                    <td className="italic text-ink-600">{rw.root_transliteration}</td>
                    <td className="max-w-[180px] truncate text-ink-700 text-sm">{rw.root_meaning_en}</td>
                    <td className="text-ink-500 text-sm">{rw.derived_words?.length ?? 0} words</td>
                    <td><StatusBadge status={rw.status} /></td>
                    <td className="text-ink-500 text-xs">{rw.view_count.toLocaleString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => publishMutation.mutate({ id: rw.id, status: rw.status === 'published' ? 'draft' : 'published' })}
                          className={rw.status === 'published' ? 'p-1.5 rounded text-green-600 hover:bg-green-50' : 'p-1.5 rounded text-ink-400 hover:bg-clay-50'}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <Link to={`/admin/root-words/${rw.id}/edit`} className="p-1.5 rounded text-blue-500 hover:bg-blue-50">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteId(rw.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50">
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

      <div className="mt-4">
        <Pagination page={page} totalPages={data?.total_pages ?? 1} onChange={setPage} />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Root Word"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        danger
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
