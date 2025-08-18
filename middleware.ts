import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";

// Define protected API routes that require authentication
const protectedApiRoutes = [
  "/api/user",
  "/api/boards",
  "/api/searches/saved",
  "/api/jobs/saved",
  "/api/resume",
];

// Define public API routes that don't require authentication
const publicApiRoutes = ["/api/auth", "/api/health"];

// Define mixed API routes that support both authenticated and anonymous users
const mixedApiRoutes = ["/api/wallcrawler", "/api/jobs/search-results"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Redirect root path to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check if this is an API route
  if (pathname.startsWith("/api")) {
    // Check if it's a public route
    const isPublicRoute = publicApiRoutes.some((route) =>
      pathname.startsWith(route)
    );
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Check if it's a mixed route (supports both auth and anonymous)
    const isMixedRoute = mixedApiRoutes.some((route) =>
      pathname.startsWith(route)
    );
    if (isMixedRoute) {
      // Mixed routes handle their own auth logic
      return NextResponse.next();
    }

    // Check if it's a protected route
    const isProtectedRoute = protectedApiRoutes.some((route) =>
      pathname.startsWith(route)
    );
    if (isProtectedRoute) {
      // Verify authentication for protected routes
      const session = await auth();

      if (!session?.user) {
        // Return 401 for API routes
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  // Allow all other requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
