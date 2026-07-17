import { createClient } from '@supabase/supabase-js'

// .env.local に書いた鍵情報を読み込みます
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Reactアプリ全体で使い回せる「接続マシン（supabase）」をエクスポートします
export const supabase = createClient(supabaseUrl, supabaseAnonKey)