import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useT, useAuth } from '@/hooks'
import toast from 'react-hot-toast'

// ─── Login Page ───────────────────────────────────────────
export function LoginPage() {
  const t = useT()
  const navigate = useNavigate()
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err: any) {
      toast.error(err.message ?? 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-clay-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-clay-600 flex items-center justify-center">
              <span className="font-tamil text-white text-xl font-bold">ம</span>
            </div>
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink-900">{t('auth.signin')}</h1>
          <p className="text-ink-500 mt-1 text-sm">
            {t('auth.no_account')}{' '}
            <Link to="/auth/signup" className="text-clay-600 hover:underline font-medium">
              {t('auth.signup')}
            </Link>
          </p>
        </div>

        <div className="card p-8 space-y-5">
          {/* Google */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-clay-200 rounded-xl bg-white text-ink-700 text-sm font-medium hover:bg-clay-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.google')}
          </button>

          <div className="flex items-center gap-3 text-xs text-ink-400">
            <div className="flex-1 h-px bg-clay-200" />
            <span>or continue with email</span>
            <div className="flex-1 h-px bg-clay-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="label mb-0">{t('auth.password')}</label>
                <Link to="/auth/forgot-password" className="text-xs text-clay-600 hover:underline">
                  {t('auth.forgot')}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-base"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('auth.signin')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Signup Page ─────────────────────────────────────────
export function SignupPage() {
  const t = useT()
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await signUp(form.email, form.password, form.name)
      toast.success('Account created! Check your email to confirm.')
      navigate('/auth/login')
    } catch (err: any) {
      toast.error(err.message ?? 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-clay-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-clay-600 flex items-center justify-center">
              <span className="font-tamil text-white text-xl font-bold">ம</span>
            </div>
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink-900">{t('auth.signup')}</h1>
          <p className="text-ink-500 mt-1 text-sm">
            {t('auth.have_account')}{' '}
            <Link to="/auth/login" className="text-clay-600 hover:underline font-medium">
              {t('auth.signin')}
            </Link>
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.name')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                className="input"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                  minLength={8}
                  className="input pr-10"
                  placeholder="Min. 8 characters"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-ink-400 bg-clay-50 rounded-lg p-3">
              By creating an account, you agree to help preserve Tamil linguistic heritage. Your contributions will be reviewed by our team.
            </p>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-base">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('auth.signup')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
