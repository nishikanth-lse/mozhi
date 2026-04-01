import { supabase } from '@/lib/supabase'
import type { Word, WordFilters, PaginatedResult } from '@/types'

const WORDS_SELECT = `
  *,
  region:regions(id, name_en, name_ta, slug, country),
  media:media_assets(id, public_url, alt_text, file_name)
`

export const wordsApi = {
  async list(filters: WordFilters = {}): Promise<PaginatedResult<Word>> {
    const {
      search,
      region_ids,
      tag_ids,
      word_type,
      status = 'published',
      sort = 'recent',
      page = 1,
      limit = 20,
    } = filters

    let query = supabase
      .from('words')
      .select(WORDS_SELECT, { count: 'exact' })
      .eq('status', status)

    // Full-text search
    if (search && search.length >= 2) {
      query = query.or(
        `word_ta.ilike.%${search}%,word_transliteration.ilike.%${search}%,meaning_en.ilike.%${search}%,meaning_ta.ilike.%${search}%`
      )
    }

    if (region_ids && region_ids.length > 0) {
      query = query.in('region_id', region_ids)
    }

    if (tag_ids && tag_ids.length > 0) {
      query = query.overlaps('tags', tag_ids)
    }

    if (word_type) {
      query = query.eq('word_type', word_type)
    }

    // Sorting
    switch (sort) {
      case 'alphabetical':
        query = query.order('word_transliteration', { ascending: true })
        break
      case 'popular':
        query = query.order('view_count', { ascending: false })
        break
      case 'votes':
        query = query.order('vote_count', { ascending: false })
        break
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false })
    }

    // Pagination
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data as Word[],
      count: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    }
  },

  async getBySlug(slug: string): Promise<Word | null> {
    const { data, error } = await supabase
      .from('words')
      .select(WORDS_SELECT)
      .eq('slug', slug)
      .single()

    if (error) return null
    return data as Word
  },

  async getById(id: string): Promise<Word | null> {
    const { data, error } = await supabase
      .from('words')
      .select(WORDS_SELECT)
      .eq('id', id)
      .single()

    if (error) return null
    return data as Word
  },

  async getTrending(limit = 10): Promise<Word[]> {
    const { data, error } = await supabase
      .from('words')
      .select(WORDS_SELECT)
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as Word[]
  },

  async getRecent(limit = 8): Promise<Word[]> {
    const { data, error } = await supabase
      .from('words')
      .select(WORDS_SELECT)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as Word[]
  },

  async create(word: Omit<Word, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'search_count' | 'vote_count'>): Promise<Word> {
    const { data, error } = await supabase
      .from('words')
      .insert(word)
      .select(WORDS_SELECT)
      .single()

    if (error) throw error
    return data as Word
  },

  async update(id: string, updates: Partial<Word>): Promise<Word> {
    const { data, error } = await supabase
      .from('words')
      .update(updates)
      .eq('id', id)
      .select(WORDS_SELECT)
      .single()

    if (error) throw error
    return data as Word
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('words').delete().eq('id', id)
    if (error) throw error
  },

  async bulkDelete(ids: string[]): Promise<void> {
    const { error } = await supabase.from('words').delete().in('id', ids)
    if (error) throw error
  },

  async incrementView(id: string): Promise<void> {
    await supabase.rpc('increment_view_count', {
      p_entity_type: 'word',
      p_entity_id: id,
    })
  },

  async checkDuplicate(wordTa: string, excludeId?: string): Promise<Word[]> {
    let query = supabase
      .from('words')
      .select('id, word_ta, word_transliteration, meaning_en, slug')
      .ilike('word_ta', `%${wordTa}%`)
      .limit(5)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query
    return (data as Word[]) ?? []
  },

  async adminList(filters: Omit<WordFilters, 'status'> & { status?: string }): Promise<PaginatedResult<Word>> {
    const { status, page = 1, limit = 20, search, sort = 'recent' } = filters

    let query = supabase
      .from('words')
      .select(WORDS_SELECT, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (search) {
      query = query.or(
        `word_ta.ilike.%${search}%,word_transliteration.ilike.%${search}%,meaning_en.ilike.%${search}%`
      )
    }

    switch (sort) {
      case 'alphabetical':
        query = query.order('word_transliteration', { ascending: true })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: data as Word[],
      count: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    }
  },
}
