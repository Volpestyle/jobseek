import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/lib/auth/auth.config"

export async function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")
  
  // Check if user is authenticated via NextAuth
  const session = await auth()
  const isAuthenticated = !!session?.user

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Allow all other requests
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}