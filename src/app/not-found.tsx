import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <div className="relative flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="absolute top-4 right-4">
        <ThemeToggle variant="icon" />
      </div>
      <h1 className="font-heading text-3xl">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        That announcement or folder may have been moved. Head back to the feed.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-6")}>
        Back to bulletin
      </Link>
    </div>
  )
}
