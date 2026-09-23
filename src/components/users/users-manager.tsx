"use client"

import { useMemo, useState, useTransition } from "react"
import { MoreHorizontal, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"
import {
  createUserAccount,
  deleteUserAccount,
  resetUserPassword,
  updateUserRole,
} from "@/lib/actions/users"
import { ROLE_LABELS } from "@/lib/constants"
import { fromNow, initials } from "@/lib/format"
import { isLocalMode } from "@/lib/local/mode"
import type { Profile, Role } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SELECT =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"

export function UsersManager({
  profiles,
  currentUserId,
}: {
  profiles: Profile[]
  currentUserId: string
}) {
  const local = isLocalMode()
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)
  const [pending, startTransition] = useTransition()
  const [resetFor, setResetFor] = useState<Profile | null>(null)
  const [password, setPassword] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter(
      (user) =>
        user.full_name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
    )
  }, [profiles, query])

  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      const result = await createUserAccount(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      form.reset()
      setAdding(false)
      toast.success("Account created. Share the temporary password with them.")
    })
  }

  function changeRole(userId: string, role: Role) {
    startTransition(async () => {
      const result = await updateUserRole(userId, role)
      if (result.error) toast.error(result.error)
    })
  }

  function remove(user: Profile) {
    if (!confirm(`Delete ${user.full_name}'s account?`)) return
    startTransition(async () => {
      const result = await deleteUserAccount(user.id)
      if (result.error) toast.error(result.error)
      else toast.success("Account deleted.")
    })
  }

  function submitReset() {
    if (!resetFor) return
    startTransition(async () => {
      const result = await resetUserPassword(resetFor.id, password)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setResetFor(null)
      setPassword("")
      toast.success("Password reset. They will change it on next login.")
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or username"
            className="h-10 pl-9"
          />
        </div>
        <Button onClick={() => setAdding(true)}>
          <UserPlus data-icon="inline-start" />
          Add
        </Button>
      </div>

      <ul className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/8">
        {filtered.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            {query ? "No matching staff." : "No staff accounts yet."}
          </li>
        ) : (
          filtered.map((user, index) => {
            const self = user.id === currentUserId
            return (
              <li
                key={user.id}
                className={`flex items-center gap-3 px-4 py-3 ${index ? "border-t border-foreground/6" : ""}`}
              >
                <Avatar>
                  <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 truncate font-medium">
                    {user.full_name}
                    {self ? (
                      <Badge variant="secondary">You</Badge>
                    ) : null}
                    {user.must_change_password ? (
                      <Badge variant="outline">Temp password</Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                    <span className="hidden sm:inline">
                      {" · "}Joined {fromNow(user.created_at)}
                    </span>
                  </p>
                </div>
                <div className="shrink-0">
                  {self || user.role === "admin" ? (
                    <span className="text-sm text-muted-foreground">
                      {ROLE_LABELS[user.role]}
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      disabled={pending}
                      aria-label={`Role for ${user.full_name}`}
                      onChange={(event) =>
                        changeRole(user.id, event.target.value as Role)
                      }
                      className="h-8 w-[7.5rem] rounded-lg border-0 bg-muted px-2 text-sm"
                    >
                      <option value="ao">AO</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  )}
                </div>
                {self ? (
                  <span className="w-8" />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setPassword("")
                          setResetFor(user)
                        }}
                      >
                        Reset password
                      </DropdownMenuItem>
                      {user.role === "admin" ? null : (
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => remove(user)}
                        >
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            )
          })
        )}
      </ul>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={create} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Add staff</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  placeholder="Juan Dela Cruz"
                  className="h-10"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">{local ? "Username" : "Email"}</Label>
                <Input
                  id="email"
                  name="email"
                  type={local ? "text" : "email"}
                  required
                  autoComplete="off"
                  placeholder={local ? "juan.delacruz" : "juan.delacruz@school.edu"}
                  className="h-10"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  defaultValue="teacher"
                  className={SELECT}
                >
                  <option value="teacher">Teacher</option>
                  <option value="ao">AO</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Temporary password</Label>
                <Input
                  id="password"
                  name="password"
                  type="text"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="h-10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!resetFor}
        onOpenChange={(open) => !open && setResetFor(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">
              New temporary password for {resetFor?.full_name}
            </Label>
            <Input
              id="new-password"
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              placeholder="At least 8 characters"
              className="h-10"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setResetFor(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReset}
              disabled={pending || password.length < 8}
            >
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
