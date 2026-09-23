import type { DriveFile } from "@/lib/types"

export type FileKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "zip"
  | "text"
  | "file"

export function fileKind(file: Pick<DriveFile, "name" | "mime_type">): FileKind {
  const mime = (file.mime_type || "").toLowerCase()
  const name = file.name.toLowerCase()

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|heic)$/.test(name)) {
    return "image"
  }
  if (mime.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/.test(name)) {
    return "video"
  }
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/.test(name)) {
    return "audio"
  }
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf"
  if (
    mime.includes("word") ||
    mime.includes("msword") ||
    /\.(docx?|rtf)$/.test(name)
  ) {
    return "word"
  }
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    /\.(xlsx?|csv)$/.test(name)
  ) {
    return "excel"
  }
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    /\.(pptx?)$/.test(name)
  ) {
    return "powerpoint"
  }
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    /\.(zip|rar|7z|tar|gz)$/.test(name)
  ) {
    return "zip"
  }
  if (mime.startsWith("text/") || /\.(txt|md)$/.test(name)) return "text"
  return "file"
}

export function localFileUrl(storagePath: string) {
  return `/api/local-file?p=${encodeURIComponent(storagePath)}`
}
