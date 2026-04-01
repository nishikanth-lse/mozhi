import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Env variables (safe access)
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined

// Create client safely (no app crash)
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: { 'x-app-name': 'mozhi' },
        },
      })
    : null

// Debug warning (only once in dev)
if (!supabase) {
  console.error(
    '⚠️ Supabase not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  )
}

// ----------------------
// Storage helpers
// ----------------------

export const STORAGE_BUCKET = 'word-images'

// Get public URL
export function getPublicUrl(storagePath: string): string {
  if (!supabase) return ''

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath)

  return data.publicUrl
}

// Upload file
export async function uploadFile(
  file: File,
  folder: string = 'words'
): Promise<{ path: string; url: string }> {
  if (!supabase) {
    throw new Error('Supabase not initialized')
  }

  const ext = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const url = getPublicUrl(fileName)
  return { path: fileName, url }
}

// Delete file
export async function deleteFile(storagePath: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not initialized')
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath])

  if (error) throw error
}

console.log("ENV CHECK:", import.meta.env)