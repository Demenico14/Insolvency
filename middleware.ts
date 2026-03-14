import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { RoleName, ROLE_PERMISSIONS } from "@/lib/rbac/types"

// ── Route config ──────────────────────────────────────────────────────────────

/** Routes only supervisors may visit */
const SUPERVISOR_ONLY_ROUTES = ['/users', '/admin', '/audit']

/** Routes that require a specific permission */
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/users':    ['users:manage'],
  '/settings': ['settings:view_own'],
}

/** Public paths — no auth required */
const isPublicPath = (pathname: string) =>
  pathname === '/auth' ||
  pathname.startsWith('/api/') ||
  pathname.startsWith('/_next') ||
  pathname.startsWith('/favicon')

// ── Middleware ─────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Build a lightweight Supabase client just to refresh the session cookie.
  // We do NOT make any extra DB calls here — everything comes from the JWT.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the JWT and refreshes the session cookie if needed.
  // It does NOT hit the database — the user object is decoded from the token.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── 1. Let public paths through ─────────────────────────────────────────────
  if (isPublicPath(pathname)) {
    // Redirect already-authenticated users away from /auth
    if (user && pathname === '/auth') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // ── 2. Redirect unauthenticated users to /auth ───────────────────────────────
  if (!user) {
    const url = new URL('/auth', request.url)
    url.searchParams.set('next', pathname) // preserve destination
    return NextResponse.redirect(url)
  }

  // ── 3. Read role + active status from JWT app_metadata (zero DB cost) ────────
  //
  //  app_metadata is written by our sync_user_role_to_jwt trigger whenever
  //  user_profiles.role_id or user_profiles.is_active changes, and also on
  //  initial signup via handle_new_user.  It is server-controlled and cannot
  //  be modified by the client.
  //
  const appMeta   = user.app_metadata ?? {}
  const isActive  = appMeta.is_active !== false // default true if not set yet
  const userRole  = (appMeta.role ?? 'general_user') as RoleName
  const userPerms = ROLE_PERMISSIONS[userRole] ?? ROLE_PERMISSIONS.general_user

  // ── 4. Block deactivated accounts ────────────────────────────────────────────
  if (!isActive) {
    const url = new URL('/auth', request.url)
    url.searchParams.set('error', 'account_disabled')
    const response = NextResponse.redirect(url)
    // Wipe all Supabase session cookies so the user is fully signed out
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-')) response.cookies.delete(name)
    })
    return response
  }

  // ── 5. Supervisor-only route guard ────────────────────────────────────────────
  if (SUPERVISOR_ONLY_ROUTES.some(r => pathname.startsWith(r))) {
    if (userRole !== 'supervisor') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── 6. Permission-based route guard ───────────────────────────────────────────
  for (const [route, required] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      const hasPermission = required.some(p => userPerms.includes(p))
      if (!hasPermission) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  // ── 7. Stamp role onto response header for downstream use ────────────────────
  supabaseResponse.headers.set('x-user-role', userRole)

  return supabaseResponse
}

// ── Matcher: skip Next.js internals and static assets ─────────────────────────
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}