import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Minus, Upload, Loader2, AlertTriangle, Eye, Save, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { wordsApi } from '@/lib/api/words'
import { supabase, uploadFile } from '@/lib/supabase'
import { TagPicker } from '@/components/ui'
import { useRefDataStore } from '@/store'
import { generateSlug } from '@/hooks'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import type { Word, UsageExample, WordType } from '@/types'

const WORD_TYPES: WordType[] = ['noun', 'verb', 'adjective', 'adverb', 'idiom', 'phrase', 'exclamation', 'other']

interface FormData {
  word_ta: string
  word_transliteration: string
  word_en: string
  meaning_ta: string
  meaning_en: string
  word_type: WordType
  region_id: string
  cultural_context_en: string
  cultural_context_ta: string
  pronunciation_guide: string
  usage_examples: UsageExample[]
  tags: string[]
  status: string
  seo_title: string
  seo_description: string
}

const EMPTY_FORM: FormData = {
  word_ta: '', word_transliteration: '', word_en: '', meaning_ta: '', meaning_en: '',
  word_type: 'other', region_id: '', cultural_context_en: '', cultural_context_ta: '',
  pronunciation_guide: '', usage_examples: [], tags: [], status: 'draft',
  seo_title: '', seo_description: '',
}

export function AdminWordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { regions, tags } = useRefDataStore()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [duplicates, setDuplicates] = useState<Partial<Word>[]>([])

  // Load existing word for edit
  const { data: existingWord } = useQuery({
    queryKey: ['word-edit', id],
    queryFn: () => wordsApi.getById(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingWord && isEdit) {
      setForm({
        word_ta: existingWord.word_ta,
        word_transliteration: existingWord.word_transliteration,
        word_en: existingWord.word_en ?? '',
        meaning_ta: existingWord.meaning_ta,
        meaning_en: existingWord.meaning_en,
        word_type: existingWord.word_type,
        region_id: existingWord.region_id ?? '',
        cultural_context_en: existingWord.cultural_context_en ?? '',
        cultural_context_ta: existingWord.cultural_context_ta ?? '',
        pronunciation_guide: existingWord.pronunciation_guide ?? '',
        usage_examples: existingWord.usage_examples,
        tags: existingWord.tags,
        status: existingWord.status,
        seo_title: existingWord.seo_title ?? '',
        seo_description: existingWord.seo_description ?? '',
      })
      setSlug(existingWord.slug)
      setSlugManual(true)
      if (existingWord.media) setImagePreview(existingWord.media.public_url)
    }
  }, [existingWord, isEdit])

  // Auto-generate slug from transliteration
  useEffect(() => {
    if (!slugManual && form.word_transliteration) {
      setSlug(generateSlug(form.word_transliteration))
    }
  }, [form.word_transliteration, slugManual])

  // Duplicate detection
  useEffect(() => {
    if (form.word_ta.length < 2) return
    const timer = setTimeout(async () => {
      const dupes = await wordsApi.checkDuplicate(form.word_ta, id)
      setDuplicates(dupes)
    }, 500)
    return () => clearTimeout(timer)
  }, [form.word_ta, id])

  const set = (k: keyof FormData, v: any) => setForm((f) => ({ ...f, [k]: v }))

  // Image dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  })

  // Usage examples
  const addExample = () => set('usage_examples', [...form.usage_examples, { ta: '', en: '', transliteration: '' }])
  const removeExample = (i: number) => set('usage_examples', form.usage_examples.filter((_, idx) => idx !== i))
  const updateExample = (i: number, key: keyof UsageExample, value: string) => {
    const updated = [...form.usage_examples]
    updated[i] = { ...updated[i], [key]: value }
    set('usage_examples', updated)
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (publish?: boolean) => {
      const { data: { user } } = await supabase.auth.getUser()

      let media_id = existingWord?.media_id ?? null

      // Upload image if selected
      if (imageFile) {
        setUploading(true)
        const { path, url } = await uploadFile(imageFile, 'words')
        const { data: mediaData } = await supabase
          .from('media_assets')
          .insert({
            storage_path: path,
            public_url: url,
            file_name: imageFile.name,
            file_size: imageFile.size,
            mime_type: imageFile.type,
            uploaded_by: user?.id,
            alt_text: form.word_en || form.word_transliteration,
          })
          .select()
          .single()
        media_id = mediaData?.id ?? null
        setUploading(false)
      }

      const payload = {
        word_ta: form.word_ta,
        word_transliteration: form.word_transliteration,
        word_en: form.word_en || null,
        meaning_ta: form.meaning_ta,
        meaning_en: form.meaning_en,
        word_type: form.word_type,
        status: (publish ? 'published' : form.status) as any,
        region_id: form.region_id || null,
        media_id,
        cultural_context_en: form.cultural_context_en || null,
        cultural_context_ta: form.cultural_context_ta || null,
        pronunciation_guide: form.pronunciation_guide || null,
        usage_examples: form.usage_examples,
        tags: form.tags,
        slug: slug || generateSlug(form.word_transliteration),
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
        audio_url: null,
        published_at: publish ? new Date().toISOString() : (existingWord?.published_at ?? null),
      }

      if (isEdit && id) {
        return wordsApi.update(id, payload)
      } else {
        return wordsApi.create(payload)
      }
    },
    onSuccess: (word) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'words'] })
      toast.success(isEdit ? 'Word updated!' : 'Word created!')
      navigate('/admin/words')
    },
    onError: (err: any) => {
      toast.error(err.message ?? 'Save failed')
      setUploading(false)
    },
  })

  const isValid = form.word_ta && form.word_transliteration && form.meaning_ta && form.meaning_en

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          {isEdit ? 'Edit Word' : 'Add New Word'}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/admin/words')} className="btn-ghost">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate(false)}
            disabled={!isValid || saveMutation.isPending}
            className="btn-secondary"
          >
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button
            onClick={() => saveMutation.mutate(true)}
            disabled={!isValid || saveMutation.isPending}
            className="btn-primary"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Possible duplicates detected:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {duplicates.map((d) => (
                <a key={d.id} href={`/admin/words/${d.id}/edit`} className="badge bg-amber-100 text-amber-700">
                  {d.word_ta} — {d.word_transliteration}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Core word info */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider">Word Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Tamil Word <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.word_ta}
                  onChange={(e) => set('word_ta', e.target.value)}
                  className="input-tamil"
                  placeholder="e.g. மொழி"
                  dir="auto"
                />
              </div>
              <div>
                <label className="label">Transliteration <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.word_transliteration}
                  onChange={(e) => { set('word_transliteration', e.target.value); setSlugManual(false) }}
                  className="input"
                  placeholder="e.g. mozhi"
                />
              </div>
            </div>

            <div>
              <label className="label">English Word / Equivalent</label>
              <input type="text" value={form.word_en} onChange={(e) => set('word_en', e.target.value)} className="input" placeholder="e.g. language" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Word Type</label>
                <select value={form.word_type} onChange={(e) => set('word_type', e.target.value as WordType)} className="input">
                  {WORD_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Region</label>
                <select value={form.region_id} onChange={(e) => set('region_id', e.target.value)} className="input">
                  <option value="">Select region...</option>
                  {regions.map((r) => <option key={r.id} value={r.id}>{r.name_en} — {r.name_ta}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label">URL Slug</label>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-ink-400">/word/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }}
                  className="input flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Meanings */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider">Meanings</h2>
            <div>
              <label className="label">Meaning in English <span className="text-red-500">*</span></label>
              <textarea value={form.meaning_en} onChange={(e) => set('meaning_en', e.target.value)} className="input min-h-[80px] resize-y" placeholder="Clear English definition..." />
            </div>
            <div>
              <label className="label">Meaning in Tamil <span className="text-red-500">*</span></label>
              <textarea value={form.meaning_ta} onChange={(e) => set('meaning_ta', e.target.value)} className="input-tamil min-h-[80px] resize-y" placeholder="தமிழில் பொருள்..." dir="auto" />
            </div>
            <div>
              <label className="label">Pronunciation Guide</label>
              <input type="text" value={form.pronunciation_guide} onChange={(e) => set('pronunciation_guide', e.target.value)} className="input font-mono" placeholder="e.g. /mo·ˈʑi/" />
            </div>
          </div>

          {/* Usage examples */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider">Usage Examples</h2>
              <button onClick={addExample} className="btn-secondary btn-sm">
                <Plus className="w-3.5 h-3.5" /> Add Example
              </button>
            </div>

            {form.usage_examples.map((ex, i) => (
              <div key={i} className="bg-clay-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-700">Example {i + 1}</span>
                  <button onClick={() => removeExample(i)} className="text-red-500 hover:text-red-700">
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={ex.ta}
                  onChange={(e) => updateExample(i, 'ta', e.target.value)}
                  className="input-tamil"
                  placeholder="Tamil sentence..."
                  dir="auto"
                />
                <input
                  type="text"
                  value={ex.transliteration ?? ''}
                  onChange={(e) => updateExample(i, 'transliteration', e.target.value)}
                  className="input italic"
                  placeholder="Transliteration..."
                />
                <input
                  type="text"
                  value={ex.en}
                  onChange={(e) => updateExample(i, 'en', e.target.value)}
                  className="input"
                  placeholder="English translation..."
                />
              </div>
            ))}
          </div>

          {/* Cultural context */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider">Cultural Context</h2>
            <div>
              <label className="label">English</label>
              <textarea value={form.cultural_context_en} onChange={(e) => set('cultural_context_en', e.target.value)} className="input min-h-[100px] resize-y" placeholder="Cultural significance, usage context..." />
            </div>
            <div>
              <label className="label">Tamil</label>
              <textarea value={form.cultural_context_ta} onChange={(e) => set('cultural_context_ta', e.target.value)} className="input-tamil min-h-[100px] resize-y" placeholder="கலாச்சார சூழல்..." dir="auto" />
            </div>
          </div>

          {/* SEO */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-ink-900 text-sm uppercase tracking-wider">SEO</h2>
            <div>
              <label className="label">SEO Title</label>
              <input type="text" value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} className="input" placeholder="Custom page title..." />
            </div>
            <div>
              <label className="label">SEO Description</label>
              <textarea value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} className="input resize-y" placeholder="Meta description (max 160 chars)" maxLength={160} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Status */}
          <div className="card p-5">
            <label className="label">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="pending_review">Pending Review</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Image upload */}
          <div className="card p-5">
            <label className="label">Image</label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="" className="w-full h-40 object-cover rounded-xl" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-clay-500 bg-clay-50' : 'border-clay-200 hover:border-clay-400'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-clay-400" />
                <p className="text-sm text-ink-600">{isDragActive ? 'Drop image here' : 'Drop or click to upload'}</p>
                <p className="text-xs text-ink-400 mt-1">JPG, PNG, WebP — max 5MB</p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="card p-5">
            <label className="label">Tags</label>
            <TagPicker
              allTags={tags}
              selected={form.tags}
              onChange={(ids) => set('tags', ids)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
