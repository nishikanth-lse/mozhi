// ============================================================
// MOZHI — Core TypeScript Types
// ============================================================

export type ContentStatus = 'draft' | 'published' | 'archived' | 'pending_review';
export type UserRole = 'admin' | 'contributor' | 'public';
export type WordType = 'noun' | 'verb' | 'adjective' | 'adverb' | 'idiom' | 'phrase' | 'exclamation' | 'other';
export type EntityType = 'word' | 'root_word';

// ─── Profile ───────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  bio: string | null;
  bookmarks: string[];
  created_at: string;
  updated_at: string;
}

// ─── Region ────────────────────────────────────────────────
export interface Region {
  id: string;
  name_en: string;
  name_ta: string;
  slug: string;
  country: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

// ─── Language ──────────────────────────────────────────────
export interface Language {
  id: string;
  name_en: string;
  name_ta: string | null;
  iso_code: string;
  family: string | null;
  script: string | null;
  created_at: string;
}

// ─── Tag ───────────────────────────────────────────────────
export interface Tag {
  id: string;
  name_en: string;
  name_ta: string | null;
  slug: string;
  color: string;
  created_at: string;
}

// ─── Media Asset ───────────────────────────────────────────
export interface MediaAsset {
  id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// ─── Usage Example ─────────────────────────────────────────
export interface UsageExample {
  ta: string;
  en: string;
  transliteration?: string;
}

// ─── Vernacular Word ───────────────────────────────────────
export interface Word {
  id: string;
  word_ta: string;
  word_transliteration: string;
  word_en: string | null;
  meaning_ta: string;
  meaning_en: string;
  word_type: WordType;
  status: ContentStatus;
  region_id: string | null;
  media_id: string | null;
  usage_examples: UsageExample[];
  cultural_context_ta: string | null;
  cultural_context_en: string | null;
  pronunciation_guide: string | null;
  audio_url: string | null;
  tags: string[];
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  view_count: number;
  search_count: number;
  vote_count: number;
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  region?: Region;
  media?: MediaAsset;
  tag_objects?: Tag[];
}

// ─── Derived Word (in Root Word) ───────────────────────────
export interface DerivedWord {
  language_id: string;
  language_name: string;
  language_iso: string;
  word: string;
  meaning: string;
  example?: string;
  notes?: string;
}

// ─── Root Word ─────────────────────────────────────────────
export interface RootWord {
  id: string;
  root_ta: string;
  root_transliteration: string;
  root_meaning_ta: string;
  root_meaning_en: string;
  etymology_ta: string | null;
  etymology_en: string;
  linguistic_notes: string | null;
  historical_period: string | null;
  derived_words: DerivedWord[];
  influence_map: Record<string, unknown>;
  status: ContentStatus;
  slug: string;
  tags: string[];
  media_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  view_count: number;
  vote_count: number;
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  media?: MediaAsset;
  tag_objects?: Tag[];
}

// ─── Contribution ──────────────────────────────────────────
export interface Contribution {
  id: string;
  contributor_id: string;
  type: EntityType;
  data: Partial<Word> | Partial<RootWord>;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  contributor?: Profile;
}

// ─── Vote ──────────────────────────────────────────────────
export interface Vote {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  value: 1 | -1;
  created_at: string;
}

// ─── Bookmark ──────────────────────────────────────────────
export interface Bookmark {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  created_at: string;
}

// ─── Filters & Query Params ────────────────────────────────
export interface WordFilters {
  search?: string;
  region_ids?: string[];
  tag_ids?: string[];
  word_type?: WordType;
  status?: ContentStatus;
  sort?: 'alphabetical' | 'recent' | 'popular' | 'votes';
  page?: number;
  limit?: number;
}

export interface RootWordFilters {
  search?: string;
  language_ids?: string[];
  tag_ids?: string[];
  status?: ContentStatus;
  sort?: 'alphabetical' | 'recent' | 'popular';
  page?: number;
  limit?: number;
}

// ─── Pagination ────────────────────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─── i18n ──────────────────────────────────────────────────
export type Locale = 'en' | 'ta';

// ─── Admin Stats ───────────────────────────────────────────
export interface AdminStats {
  total_words: number;
  published_words: number;
  draft_words: number;
  total_root_words: number;
  total_regions: number;
  total_users: number;
  pending_contributions: number;
  total_views: number;
}

// ─── CSV Import ────────────────────────────────────────────
export interface WordCSVRow {
  word_ta: string;
  word_transliteration: string;
  word_en?: string;
  meaning_ta: string;
  meaning_en: string;
  word_type?: WordType;
  region_slug?: string;
  cultural_context_en?: string;
  tags?: string; // comma-separated slugs
}
