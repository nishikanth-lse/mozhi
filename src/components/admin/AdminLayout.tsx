import { useState, type ReactNode } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, BookOpen, Globe, MapPin, Tag, Languages,
  Users, FileCheck, Image, ChevronRight, TrendingUp, FileText,
  PenLine, Eye, Clock, CheckCircle
} from 'lucide-react'
import { adminApi } from '@/lib/api/reference'
import { useAuth } from '@/hooks'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/words', label: 'Words', icon: BookOpen },
  { href: '/admin/root-words', label: 'Root Words', icon: Globe },
  { href: '/admin/regions', label: 'Regions', icon: MapPin },
  { href: '/admin/tags', label: 'Tags', icon: Tag },
  { href: '/admin/languages', label: 'Languages', icon: Languages },
  { href: '/admin/contributions', label: 'Contributions', icon: FileCheck },
  { href: '/admin/media', label: 'Media', icon: Image },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (isLoading) return <div className="min-h-screen bg-clay-50 animate-pulse" />
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-clay-50 flex">
      {/* Sidebar */}
      <aside className={clsx(
        'fixed left-0 top-0 bottom-0 z-40 bg-ink-950 text-white transition-all duration-200 flex flex-col',
        sidebarOpen ? 'w-56' : 'w-16'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-ink-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-clay-600 flex items-center justify-center flex-shrink-0">
              <span className="font-tamil text-white font-bold">ம</span>
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <span className="font-display font-bold text-white block leading-tight">Mozhi</span>
                <span className="text-ink-400 text-xs">Admin</span>
              </div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? location.pathname === href
              : location.pathname.startsWith(href) && href !== '/admin'
            const isActive = exact ? location.pathname === href : location.pathname.startsWith(href)

            return (
              <Link
                key={href}
                to={href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors mb-0.5',
                  isActive
                    ? 'bg-clay-600 text-white'
                    : 'text-ink-300 hover:bg-ink-800 hover:text-white'
                )}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-12 flex items-center justify-center px-4 border-t border-ink-800 text-ink-400 hover:text-white transition-colors"
        >
          <ChevronRight className={clsx('w-4 h-4 transition-transform', sidebarOpen && 'rotate-180')} />
        </button>
      </aside>

      {/* Main */}
      <div className={clsx('flex-1 transition-all duration-200', sidebarOpen ? 'ml-56' : 'ml-16')}>
        {/* Top bar */}
        <div className="h-16 bg-white border-b border-clay-200 flex items-center px-6 gap-4 sticky top-0 z-30">
          <div className="text-sm text-ink-500 flex items-center gap-1">
            {location.pathname.split('/').filter(Boolean).map((seg, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                <span className={i === arr.length - 1 ? 'text-ink-800 font-medium capitalize' : 'capitalize'}>
                  {seg.replace('-', ' ')}
                </span>
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/" target="_blank" className="btn-ghost btn-sm text-ink-600">
              <Eye className="w-4 h-4" /> View Site
            </Link>
          </div>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Dashboard Overview ───────────────────────────────────
export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 30_000,
  })

  const statCards = [
    { label: 'Total Words', value: stats?.total_words ?? 0, icon: BookOpen, color: 'text-clay-600', sub: `${stats?.published_words ?? 0} published` },
    { label: 'Root Words', value: stats?.total_root_words ?? 0, icon: Globe, color: 'text-amber-600', sub: 'Etymology entries' },
    { label: 'Draft Words', value: stats?.draft_words ?? 0, icon: PenLine, color: 'text-blue-600', sub: 'Awaiting publish' },
    { label: 'Pending Review', value: stats?.pending_contributions ?? 0, icon: Clock, color: 'text-orange-600', sub: 'Contributions' },
    { label: 'Regions', value: stats?.total_regions ?? 0, icon: MapPin, color: 'text-green-600', sub: 'Geographic areas' },
    { label: 'Users', value: stats?.total_users ?? 0, icon: Users, color: 'text-purple-600', sub: 'Registered users' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Dashboard</h1>
        <p className="text-ink-500 text-sm mt-1">Overview of Mozhi content and activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={clsx('w-10 h-10 rounded-xl bg-clay-50 flex items-center justify-center', color)}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="font-display text-3xl font-bold text-ink-900">
              {isLoading ? <div className="skeleton h-8 w-16" /> : value.toLocaleString()}
            </div>
            <p className="text-sm font-medium text-ink-700 mt-1">{label}</p>
            <p className="text-xs text-ink-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-clay-500" /> Quick Actions
          </h2>
          <div className="space-y-2">
            <Link to="/admin/words/new" className="flex items-center gap-3 p-3 rounded-xl hover:bg-clay-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-clay-100 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-clay-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-800">Add new word</p>
                <p className="text-xs text-ink-500">Add a dialect or vernacular entry</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-300 ml-auto group-hover:text-clay-500" />
            </Link>

            <Link to="/admin/root-words/new" className="flex items-center gap-3 p-3 rounded-xl hover:bg-clay-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Globe className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-800">Add root word</p>
                <p className="text-xs text-ink-500">Add etymology entry</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-300 ml-auto group-hover:text-clay-500" />
            </Link>

            <Link to="/admin/contributions" className="flex items-center gap-3 p-3 rounded-xl hover:bg-clay-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-800">Review contributions</p>
                <p className="text-xs text-ink-500">{stats?.pending_contributions ?? 0} pending</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-300 ml-auto group-hover:text-clay-500" />
            </Link>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-clay-500" /> Content Status
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Published words', value: stats?.published_words ?? 0, color: 'bg-green-500', max: stats?.total_words || 1 },
              { label: 'Draft words', value: stats?.draft_words ?? 0, color: 'bg-blue-400', max: stats?.total_words || 1 },
            ].map(({ label, value, color, max }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-600">{label}</span>
                  <span className="font-medium text-ink-800">{value}</span>
                </div>
                <div className="h-2 bg-clay-100 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all', color)}
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
