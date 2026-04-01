import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRefDataStore } from '@/store'
import { useAuth } from '@/hooks'
import toast from 'react-hot-toast'

export function ContributePage() {
  const [searchParams] = useSearchParams()
  const { regions, tags } = useRefDataStore()
  const { isAuthenticated, profile } = useAuth()
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    word_ta: '',
    word_transliteration: '',
    word_en: '',
    meaning_ta: '',
    meaning_en: '',
    word_type: 'other',
    region_id: '',
    cultural_context_en: '',
    example_ta: '',
    example_en: '',
    tags: [] as string[],
    contributor_notes: '',
  })

  useEffect(() => {
    document.title = 'Contribute a Word | Mozhi'
  }, [])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('contributions').insert({
        contributor_id: user?.id ?? null,
        type: 'word',
        data: {
          word_ta: form.word_ta,
          word_transliteration: form.word_transliteration,
          word_en: form.word_en || null,
          meaning_ta: form.meaning_ta,
          meaning_en: form.meaning_en,
          word_type: form.word_type,
          region_id: form.region_id || null,
          cultural_context_en: form.cultural_context_en || null,
          usage_examples: form.example_ta
            ? [{ ta: form.example_ta, en: form.example_en, transliteration: '' }]
            : [],
          tags: form.tags,
          contributor_notes: form.contributor_notes,
        },
        status: 'pending',
      })
      if (error) throw error
    },
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => toast.error(err.message ?? 'Submission failed'),
  })

  const isValid = form.word_ta && form.word_transliteration && form.meaning_en

  if (submitted) {
    return (
      <div className="page-container py-20 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="font-display text-3xl font-bold text-ink-900 mb-3">Thank You!</h1>
        <p className="text-ink-600 mb-2">Your word has been submitted for review.</p>
        <p className="font-tamil text-clay-600 mb-6">உங்கள் பங்களிப்புக்கு நன்றி!</p>
        <p className="text-sm text-ink-500 mb-8">
          Our team will review your submission and publish it if it meets our quality standards. This usually takes 1–3 days.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSubmitted(false); setForm({ word_ta: '', word_transliteration: '', word_en: '', meaning_ta: '', meaning_en: '', word_type: 'other', region_id: '', cultural_context_en: '', example_ta: '', example_en: '', tags: [], contributor_notes: '' }) }} className="btn-primary">
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container py-10 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-ink-900">Contribute a Word</h1>
        <p className="font-tamil text-ink-500 mt-1 text-lg">ஒரு சொல்லை பகிருங்கள்</p>
        <p className="text-ink-600 mt-3 leading-relaxed">
          Help preserve Tamil's rich linguistic diversity. Submit a dialect word, regional slang, or cultural expression.
          All contributions are reviewed before publishing.
        </p>
      </div>

      {!isAuthenticated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <strong>Note:</strong> You can submit without an account, but creating one lets you track your contributions.
        </div>
      )}

      <div className="card p-8 space-y-6">
        {/* Core */}
        <div>
          <h2 className="font-semibold text-ink-900 mb-4 text-sm uppercase tracking-wider">The Word</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tamil Word <span className="text-red-500">*</span></label>
              <input type="text" value={form.word_ta} onChange={(e) => set('word_ta', e.target.value)} className="input-tamil text-xl" placeholder="e.g. கலக்கல்" dir="auto" />
            </div>
            <div>
              <label className="label">Transliteration <span className="text-red-500">*</span></label>
              <input type="text" value={form.word_transliteration} onChange={(e) => set('word_transliteration', e.target.value)} className="input" placeholder="e.g. kalakkal" />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">English equivalent <span className="text-ink-400 font-normal">(optional)</span></label>
            <input type="text" value={form.word_en} onChange={(e) => set('word_en', e.target.value)} className="input" placeholder="e.g. awesome, excellent" />
          </div>
        </div>

        {/* Meanings */}
        <div>
          <h2 className="font-semibold text-ink-900 mb-4 text-sm uppercase tracking-wider">Meanings</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Meaning in English <span className="text-red-500">*</span></label>
              <textarea value={form.meaning_en} onChange={(e) => set('meaning_en', e.target.value)} className="input resize-none" rows={2} placeholder="Clear English definition..." />
            </div>
            <div>
              <label className="label">Meaning in Tamil <span className="text-ink-400 font-normal">(optional but helpful)</span></label>
              <textarea value={form.meaning_ta} onChange={(e) => set('meaning_ta', e.target.value)} className="input-tamil resize-none" rows={2} placeholder="தமிழில் பொருள்..." dir="auto" />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div>
          <h2 className="font-semibold text-ink-900 mb-4 text-sm uppercase tracking-wider">Classification</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Word Type</label>
              <select value={form.word_type} onChange={(e) => set('word_type', e.target.value)} className="input">
                {['noun','verb','adjective','adverb','idiom','phrase','exclamation','other'].map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Region / Origin</label>
              <select value={form.region_id} onChange={(e) => set('region_id', e.target.value)} className="input">
                <option value="">Not sure / General</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name_en} — {r.name_ta}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Example */}
        <div>
          <h2 className="font-semibold text-ink-900 mb-4 text-sm uppercase tracking-wider">Usage Example <span className="text-ink-400 font-normal normal-case">(optional)</span></h2>
          <div className="space-y-3">
            <div>
              <label className="label">Example in Tamil</label>
              <input type="text" value={form.example_ta} onChange={(e) => set('example_ta', e.target.value)} className="input-tamil" placeholder="Tamil sentence using the word..." dir="auto" />
            </div>
            <div>
              <label className="label">Example in English</label>
              <input type="text" value={form.example_en} onChange={(e) => set('example_en', e.target.value)} className="input" placeholder="English translation of the example..." />
            </div>
          </div>
        </div>

        {/* Cultural context */}
        <div>
          <label className="label">Cultural Context <span className="text-ink-400 font-normal">(optional)</span></label>
          <textarea value={form.cultural_context_en} onChange={(e) => set('cultural_context_en', e.target.value)} className="input resize-none" rows={3} placeholder="Any cultural significance, where/when it's used, age group, social context..." />
        </div>

        {/* Tags */}
        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => set('tags', form.tags.includes(tag.id) ? form.tags.filter(t => t !== tag.id) : [...form.tags, tag.id])}
                className="badge cursor-pointer transition-all"
                style={{
                  backgroundColor: form.tags.includes(tag.id) ? tag.color : `${tag.color}20`,
                  color: form.tags.includes(tag.id) ? '#fff' : tag.color,
                }}
              >
                {tag.name_en}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes for reviewers <span className="text-ink-400 font-normal">(optional)</span></label>
          <textarea value={form.contributor_notes} onChange={(e) => set('contributor_notes', e.target.value)} className="input resize-none" rows={2} placeholder="Any additional context for our review team..." />
        </div>

        <button
          onClick={() => submitMutation.mutate()}
          disabled={!isValid || submitMutation.isPending}
          className="btn-primary w-full justify-center py-3 text-base"
        >
          {submitMutation.isPending
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
            : <><Send className="w-5 h-5" /> Submit Contribution</>
          }
        </button>
      </div>
    </div>
  )
}
