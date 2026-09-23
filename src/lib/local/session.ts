import { cookies } from "next/headers"
import { SESSION_COOKIE } from "@/lib/local/mode"
import {
  decodeSession,
  encodeSession,
  type SessionPayload,
} from "@/lib/local/codec"

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  return decodeSession(jar.get(SESSION_COOKIE)?.value)
}

export async function writeSession(payload: SessionPayload) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}
