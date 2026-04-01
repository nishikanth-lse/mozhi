-- ============================================================
-- MOZHI | மொழி — Tamil Language Preservation Platform
-- Supabase PostgreSQL Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- accent-insensitive search

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived', 'pending_review');
CREATE TYPE user_role AS ENUM ('admin', 'contributor', 'public');
CREATE TYPE word_type AS ENUM ('noun', 'verb', 'adjective', 'adverb', 'idiom', 'phrase', 'exclamation', 'other');

-- ============================================================
-- USER PROFILES & ROLES
-- ============================================================

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'public',
  bio         TEXT,
  bookmarks   UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- REGIONS
-- ============================================================

CREATE TABLE public.regions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en     TEXT NOT NULL UNIQUE,
  name_ta     TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  country     TEXT NOT NULL DEFAULT 'India',
  description TEXT,
  latitude    DECIMAL(9,6),
  longitude   DECIMAL(9,6),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Regions viewable by all" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage regions" ON public.regions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Seed regions
INSERT INTO public.regions (name_en, name_ta, slug, country) VALUES
  ('Madurai', 'மதுரை', 'madurai', 'India'),
  ('Chennai', 'சென்னை', 'chennai', 'India'),
  ('Kongu Nadu', 'கொங்கு நாடு', 'kongu-nadu', 'India'),
  ('Tirunelveli', 'திருநெல்வேலி', 'tirunelveli', 'India'),
  ('Salem', 'சேலம்', 'salem', 'India'),
  ('Coimbatore', 'கோயம்புத்தூர்', 'coimbatore', 'India'),
  ('Thanjavur', 'தஞ்சாவூர்', 'thanjavur', 'India'),
  ('Sri Lanka', 'இலங்கை', 'sri-lanka', 'Sri Lanka'),
  ('Singapore', 'சிங்கப்பூர்', 'singapore', 'Singapore'),
  ('Malaysia', 'மலேசியா', 'malaysia', 'Malaysia'),
  ('South Africa', 'தென்னாப்பிரிக்கா', 'south-africa', 'South Africa'),
  ('Mauritius', 'மொரிஷியஸ்', 'mauritius', 'Mauritius');

-- ============================================================
-- LANGUAGES (for root word cross-references)
-- ============================================================

CREATE TABLE public.languages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en     TEXT NOT NULL UNIQUE,
  name_ta     TEXT,
  iso_code    TEXT NOT NULL UNIQUE,
  family      TEXT,
  script      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Languages viewable by all" ON public.languages FOR SELECT USING (true);
CREATE POLICY "Only admins can manage languages" ON public.languages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

INSERT INTO public.languages (name_en, name_ta, iso_code, family, script) VALUES
  ('Tamil', 'தமிழ்', 'ta', 'Dravidian', 'Tamil'),
  ('English', 'ஆங்கிலம்', 'en', 'Indo-European', 'Latin'),
  ('Sanskrit', 'சமஸ்கிருதம்', 'sa', 'Indo-European', 'Devanagari'),
  ('Telugu', 'తెలుగు', 'te', 'Dravidian', 'Telugu'),
  ('Kannada', 'ಕನ್ನಡ', 'kn', 'Dravidian', 'Kannada'),
  ('Malayalam', 'മലയാളം', 'ml', 'Dravidian', 'Malayalam'),
  ('Portuguese', 'போர்த்துக்கீசியம்', 'pt', 'Indo-European', 'Latin'),
  ('French', 'பிரெஞ்சு', 'fr', 'Indo-European', 'Latin'),
  ('Malay', 'மலாய்', 'ms', 'Austronesian', 'Latin'),
  ('Indonesian', 'இந்தோனேசியன்', 'id', 'Austronesian', 'Latin'),
  ('Sinhala', 'சிங்களம்', 'si', 'Indo-European', 'Sinhala'),
  ('Thai', 'தாய்', 'th', 'Kra-Dai', 'Thai'),
  ('Greek', 'கிரேக்கம்', 'el', 'Indo-European', 'Greek'),
  ('Latin', 'இலத்தீன்', 'la', 'Indo-European', 'Latin');

-- ============================================================
-- TAGS
-- ============================================================

CREATE TABLE public.tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en     TEXT NOT NULL UNIQUE,
  name_ta     TEXT,
  slug        TEXT NOT NULL UNIQUE,
  color       TEXT DEFAULT '#8a7a61',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags viewable by all" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Only admins can manage tags" ON public.tags
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

INSERT INTO public.tags (name_en, name_ta, slug, color) VALUES
  ('Colloquial', 'வழக்கு மொழி', 'colloquial', '#dc712a'),
  ('Archaic', 'பழைய வழக்கு', 'archaic', '#8a7a61'),
  ('Slang', 'சேற்று மொழி', 'slang', '#f59e0b'),
  ('Formal', 'அலுவல் மொழி', 'formal', '#3b82f6'),
  ('Rural', 'கிராமிய', 'rural', '#22c55e'),
  ('Urban', 'நகர்ப்புற', 'urban', '#8b5cf6'),
  ('Food', 'உணவு', 'food', '#f97316'),
  ('Kinship', 'உறவு முறை', 'kinship', '#ec4899'),
  ('Nature', 'இயற்கை', 'nature', '#10b981'),
  ('Trade', 'வணிகம்', 'trade', '#0ea5e9'),
  ('Profanity', 'வசவுச் சொல்', 'profanity', '#ef4444'),
  ('Endearment', 'பாசச் சொல்', 'endearment', '#f472b6'),
  ('Maritime', 'கடல் வழக்கு', 'maritime', '#0284c7'),
  ('Agricultural', 'வேளாண்மை', 'agricultural', '#65a30d');

-- ============================================================
-- MEDIA ASSETS
-- ============================================================

CREATE TABLE public.media_assets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path  TEXT NOT NULL,
  public_url    TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     TEXT,
  width         INTEGER,
  height        INTEGER,
  alt_text      TEXT,
  uploaded_by   UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media viewable by all" ON public.media_assets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload media" ON public.media_assets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage all media" ON public.media_assets
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- VERNACULAR WORDS (dialect/slang entries)
-- ============================================================

CREATE TABLE public.words (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core word data
  word_ta             TEXT NOT NULL,           -- Tamil script
  word_transliteration TEXT NOT NULL,          -- Roman transliteration
  word_en             TEXT,                    -- English translation/equivalent
  
  -- Meanings
  meaning_ta          TEXT NOT NULL,           -- Meaning in Tamil
  meaning_en          TEXT NOT NULL,           -- Meaning in English
  
  -- Classification
  word_type           word_type DEFAULT 'other',
  status              content_status DEFAULT 'draft',
  
  -- Relations
  region_id           UUID REFERENCES public.regions(id),
  media_id            UUID REFERENCES public.media_assets(id),
  
  -- Rich content
  usage_examples      JSONB DEFAULT '[]',      -- [{ta: "...", en: "...", transliteration: "..."}]
  cultural_context_ta TEXT,
  cultural_context_en TEXT,
  pronunciation_guide TEXT,
  audio_url           TEXT,
  
  -- Meta
  tags                UUID[] DEFAULT '{}',
  slug                TEXT NOT NULL UNIQUE,
  seo_title           TEXT,
  seo_description     TEXT,
  
  -- Stats
  view_count          INTEGER DEFAULT 0,
  search_count        INTEGER DEFAULT 0,
  vote_count          INTEGER DEFAULT 0,
  
  -- Authorship
  created_by          UUID REFERENCES public.profiles(id),
  updated_by          UUID REFERENCES public.profiles(id),
  published_at        TIMESTAMPTZ,
  
  -- Full-text search vector
  search_vector       TSVECTOR,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_words_status ON public.words(status);
CREATE INDEX idx_words_region ON public.words(region_id);
CREATE INDEX idx_words_slug ON public.words(slug);
CREATE INDEX idx_words_view_count ON public.words(view_count DESC);
CREATE INDEX idx_words_created_at ON public.words(created_at DESC);
CREATE INDEX idx_words_search ON public.words USING GIN(search_vector);
CREATE INDEX idx_words_tags ON public.words USING GIN(tags);
CREATE INDEX idx_words_word_ta_trgm ON public.words USING GIN(word_ta gin_trgm_ops);
CREATE INDEX idx_words_transliteration_trgm ON public.words USING GIN(word_transliteration gin_trgm_ops);

-- Search vector update trigger
CREATE OR REPLACE FUNCTION words_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.word_ta, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.word_transliteration, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.word_en, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.meaning_en, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.meaning_ta, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER words_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.words
  FOR EACH ROW EXECUTE FUNCTION words_search_vector_update();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER words_updated_at
  BEFORE UPDATE ON public.words
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published words viewable by all"
  ON public.words FOR SELECT
  USING (status = 'published' OR auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Authenticated users can create words"
  ON public.words FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors and admins can update words"
  ON public.words FOR UPDATE
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete words"
  ON public.words FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- ROOT WORDS (etymology / cross-language influence)
-- ============================================================

CREATE TABLE public.root_words (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  root_ta             TEXT NOT NULL,
  root_transliteration TEXT NOT NULL,
  root_meaning_ta     TEXT NOT NULL,
  root_meaning_en     TEXT NOT NULL,
  
  etymology_ta        TEXT,
  etymology_en        TEXT NOT NULL,
  linguistic_notes    TEXT,
  historical_period   TEXT,
  
  -- Derived words in other languages
  -- [{language_id, word, meaning, example, notes}]
  derived_words       JSONB DEFAULT '[]',
  
  -- Cross-language graph data
  influence_map       JSONB DEFAULT '{}',
  
  status              content_status DEFAULT 'draft',
  slug                TEXT NOT NULL UNIQUE,
  tags                UUID[] DEFAULT '{}',
  media_id            UUID REFERENCES public.media_assets(id),
  
  seo_title           TEXT,
  seo_description     TEXT,
  view_count          INTEGER DEFAULT 0,
  vote_count          INTEGER DEFAULT 0,
  
  search_vector       TSVECTOR,
  
  created_by          UUID REFERENCES public.profiles(id),
  updated_by          UUID REFERENCES public.profiles(id),
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_root_words_status ON public.root_words(status);
CREATE INDEX idx_root_words_slug ON public.root_words(slug);
CREATE INDEX idx_root_words_search ON public.root_words USING GIN(search_vector);
CREATE INDEX idx_root_words_root_ta_trgm ON public.root_words USING GIN(root_ta gin_trgm_ops);

CREATE OR REPLACE FUNCTION root_words_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.root_ta, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.root_transliteration, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.root_meaning_en, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.etymology_en, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER root_words_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.root_words
  FOR EACH ROW EXECUTE FUNCTION root_words_search_vector_update();

CREATE TRIGGER root_words_updated_at
  BEFORE UPDATE ON public.root_words
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.root_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published root words viewable by all"
  ON public.root_words FOR SELECT
  USING (status = 'published' OR auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Authenticated users can create root words"
  ON public.root_words FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors and admins can update root words"
  ON public.root_words FOR UPDATE
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete root words"
  ON public.root_words FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- USER CONTRIBUTIONS (pending admin approval)
-- ============================================================

CREATE TABLE public.contributions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contributor_id  UUID REFERENCES public.profiles(id),
  type            TEXT NOT NULL CHECK (type IN ('word', 'root_word')),
  data            JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id     UUID REFERENCES public.profiles(id),
  reviewer_notes  TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors see own submissions"
  ON public.contributions FOR SELECT
  USING (contributor_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Authenticated users can submit contributions"
  ON public.contributions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can update contributions"
  ON public.contributions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- VOTES
-- ============================================================

CREATE TABLE public.votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('word', 'root_word')),
  entity_id   UUID NOT NULL,
  value       SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes viewable by all" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Users manage own votes" ON public.votes
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- BOOKMARKS
-- ============================================================

CREATE TABLE public.bookmarks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('word', 'root_word')),
  entity_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SEARCH ANALYTICS
-- ============================================================

CREATE TABLE public.search_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query       TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  user_id     UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view search logs" ON public.search_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Anyone can insert search logs" ON public.search_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- FUNCTIONS & VIEWS
-- ============================================================

-- Trending words view (last 7 days)
CREATE OR REPLACE VIEW public.trending_words AS
  SELECT w.*, r.name_en as region_name, r.name_ta as region_name_ta
  FROM public.words w
  LEFT JOIN public.regions r ON w.region_id = r.id
  WHERE w.status = 'published'
  ORDER BY w.view_count DESC, w.vote_count DESC
  LIMIT 20;

-- Increment view count function
CREATE OR REPLACE FUNCTION public.increment_view_count(
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS VOID AS $$
BEGIN
  IF p_entity_type = 'word' THEN
    UPDATE public.words SET view_count = view_count + 1 WHERE id = p_entity_id;
  ELSIF p_entity_type = 'root_word' THEN
    UPDATE public.root_words SET view_count = view_count + 1 WHERE id = p_entity_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS (run via Supabase dashboard or API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('word-images', 'word-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']);
