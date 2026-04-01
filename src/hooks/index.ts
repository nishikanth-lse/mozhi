import { useEffect, useCallback, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLangStore, useAuthStore, useRefDataStore } from '@/store'
import { regionsApi, tagsApi, languagesApi } from '@/lib/api/reference'
import type { TranslationKey } from '@/i18n/translations'
import { t } from '@/i18n/translations'

/* ─── Translation hook ───────────────────────────────────── */
export function useT() {
  const locale = useLangStore((s) => s.locale)
  return useCallback((key: TranslationKey) => t(key, locale), [locale])
}

/* ─── Auth hook (SAFE) ───────────────────────────────────── */
export function useAuth() {
  const {
    profile,
    isLoading,
    setProfile,
    setLoading,
    isAdmin,
    isAuthenticated,
  } = useAuthStore()

  useEffect(() => {
    // ✅ Prevent crash if supabase is null
    if (!supabase) {
      console.warn('Supabase not initialized')
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setProfile(data)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setProfile(data)
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setProfile, setLoading])

  // 🔐 Safe auth actions
  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase not initialized')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) throw error
  }

  return {
    profile,
    isLoading,
    isAdmin: isAdmin(),
    isAuthenticated: isAuthenticated(),
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  }
}

/* ─── Reference data hook ────────────────────────────────── */
export function useRefData() {
  const { setRegions, setTags, setLanguages } = useRefDataStore()

  useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const data = await regionsApi.list()
      setRegions(data)
      return data
    },
    staleTime: 10 * 60 * 1000,
  })

  useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const data = await tagsApi.list()
      setTags(data)
      return data
    },
    staleTime: 10 * 60 * 1000,
  })

  useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const data = await languagesApi.list()
      setLanguages(data)
      return data
    },
    staleTime: 30 * 60 * 1000,
  })
}

/* ─── Slug generator ─────────────────────────────────────── */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

/* ─── Debounce hook ──────────────────────────────────────── */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

/* ─── Clipboard hook ─────────────────────────────────────── */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  return { copy, copied }
}