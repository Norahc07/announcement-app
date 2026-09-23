import { promises as fs } from "fs"
import { NextRequest } from "next/server"
import { uploadAbsPath } from "@/lib/local/db"
import { isLocalMode } from "@/lib/local/mode"
import { getSessionProfile } from "@/lib/supabase/server"

export const runtime = "nodejs"

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  pdf: "application/pdf",
  txt: "text/plain",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
}

export async function GET(request: NextRequest) {
  if (!isLocalMode()) {
    return new Response("Not found", { status: 404 })
  }

  const profile = await getSessionProfile()
  if (!profile) {
    return new Response("Unauthorized", { status: 401 })
  }

  const storagePath = request.nextUrl.searchParams.get("p")
  if (!storagePath) {
    return new Response("Missing file", { status: 400 })
  }

  const abs = uploadAbsPath(storagePath)
  if (!abs) {
    return new Response("Invalid path", { status: 400 })
  }

  try {
    const data = await fs.readFile(abs)
    const download = request.nextUrl.searchParams.get("download")
    const filename = storagePath.split("/").pop() || "file"
    const ext = filename.split(".").pop()?.toLowerCase() || ""
    const headers = new Headers()
    headers.set("Content-Type", TYPES[ext] || "application/octet-stream")
    const safeName = filename.replace(/"/g, "")
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${safeName}"`
    )
    return new Response(new Uint8Array(data), { headers })
  } catch {
    return new Response("File not found", { status: 404 })
  }
}
