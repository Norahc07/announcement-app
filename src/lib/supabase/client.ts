"use client"

import { createBrowserClient } from "@supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "@/lib/constants"

export function createClient() {
  const url = supabaseUrl()
  const key = supabaseAnonKey()
  if (!url || !key) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }
  return createBrowserClient(url, key)
}
