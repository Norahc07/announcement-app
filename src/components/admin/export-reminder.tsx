import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ExportReminder({ schoolYear }: { schoolYear: string }) {
  return (
    <Alert className="mb-4">
      <AlertTitle>Yearly backup is due</AlertTitle>
      <AlertDescription>
        Export {schoolYear} posts and files, then remove the previous school year
        so the 1 GB Storage bar stays free.{" "}
        <Link href="/admin/storage" className="font-medium text-foreground">
          Open Storage
        </Link>
      </AlertDescription>
    </Alert>
  )
}
