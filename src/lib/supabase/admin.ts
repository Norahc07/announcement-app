import { createClient } from "@supabase/supabase-js"
import { supabaseUrl } from "@/lib/constants"

export function createAdminClient() {
  const url = supabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Admin API is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local."
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
