import { ProfileForm } from "@/components/profile/profile-form"
import { getSessionProfile } from "@/lib/supabase/server"

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>
}) {
  const profile = await getSessionProfile()
  if (!profile) return null
  const params = await searchParams

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-heading text-2xl">Profile</h1>
      </div>
      <ProfileForm
        profile={profile}
        forcePassword={params.required === "1" || profile.must_change_password}
      />
    </div>
  )
}
