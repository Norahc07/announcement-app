import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAnonKey, supabaseUrl } from "@/lib/constants"
import { isLocalMode, SESSION_COOKIE } from "@/lib/local/mode"
import { decodeSession } from "@/lib/local/codec"

const PUBLIC_PATHS = ["/login"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path))
}

function isAdminPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname === "/users" ||
    pathname.startsWith("/users/")
  )
}

function updateLocalSession(request: NextRequest) {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value)
  const pathname = request.nextUrl.pathname

  if (!session && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (session && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  if (session && isAdminPath(pathname) && session.role !== "admin") {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next({ request })
}

export async function updateSession(request: NextRequest) {
  if (isLocalMode()) {
    return updateLocalSession(request)
  }

  const url = supabaseUrl()
  const key = supabaseAnonKey()

  if (!url || !key) {
    return updateLocalSession(request)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublic = isPublicPath(pathname)

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password")
      .eq("id", user.id)
      .maybeSingle()

    if (
      profile?.must_change_password &&
      pathname !== "/profile" &&
      pathname !== "/login"
    ) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/profile"
      redirectUrl.searchParams.set("required", "1")
      return NextResponse.redirect(redirectUrl)
    }

    if (isAdminPath(pathname) && profile?.role !== "admin") {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/"
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}
