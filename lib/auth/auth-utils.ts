import { NextRequest } from "next/server"
import { auth } from "./auth.config"
import { verifyAnonymousToken } from "./anonymous"

export interface UserInfo {
  userId: string
  email?: string | null
  isAuthenticated: boolean
  isAnonymous: boolean
}

/**
 * Unified function to get user information from request
 * Checks NextAuth session first, then falls back to anonymous token
 */
export async function getUserFromRequest(request: NextRequest): Promise<UserInfo | null> {
  // First check for authenticated user via NextAuth
  const session = await auth()
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      email: session.user.email,
      isAuthenticated: true,
      isAnonymous: false,
    }
  }

  // Fall back to anonymous token
  const anonToken = request.cookies.get('anonymous-token')?.value
  if (anonToken) {
    try {
      const decoded = verifyAnonymousToken(anonToken)
      if (decoded?.id) {
        return {
          userId: `anon_${decoded.id}`,
          email: null,
          isAuthenticated: false,
          isAnonymous: true,
        }
      }
    } catch (error) {
      console.error('Failed to verify anonymous token:', error)
    }
  }

  // No user found
  return null
}