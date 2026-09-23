import { redirect } from "next/navigation"
import { APP_NAME, APP_TAGLINE } from "@/lib/constants"
import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { isLocalMode } from "@/lib/local/mode"
import { getSessionProfile } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const profile = await getSessionProfile()
  if (profile) redirect("/")

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="icon" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,168,56,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,76,92,0.16),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(232,168,56,0.1),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,76,92,0.28),transparent_28%)]" />
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-foreground/10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-sidebar px-8 py-10 text-sidebar-foreground">
          <p className="text-sm tracking-[0.2em] uppercase text-sidebar-foreground/70">
            School staff portal
          </p>
          <h1 className="font-heading mt-3 text-4xl leading-tight">{APP_NAME}</h1>
          <p className="mt-3 max-w-sm text-sm text-sidebar-foreground/80">
            {APP_TAGLINE}
          </p>
          <ul className="mt-8 space-y-3 text-sm text-sidebar-foreground/85">
            <li>Announcements stay on the feed instead of getting buried in the GC.</li>
            <li>Teachers can download resources — they cannot delete them.</li>
            <li>Calendar reminders for meetings, deadlines, and school events.</li>
          </ul>
        </div>
        <div className="px-8 py-10">
          <h2 className="font-heading text-2xl">Sign in</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            {isLocalMode()
              ? "Local test login is ready. Use the default admin account below."
              : "Use the username Ma'am Lorna or the AO created for you."}
          </p>
          {isLocalMode() ? (
            <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-500/15 dark:text-amber-100">
              Username: <strong>admin</strong>
              <br />
              Password: <strong>admin123</strong>
            </div>
          ) : null}
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
