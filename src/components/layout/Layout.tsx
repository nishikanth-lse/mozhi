import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Search, BookOpen, Globe, LogOut, User, Shield, BookMarked } from 'lucide-react'
import { useT, useAuth } from '@/hooks'
import { useLangStore } from '@/store'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

export function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const t = useT()
  const { locale, toggleLocale } = useLangStore()
  const { profile, isAuthenticated, isAdmin, signOut } = useAuth()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => setMenuOpen(false), [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/')
  }

  const navLinks = [
    { href: '/vernacular', label: t('nav.vernacular'), icon: BookOpen },
    { href: '/roots', label: t('nav.roots'), icon: Globe },
    { href: '/search', label: t('nav.search'), icon: Search },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className={clsx(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-clay-200'
          : 'bg-transparent'
      )}>
        <div className="page-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-clay-600 flex items-center justify-center shadow-sm group-hover:bg-clay-700 transition-colors">
                <span className="font-tamil text-white text-lg font-bold leading-none">மொ</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display font-bold text-ink-900 text-lg tracking-tight">Mozhi</span>
                <span className="font-tamil text-clay-600 text-xs">மொழி</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  to={href}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    location.pathname.startsWith(href)
                      ? 'bg-clay-100 text-clay-800'
                      : 'text-ink-700 hover:bg-clay-100 hover:text-clay-800'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Lang toggle */}
              <button
                onClick={toggleLocale}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-clay-200 bg-white text-xs font-medium text-ink-700 hover:border-clay-400 transition-colors"
                title="Toggle language"
              >
                <Globe className="w-3.5 h-3.5" />
                {locale === 'en' ? 'தமிழ்' : 'EN'}
              </button>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link to="/admin" className="btn-ghost btn-sm hidden md:flex">
                      <Shield className="w-4 h-4" />
                      {t('nav.admin')}
                    </Link>
                  )}
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-clay-100 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-clay-200 flex items-center justify-center overflow-hidden">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-clay-600" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-ink-700 hidden md:block max-w-[120px] truncate">
                        {profile?.full_name ?? profile?.email}
                      </span>
                    </button>
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-clay-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-clay-50">
                        <User className="w-4 h-4" /> {t('nav.profile')}
                      </Link>
                      <Link to="/bookmarks" className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-clay-50">
                        <BookMarked className="w-4 h-4" /> Bookmarks
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-clay-50">
                          <Shield className="w-4 h-4" /> {t('nav.admin')}
                        </Link>
                      )}
                      <hr className="my-1 border-clay-100" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" /> {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/auth/login" className="btn-primary btn-sm">
                  {t('nav.login')}
                </Link>
              )}

              {/* Mobile menu */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-clay-100"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-clay-200 shadow-lg">
            <div className="page-container py-3 flex flex-col gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  to={href}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium',
                    location.pathname.startsWith(href)
                      ? 'bg-clay-100 text-clay-800'
                      : 'text-ink-700'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700">
                  <Shield className="w-4 h-4" /> {t('nav.admin')}
                </Link>
              )}
              {!isAuthenticated && (
                <Link to="/auth/login" className="btn-primary mt-2">
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1 pt-16">{children}</main>

      {/* Footer */}
      <footer className="bg-ink-950 text-ink-300 py-12 mt-16">
        <div className="page-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-clay-600 flex items-center justify-center">
                  <span className="font-tamil text-white font-bold">ம</span>
                </div>
                <span className="font-display font-bold text-white text-lg">Mozhi</span>
              </div>
              <p className="text-sm leading-relaxed text-ink-400">
                A living archive preserving Tamil dialects and documenting the linguistic heritage of Tamil across the world.
              </p>
              <p className="font-tamil text-xs text-clay-400 mt-2">
                தமிழின் மொழி வளத்தை காக்கும் இயக்கம்
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Explore</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link to="/vernacular" className="hover:text-clay-400 transition-colors">Vernacular Library</Link>
                <Link to="/roots" className="hover:text-clay-400 transition-colors">Root Word Dictionary</Link>
                <Link to="/search" className="hover:text-clay-400 transition-colors">Search</Link>
                <Link to="/contribute" className="hover:text-clay-400 transition-colors">Contribute a Word</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">About</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link to="/about" className="hover:text-clay-400 transition-colors">About Mozhi</Link>
                <Link to="/about#mission" className="hover:text-clay-400 transition-colors">Our Mission</Link>
                <a href="mailto:hello@mozhi.app" className="hover:text-clay-400 transition-colors">Contact</a>
              </div>
            </div>
          </div>
          <div className="border-t border-ink-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-ink-500">
            <span>© {new Date().getFullYear()} Mozhi. Built with love for Tamil.</span>
            <span className="font-tamil text-clay-600">தமிழ் வாழ்க</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
