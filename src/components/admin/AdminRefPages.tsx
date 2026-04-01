import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Save, X, Check, XCircle } from 'lucide-react'
import { regionsApi, tagsApi } from '@/lib/api/reference'
import { supabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/ui'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import type { Region, Tag } from '@/types'

// ─── Regions Management ───────────────────────────────────
export function AdminRegionsPage() {
  const queryClient = useQueryClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name_en: '', name_ta: '', slug: '', country: 'India', description: '' })

  const { data: regions = [], isLoading } = useQuery({ queryKey: ['regions'], queryFn: regionsApi.list })

  const createMutation = useMutation({
    mutationFn: () => regionsApi.create({ ...form }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['regions'] }); setAdding(false); setForm({ name_en: '', name_ta: '', slug: '', country: 'India', description: '' }); toast.success('Region created') },
    onError: () => toast.error('Failed to create region'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Region> }) => regionsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['regions'] }); setEditId(null); toast.success('Region updated') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => regionsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['regions'] }); setDeleteId(null); toast.success('Region deleted') },
  })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Regions</h1>
        <button onClick={() => setAdding(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add Region
        </button>
      </div>

      {adding && (
        <div className="card p-5 mb-4 space-y-3">
          <h3 className="font-semibold text-ink-900">New Region</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Name (English)</label><input type="text" value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} className="input" /></div>
            <div><label className="label">Name (Tamil)</label><input type="text" value={form.name_ta} onChange={(e) => setForm((f) => ({ ...f, name_ta: e.target.value }))} className="input-tamil" dir="auto" /></div>
            <div><label className="label">Slug</label><input type="text" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="input font-mono text-sm" /></div>
            <div><label className="label">Country</label><input type="text" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className="input" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate()} disabled={!form.name_en || !form.slug} className="btn-primary btn-sm"><Save className="w-3.5 h-3.5" /> Save</button>
            <button onClick={() => setAdding(false)} className="btn-ghost btn-sm"><X className="w-3.5 h-3.5" /> Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="admin-table">
          <thead><tr><th>Region</th><th>Tamil</th><th>Country</th><th>Slug</th><th>Actions</th></tr></thead>
          <tbody>
            {(regions ?? []).map((region) => (
              <tr key={region.id}>
                <td className="font-medium text-ink-800">{region.name_en}</td>
                <td className="font-tamil text-clay-700">{region.name_ta}</td>
                <td className="text-ink-500 text-sm">{region.country}</td>
                <td className="font-mono text-xs text-ink-400">{region.slug}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => setEditId(region.id)} className="p-1.5 rounded text-blue-500 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(region.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteId} title="Delete Region" message="Words linked to this region will lose their region association."
        confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} danger
      />
    </div>
  )
}

// ─── Tags Management ───────────────────────────────────────
export function AdminTagsPage() {
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTag, setNewTag] = useState({ name_en: '', name_ta: '', slug: '', color: '#8a7a61' })

  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list })

  const createMutation = useMutation({
    mutationFn: () => tagsApi.create(newTag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setAdding(false)
      setNewTag({ name_en: '', name_ta: '', slug: '', color: '#8a7a61' })
      toast.success('Tag created')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tags'] }); setDeleteId(null); toast.success('Tag deleted') },
  })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Tags</h1>
        <button onClick={() => setAdding(true)} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Tag</button>
      </div>

      {adding && (
        <div className="card p-5 mb-4 space-y-3">
          <h3 className="font-semibold">New Tag</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Name (English)</label><input type="text" value={newTag.name_en} onChange={(e) => setNewTag((t) => ({ ...t, name_en: e.target.value }))} className="input" /></div>
            <div><label className="label">Name (Tamil)</label><input type="text" value={newTag.name_ta} onChange={(e) => setNewTag((t) => ({ ...t, name_ta: e.target.value }))} className="input-tamil" dir="auto" /></div>
            <div><label className="label">Slug</label><input type="text" value={newTag.slug} onChange={(e) => setNewTag((t) => ({ ...t, slug: e.target.value }))} className="input font-mono text-sm" /></div>
            <div><label className="label">Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={newTag.color} onChange={(e) => setNewTag((t) => ({ ...t, color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border border-clay-200" />
                <input type="text" value={newTag.color} onChange={(e) => setNewTag((t) => ({ ...t, color: e.target.value }))} className="input flex-1 font-mono text-sm" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate()} disabled={!newTag.name_en || !newTag.slug} className="btn-primary btn-sm"><Save className="w-3.5 h-3.5" /> Save</button>
            <button onClick={() => setAdding(false)} className="btn-ghost btn-sm"><X className="w-3.5 h-3.5" /> Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="admin-table">
          <thead><tr><th>Tag</th><th>Tamil</th><th>Slug</th><th>Color</th><th>Actions</th></tr></thead>
          <tbody>
            {(tags ?? []).map((tag) => (
              <tr key={tag.id}>
                <td>
                  <span className="badge" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>{tag.name_en}</span>
                </td>
                <td className="font-tamil text-clay-700">{tag.name_ta}</td>
                <td className="font-mono text-xs text-ink-400">{tag.slug}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: tag.color }} />
                    <span className="font-mono text-xs text-ink-400">{tag.color}</span>
                  </div>
                </td>
                <td>
                  <button onClick={() => setDeleteId(tag.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog open={!!deleteId} title="Delete Tag" message="This will remove the tag from all entries." confirmLabel="Delete" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} danger />
    </div>
  )
}

// ─── Contributions Management ─────────────────────────────
export function AdminContributionsPage() {
  const queryClient = useQueryClient()

  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ['admin', 'contributions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contributions')
        .select('*, contributor:profiles(full_name, email)')
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('contributions').update({
        status,
        reviewer_id: user?.id,
        reviewer_notes: notes ?? null,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'contributions'] }); toast.success('Contribution reviewed') },
  })

  const pending = (contributions as any[]).filter((c) => c.status === 'pending')
  const reviewed = (contributions as any[]).filter((c) => c.status !== 'pending')

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-900 mb-6">Contributions</h1>

      {pending.length === 0 && !isLoading && (
        <div className="card p-10 text-center text-ink-500 mb-6">
          <Check className="w-10 h-10 mx-auto mb-2 text-green-400" />
          <p className="font-medium">All caught up! No pending contributions.</p>
        </div>
      )}

      {pending.map((c: any) => (
        <div key={c.id} className="card p-5 mb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-saffron capitalize">{c.type}</span>
                <span className="text-xs text-ink-400">
                  by {c.contributor?.full_name ?? c.contributor?.email ?? 'Unknown'} ·{' '}
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="bg-clay-50 rounded-lg p-3 text-sm">
                <pre className="whitespace-pre-wrap text-ink-700 text-xs font-mono overflow-auto max-h-40">
                  {JSON.stringify(c.data, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => reviewMutation.mutate({ id: c.id, status: 'approved' })}
                className="btn-sm btn flex items-center gap-1.5 bg-green-600 text-white hover:bg-green-700"
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => reviewMutation.mutate({ id: c.id, status: 'rejected' })}
                className="btn-sm btn border border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>
        </div>
      ))}

      {reviewed.length > 0 && (
        <div>
          <h2 className="font-semibold text-ink-700 mb-3 mt-6">Reviewed</h2>
          <div className="card overflow-hidden">
            <table className="admin-table">
              <thead><tr><th>Type</th><th>Contributor</th><th>Status</th><th>Reviewed</th></tr></thead>
              <tbody>
                {reviewed.map((c: any) => (
                  <tr key={c.id}>
                    <td><span className="badge badge-clay capitalize">{c.type}</span></td>
                    <td className="text-ink-600 text-sm">{c.contributor?.full_name ?? c.contributor?.email ?? 'Unknown'}</td>
                    <td>
                      <span className={clsx('badge', c.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {c.status}
                      </span>
                    </td>
                    <td className="text-ink-400 text-xs">{c.reviewed_at ? new Date(c.reviewed_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
