import { NextResponse, NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Redirect root path to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Allow all other requests
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}