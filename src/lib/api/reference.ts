import { supabase } from '@/lib/supabase'
import type { Region, Tag, Language, AdminStats, EntityType } from '@/types'

export const regionsApi = {
  async list(): Promise<Region[]> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name_en')
    if (error) throw error
    return data
  },
  async create(r: Omit<Region, 'id' | 'created_at'>): Promise<Region> {
    const { data, error } = await supabase.from('regions').insert(r).select().single()
    if (error) throw error
    return data
  },
  async update(id: string, r: Partial<Region>): Promise<Region> {
    const { data, error } = await supabase.from('regions').update(r).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('regions').delete().eq('id', id)
    if (error) throw error
  },
}

export const tagsApi = {
  async list(): Promise<Tag[]> {
    const { data, error } = await supabase.from('tags').select('*').order('name_en')
    if (error) throw error
    return data
  },
  async create(t: Omit<Tag, 'id' | 'created_at'>): Promise<Tag> {
    const { data, error } = await supabase.from('tags').insert(t).select().single()
    if (error) throw error
    return data
  },
  async update(id: string, t: Partial<Tag>): Promise<Tag> {
    const { data, error } = await supabase.from('tags').update(t).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) throw error
  },
}

export const languagesApi = {
  async list(): Promise<Language[]> {
    const { data, error } = await supabase.from('languages').select('*').order('name_en')
    if (error) throw error
    return data
  },
}

export const votesApi = {
  async vote(entityType: EntityType, entityId: string, value: 1 | -1): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: existing } = await supabase
      .from('votes')
      .select('id, value')
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single()

    if (existing) {
      if (existing.value === value) {
        // Remove vote (toggle)
        await supabase.from('votes').delete().eq('id', existing.id)
        const delta = value === 1 ? -1 : 1
        await supabase
          .from(entityType === 'word' ? 'words' : 'root_words')
          .update({ vote_count: supabase.rpc('coalesce', {}) })

        // Update vote_count via raw update
        const table = entityType === 'word' ? 'words' : 'root_words'
        await supabase.rpc('increment_view_count', { p_entity_type: entityType, p_entity_id: entityId })
        void delta; void table
      } else {
        await supabase.from('votes').update({ value }).eq('id', existing.id)
      }
    } else {
      await supabase.from('votes').insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        value,
      })
    }

    // Update vote_count
    const { data: votes } = await supabase
      .from('votes')
      .select('value')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)

    const total = (votes ?? []).reduce((sum, v) => sum + v.value, 0)
    const table = entityType === 'word' ? 'words' : 'root_words'
    await supabase.from(table).update({ vote_count: total }).eq('id', entityId)
  },

  async getUserVote(entityType: EntityType, entityId: string): Promise<1 | -1 | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
      .from('votes')
      .select('value')
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single()

    return data?.value ?? null
  },
}

export const bookmarksApi = {
  async toggle(entityType: EntityType, entityId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: existing } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single()

    if (existing) {
      await supabase.from('bookmarks').delete().eq('id', existing.id)
      return false
    } else {
      await supabase.from('bookmarks').insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
      })
      return true
    }
  },

  async isBookmarked(entityType: EntityType, entityId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single()

    return !!data
  },
}

export const adminApi = {
  async getStats(): Promise<AdminStats> {
    const [words, rootWords, regions, users, contributions] = await Promise.all([
      supabase.from('words').select('status', { count: 'exact', head: false }),
      supabase.from('root_words').select('id', { count: 'exact' }),
      supabase.from('regions').select('id', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('contributions').select('id', { count: 'exact' }).eq('status', 'pending'),
    ])

    const wordData = words.data ?? []
    const published = wordData.filter((w) => w.status === 'published').length
    const drafts = wordData.filter((w) => w.status === 'draft').length
    const totalViews = 0 // Could aggregate from words

    return {
      total_words: words.count ?? 0,
      published_words: published,
      draft_words: drafts,
      total_root_words: rootWords.count ?? 0,
      total_regions: regions.count ?? 0,
      total_users: users.count ?? 0,
      pending_contributions: contributions.count ?? 0,
      total_views: totalViews,
    }
  },
}
