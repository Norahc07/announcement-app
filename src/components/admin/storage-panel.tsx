"use client"

import { useState, useTransition, type ReactNode } from "react"
import { Download, HardDrive, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  deletePreviousSchoolYear,
  exportSchoolData,
  type StorageUsage,
} from "@/lib/actions/storage"
import { formatBytes, formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function StoragePanel({ usage }: { usage: StorageUsage }) {
  const [pending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState(false)
  const percent = Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100)
  const tone =
    percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-600"
  const leftover =
    usage.previousYear.announcements +
    usage.previousYear.files +
    usage.previousYear.events

  function onExport() {
    startTransition(async () => {
      const result = await exportSchoolData()
      if ("error" in result && result.error) {
        toast.error(result.error)
        return
      }
      if (!("data" in result) || !result.data) {
        toast.error("Could not export.")
        return
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const stamp = new Date().toISOString().slice(0, 10)
      link.href = url
      link.download = `staff-board-export-${stamp}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Export downloaded. Keep this file offline.")
    })
  }

  function onDeleteOld() {
    if (!confirmed) {
      toast.error("Confirm that you already exported this year.")
      return
    }
    if (
      !confirm(
        `Delete posts, events, and Drive files from before ${formatDate(usage.cutoffIso)}? This cannot be undone.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await deletePreviousSchoolYear()
      if (result.error) {
        toast.error(result.error)
        return
      }
      setConfirmed(false)
      toast.success("Previous school year removed from Staff Board.")
    })
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Storage used</p>
            <p className="text-xs text-muted-foreground">
              {usage.schoolYear} · Free-tier limit 1 GB
            </p>
          </div>
          <p className="text-sm tabular-nums">
            {formatBytes(usage.usedBytes)} / {formatBytes(usage.quotaBytes)}
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width]", tone)}
            style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {percent.toFixed(1)}% · Drive {formatBytes(usage.driveBytes)} (
          {usage.fileCount} files) · Posts {formatBytes(usage.announcementBytes)} (
          {usage.attachmentCount} attachments)
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          The bar grows when someone uploads a Drive file or attaches a photo,
          video, or PDF to a post. Text posts and comments do not add Storage.
        </p>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
        <h2 className="font-heading text-lg">Yearly export</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download a JSON backup of posts, comments, calendar, folders, and file
          names. Then copy any Drive files you still need. Only the principal can
          do this.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Last export:{" "}
          {usage.lastExportAt ? formatDate(usage.lastExportAt) : "Never"}
          {usage.exportOverdue ? " · Due now" : ""}
        </p>
        <div className="mt-3">
          <Button onClick={onExport} disabled={pending}>
            <Download data-icon="inline-start" />
            {pending ? "Preparing…" : "Export this year"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
        <h2 className="font-heading text-lg">Remove previous school year</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          After you export, you can delete records from before{" "}
          {formatDate(usage.cutoffIso)}. Staff accounts stay. This frees Storage
          on Supabase.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Waiting to remove: {usage.previousYear.announcements} posts,{" "}
          {usage.previousYear.files} files, {usage.previousYear.events} events
        </p>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1 size-4 accent-primary"
          />
          I already downloaded this year’s export and the files we still need.
        </label>
        <div className="mt-3">
          <Button
            variant="destructive"
            onClick={onDeleteOld}
            disabled={pending || leftover === 0 || !confirmed}
          >
            <Trash2 data-icon="inline-start" />
            Delete previous year
          </Button>
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
        <h2 className="font-heading mb-3 text-lg">Rules for the principal</h2>
        <div className="space-y-2">
          <Rule title="Who can manage storage">
            Only the principal (admin) sees this page, exports data, and deletes
            an old school year. Teachers can download files. The AO can upload,
            but cannot wipe a year.
          </Rule>
          <Rule title="Keep photos small">
            Large photos are resized to 1920px and saved as high-quality JPEG
            before upload. They still look sharp on screen, but use much less of
            the 1 GB free Storage.
          </Rule>
          <Rule title="What uses the bar">
            Each upload stores the file size. Drive files and post attachments
            add to the bar immediately after upload. Comments, likes, and calendar
            events stay in the database and do not fill the 1 GB file Storage.
          </Rule>
          <Rule title="Every school year">
            Near the end of the year (or if it has been 11 months), export the
            JSON, save important Drive files, then delete the previous year so
            next year’s uploads have room.
          </Rule>
          <Rule title="Do not store videos here">
            Short clips are possible, but video fills 1 GB quickly. Prefer a
            school YouTube or Google Drive link in the post.
          </Rule>
          <Rule title="Keep the project awake">
            A free Supabase project pauses after 7 days with no visits. Open
            Staff Board at least once a week, including holidays if teachers
            still need files.
          </Rule>
        </div>
      </section>
    </div>
  )
}

function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-lg bg-muted/50 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium">{title}</summary>
      <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
    </details>
  )
}

export function StorageMeter({
  usedBytes,
  quotaBytes,
  compact,
  variant = "default",
}: {
  usedBytes: number
  quotaBytes: number
  compact?: boolean
  variant?: "default" | "sidebar"
}) {
  const percent = Math.min(100, (usedBytes / quotaBytes) * 100)
  const tone =
    percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"
  const sidebar = variant === "sidebar"
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div
        className={cn(
          "flex items-center justify-between gap-2 text-xs",
          sidebar ? "text-sidebar-foreground/70" : "text-muted-foreground"
        )}
      >
        <span className="inline-flex items-center gap-1">
          <HardDrive className="size-3.5" />
          Storage
        </span>
        <span className="tabular-nums">
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </span>
      </div>
      <div
        className={cn(
          "h-1.5 overflow-hidden rounded-full",
          sidebar ? "bg-sidebar-foreground/15" : "bg-muted"
        )}
      >
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(percent, percent > 0 ? 3 : 0)}%` }} />
      </div>
    </div>
  )
}
