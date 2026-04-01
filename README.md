# Mozhi | மொழி
### Tamil Language Preservation Platform

A production-ready bilingual platform (Tamil + English) dedicated to preserving Tamil dialects, slang, and vernacular usage, while documenting Tamil root words and their influence across world languages.

---

## 📁 Project Structure

```
mozhi/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLayout.tsx       # Admin sidebar layout + dashboard
│   │   │   ├── AdminWordsPage.tsx    # Words CRUD table + bulk import
│   │   │   ├── AdminWordForm.tsx     # Add/edit word form
│   │   │   ├── AdminRootWordForm.tsx # Root words CRUD + form
│   │   │   └── AdminRefPages.tsx     # Regions, Tags, Contributions
│   │   ├── layout/
│   │   │   └── Layout.tsx            # Main nav + footer
│   │   ├── ui/
│   │   │   ├── GlobalSearch.tsx      # Cmd+K fuzzy search overlay
│   │   │   └── index.tsx             # MultiSelect, Pagination, etc.
│   │   ├── vernacular/
│   │   │   └── WordCard.tsx          # Word card + skeleton + featured
│   │   └── rootwords/
│   │       └── RootWordCard.tsx      # Root word card
│   ├── hooks/
│   │   └── index.ts                  # useT, useAuth, useRefData, useDebounce
│   ├── i18n/
│   │   └── translations.ts           # Full EN + TA translation strings
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client + storage helpers
│   │   └── api/
│   │       ├── words.ts              # Words API (CRUD, search, trending)
│   │       ├── rootWords.ts          # Root words API
│   │       └── reference.ts          # Regions, tags, votes, bookmarks, admin
│   ├── pages/
│   │   ├── HomePage.tsx              # Landing page with hero + stats
│   │   ├── VernacularPage.tsx        # Filtered word library
│   │   ├── WordDetailPage.tsx        # Single word with vote/bookmark
│   │   ├── RootWordsPage.tsx         # Root word list + detail
│   │   ├── SearchPage.tsx            # Full search results
│   │   ├── ContributePage.tsx        # Public contribution form
│   │   └── AuthPages.tsx             # Login + signup
│   ├── store/
│   │   └── index.ts                  # Zustand stores (lang, auth, refdata, search, admin)
│   ├── styles/
│   │   └── globals.css               # Tailwind + custom component classes
│   ├── types/
│   │   └── index.ts                  # Full TypeScript type definitions
│   ├── App.tsx                       # Router + query client + code splitting
│   └── main.tsx                      # Entry point
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Complete PostgreSQL schema
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── .env.example
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS 3 + Custom design system |
| State | Zustand (global) + TanStack Query (server) |
| Routing | React Router v6 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google OAuth) |
| Storage | Supabase Storage (CDN-backed) |
| Search | PostgreSQL full-text + Fuse.js fuzzy |
| Deploy | Vercel |

---

## ⚡ Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourorg/mozhi.git
cd mozhi
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full migration:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Create the storage bucket:
   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'word-images',
     'word-images',
     true,
     5242880,
     ARRAY['image/jpeg','image/png','image/webp','image/gif']
   );
   ```
4. Enable Google OAuth in **Authentication → Providers → Google**
5. Set your **Site URL** and **Redirect URLs** in Auth settings

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_URL=http://localhost:5173
```

### 4. Make yourself an admin

After signing up, run in Supabase SQL Editor:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

### 5. Start development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🗄️ Database Schema

### Core Tables

| Table | Purpose |
|---|---|
| `profiles` | User profiles with roles (admin/contributor/public) |
| `words` | Vernacular/dialect word entries |
| `root_words` | Tamil root words with cross-language derivations |
| `regions` | Geographic regions (12 seeded) |
| `languages` | Language reference data (14 seeded) |
| `tags` | Content classification tags (14 seeded) |
| `media_assets` | Image/file uploads via Supabase Storage |
| `contributions` | User-submitted words pending admin review |
| `votes` | Upvote/downvote on words and root words |
| `bookmarks` | User bookmarks |
| `search_logs` | Search analytics |

### Key Design Decisions

- **Full-text search**: PostgreSQL `tsvector` with weighted fields (word > transliteration > meaning)
- **Fuzzy matching**: `pg_trgm` extension + GIN indexes on Tamil and transliteration columns
- **Row Level Security**: All tables protected; public can read published content, admins can write
- **JSON columns**: `usage_examples` and `derived_words` stored as JSONB for flexibility
- **Triggers**: Auto-update `search_vector` and `updated_at` on every write

---

## 🎨 Design System

### Typography
- **Display**: Playfair Display (headings)
- **Body**: DM Sans (UI text)
- **Tamil**: Noto Sans Tamil (Unicode Tamil rendering)
- **Code**: JetBrains Mono

### Color Palette
- **Primary**: Clay (`#dc712a`) — warm terracotta
- **Ink**: Dark warm gray for text
- **Saffron**: Accent amber
- **Paper**: Warm off-white backgrounds

### Component Classes
```css
.card          /* White rounded card with border + shadow */
.btn-primary   /* Clay filled button */
.btn-secondary /* Clay outline button */
.input         /* Standard text input */
.input-tamil   /* Tamil-optimized input with Noto Sans Tamil */
.badge         /* Pill label */
.admin-table   /* Consistent admin data table */
```

---

## 🔐 Authentication & Roles

| Role | Capabilities |
|---|---|
| `public` | Read published words, bookmark, vote, contribute (pending review) |
| `contributor` | Future: direct entry creation with auto-pending-review status |
| `admin` | Full CRUD, publish/unpublish, review contributions, manage reference data |

---

## 📱 Features

### Public
- **Bilingual toggle** — EN ↔ தமிழ் on every page
- **Vernacular Library** — Filter by region (multi-select), tags, word type; sort by recent/popular/votes/A-Z
- **Root Word Dictionary** — Etymology with cross-language derived word listing
- **⌘K Global Search** — Fuzzy search across words and root words
- **Word Detail Pages** — Full info with upvote, bookmark, share
- **Contribute** — Anyone can submit; goes to admin review queue

### Admin (`/admin`)
- **Dashboard** — Live stats, content status bars, quick actions
- **Words Table** — Sortable, filterable, bulk-delete, publish toggle
- **Word Form** — Drag-drop image upload, usage example builder, duplicate detection, tag picker, SEO fields
- **Root Words** — CRUD with multi-language derived word form builder
- **Regions & Tags** — Inline create/edit/delete
- **Contributions** — Review queue with approve/reject
- **CSV Import** — Bulk upload words via CSV with template download

---

## 🚀 Deployment (Vercel)

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### Environment variables to set in Vercel dashboard:
```
VITE_SUPABASE_URL        = https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJ...
VITE_APP_URL             = https://your-mozhi-domain.vercel.app
```

In Supabase Auth settings, add your Vercel URL to:
- **Site URL**: `https://your-mozhi-domain.vercel.app`
- **Redirect URLs**: `https://your-mozhi-domain.vercel.app/auth/callback`

---

## 📦 CSV Import Format

To bulk-import words, download the template from Admin → Words → Template, or use this format:

```csv
word_ta,word_transliteration,word_en,meaning_ta,meaning_en,word_type,region_slug,cultural_context_en,tags
மொழி,mozhi,language,மொழி என்பது...,Language is...,noun,madurai,Cultural context,colloquial
```

Valid `word_type` values: `noun`, `verb`, `adjective`, `adverb`, `idiom`, `phrase`, `exclamation`, `other`

Valid `region_slug` values: `madurai`, `chennai`, `kongu-nadu`, `tirunelveli`, `salem`, `coimbatore`, `thanjavur`, `sri-lanka`, `singapore`, `malaysia`, `south-africa`, `mauritius`

---

## 🔮 Extending the Platform

### Add a new feature (e.g., audio pronunciation)

1. Add `audio_url TEXT` to `words` table in Supabase
2. Update the `Word` type in `src/types/index.ts`
3. Add audio upload to `AdminWordForm.tsx`
4. Add `<audio>` player to `WordDetailPage.tsx`

### Add a new language to the UI

1. Add translations to `src/i18n/translations.ts`
2. Update `Locale` type in `src/types/index.ts`
3. Update language toggle in `Layout.tsx`

### Add Supabase Edge Functions

```bash
supabase functions new my-function
supabase functions deploy my-function
```

Call from frontend:
```ts
const { data } = await supabase.functions.invoke('my-function', { body: { ... } })
```

---

## 🧪 Seed Data

The migration file includes seeded data for:
- **12 Regions**: Madurai, Chennai, Kongu Nadu, Tirunelveli, Salem, Coimbatore, Thanjavur, Sri Lanka, Singapore, Malaysia, South Africa, Mauritius
- **14 Languages**: Tamil, English, Sanskrit, Telugu, Kannada, Malayalam, Portuguese, French, Malay, Indonesian, Sinhala, Thai, Greek, Latin
- **14 Tags**: Colloquial, Archaic, Slang, Formal, Rural, Urban, Food, Kinship, Nature, Trade, Profanity, Endearment, Maritime, Agricultural

---

## 📜 License

MIT — free to use, fork, and build upon for Tamil language preservation.

---

*தமிழ் வாழ்க — Long live Tamil*
