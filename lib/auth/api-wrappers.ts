import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth.config"
import { getUserFromRequest } from "./auth-utils"
import { reissueAnonymousToken } from "./anonymous"
import { Session } from "next-auth"

// Type definitions for handler contexts
export interface AuthContext {
  user: {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
  }
  session: Session
}

export interface AuthOrAnonTokenContext {
  user: {
    userId: string
    email?: string | null
    isAuthenticated: boolean
    isAnonymous: boolean
  }
  session?: Session | null
  refreshedToken?: string | null
}

// Type for route handlers
type AuthRouteHandler<T = any> = (
  request: NextRequest,
  context: { params: T }
) => Promise<NextResponse> | NextResponse

type AuthenticatedRouteHandler<T = any> = (
  request: NextRequest,
  context: { params: T },
  auth: AuthContext
) => Promise<NextResponse> | NextResponse

type AuthOrAnonTokenRouteHandler<T = any> = (
  request: NextRequest,
  context: { params: T },
  auth: AuthOrAnonTokenContext
) => Promise<NextResponse> | NextResponse

/**
 * Wrapper for API routes that require authentication
 * Automatically returns 401 if user is not authenticated
 */
export function withAuth<T = any>(
  handler: AuthenticatedRouteHandler<T>
): AuthRouteHandler<T> {
  return async (request: NextRequest, context: { params: T }) => {
    try {
      const session = await auth()
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }

      // Call the actual handler with auth context
      return handler(request, context, {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
        session
      })
    } catch (error) {
      console.error("Authentication error:", error)
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      )
    }
  }
}

/**
 * Wrapper for API routes that require either authenticated session or anonymous JWT token
 * Returns 401 if neither auth session nor anonymous token is present
 */
export function withAuthOrAnonToken<T = any>(
  handler: AuthOrAnonTokenRouteHandler<T>
): AuthRouteHandler<T> {
  return async (request: NextRequest, context: { params: T }) => {
    try {
      // Try to get authenticated session first
      const session = await auth()
      
      if (session?.user?.id) {
        // Authenticated user
        return handler(request, context, {
          user: {
            userId: session.user.id,
            email: session.user.email,
            isAuthenticated: true,
            isAnonymous: false,
          },
          session
        })
      }

      // Fall back to getUserFromRequest for anonymous users
      const userInfo = await getUserFromRequest(request)
      
      if (userInfo) {
        // If it's an anonymous user, reissue the token with fresh expiration
        let refreshedToken: string | null = null
        if (userInfo.isAnonymous) {
          const anonToken = request.cookies.get("anonymous-token")?.value
          if (anonToken) {
            refreshedToken = reissueAnonymousToken(anonToken)
          }
        }
        
        return handler(request, context, {
          user: userInfo,
          session: null,
          refreshedToken
        })
      }

      // No auth at all - return 401
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    } catch (error) {
      console.error("Authentication error:", error)
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      )
    }
  }
}

/**
 * Wrapper for API routes that are completely public
 * No authentication check performed
 */
export function withPublic<T = any>(
  handler: AuthRouteHandler<T>
): AuthRouteHandler<T> {
  return handler
}

/**
 * Helper to set refreshed anonymous token cookie in response
 * Handles both NextResponse and regular Response objects
 */
export function setRefreshedTokenCookie<T extends Response | NextResponse>(
  response: T,
  refreshedToken: string | null | undefined
): T {
  if (refreshedToken && response instanceof NextResponse) {
    response.cookies.set("anonymous-token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 1 day
      path: "/",
    })
  } else if (refreshedToken && response instanceof Response) {
    // For regular Response objects, we need to set the cookie via headers
    const cookieValue = `anonymous-token=${refreshedToken}; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
    response.headers.append("Set-Cookie", cookieValue)
  }
  return response
}

// Export convenience types for route handlers
export type { 
  AuthRouteHandler,
  AuthenticatedRouteHandler,
  AuthOrAnonTokenRouteHandler 
}