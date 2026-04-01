import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { GlobalSearch } from '@/components/ui/GlobalSearch'

// Eager loaded pages
import { HomePage } from '@/pages/HomePage'
import { LoginPage, SignupPage } from '@/pages/AuthPages'

// Lazy loaded pages
const VernacularPage = lazy(() => import('@/pages/VernacularPage').then(m => ({ default: m.VernacularPage })))
const WordDetailPage = lazy(() => import('@/pages/WordDetailPage').then(m => ({ default: m.WordDetailPage })))
const RootWordsPage = lazy(() => import('@/pages/RootWordsPage').then(m => ({ default: m.RootWordsPage })))
const RootWordDetailPage = lazy(() => import('@/pages/RootWordsPage').then(m => ({ default: m.RootWordDetailPage })))
const SearchPage = lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })))
const ContributePage = lazy(() => import('@/pages/ContributePage').then(m => ({ default: m.ContributePage })))

// Admin pages (lazy)
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminDashboard = lazy(() => import('@/components/admin/AdminLayout').then(m => ({ default: m.AdminDashboard })))
const AdminWordsPage = lazy(() => import('@/components/admin/AdminWordsPage').then(m => ({ default: m.AdminWordsPage })))
const AdminWordForm = lazy(() => import('@/components/admin/AdminWordForm').then(m => ({ default: m.AdminWordForm })))
const AdminRootWordsPage = lazy(() => import('@/components/admin/AdminRootWordForm').then(m => ({ default: m.AdminRootWordsPage })))
const AdminRootWordForm = lazy(() => import('@/components/admin/AdminRootWordForm').then(m => ({ default: m.AdminRootWordForm })))
const AdminRegionsPage = lazy(() => import('@/components/admin/AdminRefPages').then(m => ({ default: m.AdminRegionsPage })))
const AdminTagsPage = lazy(() => import('@/components/admin/AdminRefPages').then(m => ({ default: m.AdminTagsPage })))
const AdminContributionsPage = lazy(() => import('@/components/admin/AdminRefPages').then(m => ({ default: m.AdminContributionsPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

console.log("ENV URL:", import.meta.env.VITE_SUPABASE_URL)

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-clay-100 flex items-center justify-center animate-pulse">
          <span className="font-tamil text-clay-500 text-xl">ம</span>
        </div>
        <p className="text-sm text-ink-400">Loading...</p>
      </div>
    </div>
  )
}

function AppInner() {
  // useRefData() // Load reference data globally
  return (
    <>
      <GlobalSearch />
      <Routes>
        {/* Public routes with layout */}
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/vernacular" element={<Layout><Suspense fallback={<PageLoader />}><VernacularPage /></Suspense></Layout>} />
        <Route path="/word/:slug" element={<Layout><Suspense fallback={<PageLoader />}><WordDetailPage /></Suspense></Layout>} />
        <Route path="/roots" element={<Layout><Suspense fallback={<PageLoader />}><RootWordsPage /></Suspense></Layout>} />
        <Route path="/root/:slug" element={<Layout><Suspense fallback={<PageLoader />}><RootWordDetailPage /></Suspense></Layout>} />
        <Route path="/search" element={<Layout><Suspense fallback={<PageLoader />}><SearchPage /></Suspense></Layout>} />
        <Route path="/contribute" element={<Layout><Suspense fallback={<PageLoader />}><ContributePage /></Suspense></Layout>} />

        {/* Auth routes (no layout) */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/callback" element={<Navigate to="/" />} />

        {/* Admin routes */}
        <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminDashboard /></AdminLayout></Suspense>} />
        <Route path="/admin/words" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminWordsPage /></AdminLayout></Suspense>} />
        <Route path="/admin/words/new" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminWordForm /></AdminLayout></Suspense>} />
        <Route path="/admin/words/:id/edit" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminWordForm /></AdminLayout></Suspense>} />
        <Route path="/admin/root-words" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminRootWordsPage /></AdminLayout></Suspense>} />
        <Route path="/admin/root-words/new" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminRootWordForm /></AdminLayout></Suspense>} />
        <Route path="/admin/root-words/:id/edit" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminRootWordForm /></AdminLayout></Suspense>} />
        <Route path="/admin/regions" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminRegionsPage /></AdminLayout></Suspense>} />
        <Route path="/admin/tags" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminTagsPage /></AdminLayout></Suspense>} />
        <Route path="/admin/contributions" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminContributionsPage /></AdminLayout></Suspense>} />

        {/* Catch-all */}
        <Route path="*" element={<Layout><div className="page-container py-20 text-center text-ink-500">Page not found</div></Layout>} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInner/>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '12px', border: '1px solid #f4d1a9' },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

