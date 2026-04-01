import { supabase } from '@/lib/supabase'
import type { RootWord, RootWordFilters, PaginatedResult } from '@/types'

const ROOT_WORDS_SELECT = `
  *,
  media:media_assets(id, public_url, alt_text, file_name)
`

export const rootWordsApi = {
  async list(filters: RootWordFilters = {}): Promise<PaginatedResult<RootWord>> {
    const {
      search,
      tag_ids,
      status = 'published',
      sort = 'recent',
      page = 1,
      limit = 20,
    } = filters

    let query = supabase
      .from('root_words')
      .select(ROOT_WORDS_SELECT, { count: 'exact' })
      .eq('status', status)

    if (search && search.length >= 2) {
      query = query.or(
        `root_ta.ilike.%${search}%,root_transliteration.ilike.%${search}%,root_meaning_en.ilike.%${search}%,etymology_en.ilike.%${search}%`
      )
    }

    if (tag_ids && tag_ids.length > 0) {
      query = query.overlaps('tags', tag_ids)
    }

    switch (sort) {
      case 'alphabetical':
        query = query.order('root_transliteration', { ascending: true })
        break
      case 'popular':
        query = query.order('view_count', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: data as RootWord[],
      count: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    }
  },

  async getBySlug(slug: string): Promise<RootWord | null> {
    const { data, error } = await supabase
      .from('root_words')
      .select(ROOT_WORDS_SELECT)
      .eq('slug', slug)
      .single()

    if (error) return null
    return data as RootWord
  },

  async getById(id: string): Promise<RootWord | null> {
    const { data, error } = await supabase
      .from('root_words')
      .select(ROOT_WORDS_SELECT)
      .eq('id', id)
      .single()

    if (error) return null
    return data as RootWord
  },

  async create(rw: Omit<RootWord, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'vote_count'>): Promise<RootWord> {
    const { data, error } = await supabase
      .from('root_words')
      .insert(rw)
      .select(ROOT_WORDS_SELECT)
      .single()

    if (error) throw error
    return data as RootWord
  },

  async update(id: string, updates: Partial<RootWord>): Promise<RootWord> {
    const { data, error } = await supabase
      .from('root_words')
      .update(updates)
      .eq('id', id)
      .select(ROOT_WORDS_SELECT)
      .single()

    if (error) throw error
    return data as RootWord
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('root_words').delete().eq('id', id)
    if (error) throw error
  },

  async incrementView(id: string): Promise<void> {
    await supabase.rpc('increment_view_count', {
      p_entity_type: 'root_word',
      p_entity_id: id,
    })
  },

  async adminList(filters: { status?: string; search?: string; page?: number; limit?: number }): Promise<PaginatedResult<RootWord>> {
    const { status, search, page = 1, limit = 20 } = filters

    let query = supabase
      .from('root_words')
      .select(ROOT_WORDS_SELECT, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (search) {
      query = query.or(
        `root_ta.ilike.%${search}%,root_transliteration.ilike.%${search}%,root_meaning_en.ilike.%${search}%`
      )
    }

    query = query.order('created_at', { ascending: false })
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: data as RootWord[],
      count: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    }
  },
}
