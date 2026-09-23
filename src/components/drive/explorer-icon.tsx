"use client"

import { useRef } from "react"
import { fileKind, localFileUrl } from "@/lib/drive-kind"
import { isLocalMode } from "@/lib/local/mode"
import type { DriveFile } from "@/lib/types"
import { cn } from "@/lib/utils"

function mediaUrl(file: DriveFile) {
  return file.preview_url || (isLocalMode() ? localFileUrl(file.storage_path) : undefined)
}

function FolderGlyph({ large }: { large?: boolean }) {
  return (
    <svg
      viewBox="0 0 96 80"
      className={large ? "h-[4.75rem] w-[5.75rem]" : "h-8 w-10"}
      aria-hidden
    >
      <path
        d="M6 18c0-3.3 2.7-6 6-6h22l8 8h48c3.3 0 6 2.7 6 6v40c0 3.3-2.7 6-6 6H12c-3.3 0-6-2.7-6-6V18z"
        fill="#FFC83D"
      />
      <path d="M10 14h24l6 7H10V14z" fill="#FFE18A" />
      <path
        d="M6 32h84v34c0 3.3-2.7 6-6 6H12c-3.3 0-6-2.7-6-6V32z"
        fill="#EFB422"
      />
      <path d="M6 32h84v4H6z" fill="#F6D36A" opacity="0.7" />
    </svg>
  )
}

function OfficeDoc({
  brand,
  letter,
  large,
}: {
  brand: string
  letter: string
  large?: boolean
}) {
  return (
    <svg
      viewBox="0 0 48 56"
      className={large ? "h-20 w-[4.35rem] drop-shadow-sm" : "h-9 w-7"}
      aria-hidden
    >
      <path d="M8 2h22l14 14v36c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V6c0-2.2 1.8-4 4-4z" fill="#F7F9FC" />
      <path d="M30 2v11c0 1.7 1.3 3 3 3h11" fill="#E4E8EE" />
      <path d="M8 2h22l14 14v36c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V6c0-2.2 1.8-4 4-4z" fill="none" stroke="#C5CDD6" />
      <rect x="1" y="24" width="28" height="22" rx="3" fill={brand} />
      <text
        x="15"
        y="40"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Segoe UI, Arial, sans-serif"
        fontSize={letter.length > 1 ? 10 : 15}
        fontWeight="700"
      >
        {letter}
      </text>
    </svg>
  )
}

function GenericPage({ large, badge }: { large?: boolean; badge?: string }) {
  return (
    <svg
      viewBox="0 0 48 56"
      className={large ? "h-20 w-[4.35rem] drop-shadow-sm" : "h-9 w-7"}
      aria-hidden
    >
      <path d="M8 2h22l14 14v36c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V6c0-2.2 1.8-4 4-4z" fill="#F7F9FC" />
      <path d="M30 2v11c0 1.7 1.3 3 3 3h11" fill="#E4E8EE" />
      <path d="M8 2h22l14 14v36c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V6c0-2.2 1.8-4 4-4z" fill="none" stroke="#C5CDD6" />
      <path d="M12 28h24M12 34h18M12 40h20" stroke="#D0D5DC" strokeWidth="2" strokeLinecap="round" />
      {badge ? (
        <g>
          <rect x="10" y="42" width="22" height="10" rx="2" fill="#4B5563" />
          <text
            x="21"
            y="50"
            textAnchor="middle"
            fill="#fff"
            fontFamily="Segoe UI, Arial, sans-serif"
            fontSize="7"
            fontWeight="700"
          >
            {badge}
          </text>
        </g>
      ) : null}
    </svg>
  )
}

function AudioGlyph({ large }: { large?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 56"
      className={large ? "h-20 w-[4.35rem] drop-shadow-sm" : "h-9 w-7"}
      aria-hidden
    >
      <path d="M8 2h22l14 14v36c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V6c0-2.2 1.8-4 4-4z" fill="#F3E8FF" />
      <path d="M30 2v11c0 1.7 1.3 3 3 3h11" fill="#E9D5FF" />
      <path d="M8 2h22l14 14v36c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V6c0-2.2 1.8-4 4-4z" fill="none" stroke="#C4B5FD" />
      <circle cx="20" cy="38" r="7" fill="#7C3AED" />
      <path d="M26 18v16.5" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 18c6 2 10 5 10 9" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function FolderIcon({ large }: { large?: boolean }) {
  return <FolderGlyph large={large} />
}

export function FileTypeIcon({
  file,
  large,
}: {
  file: DriveFile
  large?: boolean
}) {
  const kind = fileKind(file)
  if (kind === "excel") return <OfficeDoc brand="#1D6F42" letter="X" large={large} />
  if (kind === "word") return <OfficeDoc brand="#2B579A" letter="W" large={large} />
  if (kind === "powerpoint") return <OfficeDoc brand="#C43E1C" letter="P" large={large} />
  if (kind === "pdf") return <OfficeDoc brand="#E5252A" letter="PDF" large={large} />
  if (kind === "zip") return <OfficeDoc brand="#C7A008" letter="ZIP" large={large} />
  if (kind === "audio") return <AudioGlyph large={large} />
  if (kind === "text") return <GenericPage large={large} badge="TXT" />
  return <GenericPage large={large} />
}

function VideoThumb({
  url,
  className,
}: {
  url: string
  className?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  return (
    <span className={cn("relative block overflow-hidden bg-zinc-900", className)}>
      <video
        ref={ref}
        src={url}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        onLoadedMetadata={(event) => {
          const video = event.currentTarget
          if (video.duration > 0.4) video.currentTime = Math.min(0.8, video.duration / 4)
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
        <span className="flex size-7 items-center justify-center rounded-full bg-black/70 text-white">
          <svg viewBox="0 0 24 24" className="ml-0.5 size-3.5 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </span>
  )
}

export function ExplorerThumb({
  file,
  large,
}: {
  file: DriveFile
  large?: boolean
}) {
  const kind = fileKind(file)
  const url = mediaUrl(file)
  const frame = large
    ? "h-[4.75rem] w-[5.75rem] rounded-[2px] shadow-sm"
    : "size-10 rounded-[2px]"

  if (kind === "image" && url) {
    return (
      <span className={cn("block overflow-hidden bg-card ring-1 ring-foreground/15", frame)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </span>
    )
  }

  if (kind === "video" && url) {
    return <VideoThumb url={url} className={cn(frame, "ring-1 ring-foreground/20")} />
  }

  return <FileTypeIcon file={file} large={large} />
}
