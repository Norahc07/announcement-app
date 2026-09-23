import type { Role } from "@/lib/types"

export type SessionPayload = {
  id: string
  role: Role
}

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeSession(payload: SessionPayload) {
  return toBase64Url(JSON.stringify(payload))
}

export function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as SessionPayload
    if (!parsed?.id || !parsed?.role) return null
    return parsed
  } catch {
    return null
  }
}
