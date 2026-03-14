import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { RoleName, ROLE_PERMISSIONS } from "@/lib/rbac/types";

// Routes that require supervisor role
const SUPERVISOR_ONLY_ROUTES = [
  '/users',
  '/admin',
];

// Routes with specific permission requirements
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/users': ['users:manage'],
  '/settings': ['settings:manage'],
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow auth page, API routes, and static assets through
  const isPublicPath =
    pathname === "/auth" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (!user && !isPublicPath) {
    // Not logged in — redirect to /auth
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (user && pathname === "/auth") {
    // Already logged in — redirect to /
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Role-based access control for protected routes
  if (user) {
    // Get user's role from profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(`
        role:roles(name)
      `)
      .eq('user_id', user.id)
      .single();

    const userRole = (profile?.role?.name || 'general_user') as RoleName;
    const userPermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.general_user;

    // Check supervisor-only routes
    const isSupervisorRoute = SUPERVISOR_ONLY_ROUTES.some(route => 
      pathname.startsWith(route)
    );

    if (isSupervisorRoute && userRole !== 'supervisor') {
      // Redirect non-supervisors away from supervisor-only routes
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check route-specific permissions
    for (const [route, requiredPermissions] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(route)) {
        const hasRequiredPermission = requiredPermissions.some(
          permission => userPermissions.includes(permission)
        );

        if (!hasRequiredPermission) {
          // User doesn't have required permission for this route
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }

    // Add role information to response headers for client-side access
    supabaseResponse.headers.set('x-user-role', userRole);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
