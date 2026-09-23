"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { FileText, ImageIcon, Pin, Video, X } from "lucide-react"
import { toast } from "sonner"
import { createAnnouncement } from "@/lib/actions/announcements"
import {
  imageOrientation,
  prepareUploadFiles,
  type ImageOrientation,
} from "@/lib/image-compress"
import { firstName, initials } from "@/lib/format"
import type { Profile } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AnnouncementComposer({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [pinned, setPinned] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [pending, startTransition] = useTransition()
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const name = firstName(profile.full_name)

  useEffect(() => {
    if (open) textRef.current?.focus()
  }, [open])

  async function addFiles(list: FileList | null) {
    if (!list?.length) return
    const prepared = await prepareUploadFiles(Array.from(list))
    setFiles((current) => [...current, ...prepared])
    setOpen(true)
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
  }

  function reset() {
    setBody("")
    setPinned(false)
    setFiles([])
    setOpen(false)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData()
    formData.set("body", body)
    if (pinned) formData.set("pinned", "on")
    files.forEach((file) => formData.append("files", file))

    startTransition(async () => {
      const result = await createAnnouncement(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      reset()
      toast.success("Announcement posted.")
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/8 transition-shadow duration-200 sm:px-5"
    >
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ""
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        multiple
        hidden
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ""
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ""
        }}
      />

      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
        </Avatar>

        {open ? (
          <textarea
            ref={textRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={`What's on your mind, ${name}?`}
            className="min-h-20 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
            required
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-10 flex-1 rounded-full bg-muted/80 px-4 text-left text-[15px] text-muted-foreground hover:bg-muted"
          >
            What&apos;s on your mind, {name}?
          </button>
        )}

        {!open ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <ComposerIcon
              label="Video"
              className="text-red-500"
              onClick={() => videoRef.current?.click()}
            >
              <Video className="size-5" />
            </ComposerIcon>
            <ComposerIcon
              label="Photo"
              className="text-green-500"
              onClick={() => photoRef.current?.click()}
            >
              <ImageIcon className="size-5" />
            </ComposerIcon>
            <ComposerIcon
              label="File"
              className="text-pink-500"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="size-5" />
            </ComposerIcon>
          </div>
        ) : null}
      </div>

      {open && files.length ? (
        <ul className="mt-3 flex flex-wrap gap-2 pl-11">
          {files.map((file, index) => (
            <FileChip
              key={`${file.name}-${index}`}
              file={file}
              onRemove={() => removeFile(index)}
            />
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2 pl-11">
          <div className="flex items-center">
            <ComposerIcon
              label="Video"
              className="text-red-500"
              onClick={() => videoRef.current?.click()}
            >
              <Video className="size-5" />
            </ComposerIcon>
            <ComposerIcon
              label="Photo"
              className="text-green-500"
              onClick={() => photoRef.current?.click()}
            >
              <ImageIcon className="size-5" />
            </ComposerIcon>
            <ComposerIcon
              label="File"
              className="text-pink-500"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="size-5" />
            </ComposerIcon>
            <ComposerIcon
              label="Pin to top"
              className={pinned ? "text-amber-500" : "text-muted-foreground"}
              onClick={() => setPinned((value) => !value)}
            >
              <Pin className={cn("size-5", pinned && "fill-current")} />
            </ComposerIcon>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending || !body.trim()}>
              {pending ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  )
}

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState<{
    url: string
    orientation: ImageOrientation
  } | null>(null)

  useEffect(() => {
    if (!file.type.startsWith("image/")) return
    const next = URL.createObjectURL(file)
    const image = new window.Image()
    image.onload = () => {
      setPreview({
        url: next,
        orientation: imageOrientation(image.naturalWidth, image.naturalHeight),
      })
    }
    image.src = next
    return () => URL.revokeObjectURL(next)
  }, [file])

  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        preview?.orientation === "portrait" && "h-20 w-14",
        preview?.orientation === "landscape" && "h-14 w-24",
        preview?.orientation === "square" && "size-16",
        !preview && "size-16"
      )}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.url} alt="" className="h-full w-full object-contain" />
      ) : (
        <span className="flex h-16 max-w-40 items-center gap-1.5 px-2 text-xs">
          {file.type.startsWith("video/") ? (
            <Video className="size-4 shrink-0 text-red-500" />
          ) : (
            <FileText className="size-4 shrink-0 text-pink-500" />
          )}
          <span className="truncate">{file.name}</span>
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white"
        aria-label={`Remove ${file.name}`}
      >
        <X className="size-3" />
      </button>
    </li>
  )
}

function ComposerIcon({
  label,
  className,
  onClick,
  children,
}: {
  label: string
  className?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full hover:bg-muted",
        className
      )}
    >
      {children}
    </button>
  )
}
