import { createClient } from "@/lib/supabase/server"
import { isLocalMode } from "@/lib/local/mode"
import { listProfiles } from "@/lib/local/db"
import type { Profile } from "@/lib/types"

export async function getProfiles(): Promise<Profile[]> {
  if (isLocalMode()) return listProfiles()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true })

  if (error) throw error
  return (data ?? []) as Profile[]
}
