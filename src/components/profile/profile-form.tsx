"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { changePassword, updateProfileName } from "@/lib/actions/profile"
import { ROLE_LABELS } from "@/lib/constants"
import type { Profile } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggleCard } from "@/components/theme-toggle"

export function ProfileForm({
  profile,
  forcePassword,
}: {
  profile: Profile
  forcePassword: boolean
}) {
  const [pending, startTransition] = useTransition()

  function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await updateProfileName(String(formData.get("full_name") || ""))
      if (result.error) toast.error(result.error)
      else toast.success("Name updated.")
    })
  }

  function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await changePassword(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      event.currentTarget.reset()
      toast.success("Password changed.")
    })
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {forcePassword ? (
        <Alert>
          <AlertTitle>Set your own password</AlertTitle>
          <AlertDescription>
            You signed in with a temporary password. Change it below before using
            the rest of Staff Board.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Signed in as {profile.email} · {ROLE_LABELS[profile.role]}
          </p>
          <form onSubmit={saveName} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="full_name">Display name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile.full_name}
                placeholder="How your name appears on posts"
                required
                className="h-10"
              />
            </div>
            <Button type="submit" disabled={pending}>
              Save name
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                placeholder="Re-type your new password"
                className="h-10"
              />
            </div>
            <Button type="submit" disabled={pending}>
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>

      <ThemeToggleCard />
    </div>
  )
}
