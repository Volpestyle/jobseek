import { getSessionFromRequest as getAuthSessionFromRequest } from "@/lib/auth/auth.server";
import { verifyAnonymousToken } from "./anonymous";
import { ANONYMOUS_ACCESS_COOKIE_NAME } from "./anonymous.constants";

export interface UserInfo {
  userId: string;
  email?: string | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
}

export interface RequestContext {
  headers: Headers;
  cookies?: {
    get(name: string): { value: string } | undefined;
  };
  ip?: string | null;
  url?: string;
  method?: string;
}

export function toRequestContext(request: Request | RequestContext): RequestContext {
  if (request instanceof Request) {
    const headers = new Headers(request.headers);
    const cookieHeader = headers.get("cookie");
    const cookieMap = new Map<string, string>();
    if (cookieHeader) {
      for (const part of cookieHeader.split(";")) {
        const [name, ...rest] = part.split("=");
        const key = name?.trim();
        if (!key) continue;
        cookieMap.set(key, rest.join("=").trim());
      }
    }

    return {
      headers,
      cookies: {
        get(name: string) {
          const value = cookieMap.get(name);
          return value ? { value } : undefined;
        },
      },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      url: request.url,
      method: request.method,
    };
  }

  return request as RequestContext;
}

/**
 * Unified function to get user information from request
 * Checks NextAuth session first, then falls back to anonymous token
 */
export async function getUserFromRequest(
  request: RequestContext
): Promise<UserInfo | null> {
  const context = toRequestContext(request);

  const session = await getSessionFromRequestContext(context);
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      email: session.user.email,
      isAuthenticated: true,
      isAnonymous: false,
    };
  }

  // Fall back to anonymous token
  const anonToken = context.cookies?.get(ANONYMOUS_ACCESS_COOKIE_NAME)?.value;
  if (anonToken) {
    try {
      const decoded = verifyAnonymousToken(anonToken);
      if (decoded?.id) {
        return {
          userId: `anon_${decoded.id}`,
          email: null,
          isAuthenticated: false,
          isAnonymous: true,
        };
      }
    } catch (error) {
      console.error("Failed to verify anonymous token:", error);
    }
  }

  // No user found
  return null;
}

async function getSessionFromRequestContext(context: RequestContext) {
  const baseUrl = resolveBaseUrl(context.url);

  const sessionUrl = new URL("/api/auth/session", baseUrl);
  const headers = new Headers(context.headers);

  if (!headers.has("cookie") && context.cookies) {
    const knownCookies = [
      // Auth.js v5 cookie names
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "authjs.csrf-token",
      // Legacy NextAuth.js cookie names kept for compatibility
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
    ];
    const cookiePairs = knownCookies
      .map((name) => {
        const value = context.cookies?.get(name)?.value;
        return value ? `${name}=${value}` : null;
      })
      .filter(Boolean) as string[];
    if (cookiePairs.length > 0) {
      headers.set("cookie", cookiePairs.join("; "));
    }
  }

  headers.set("host", sessionUrl.host);

  const request = new Request(sessionUrl.toString(), {
    method: "GET",
    headers,
  });

  return getAuthSessionFromRequest(request);
}

function resolveBaseUrl(requestUrl?: string) {
  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch (error) {
      console.warn("Invalid request URL provided for session lookup:", error);
    }
  }

  const allowList = process.env.AUTH_REDIRECT_ALLOWLIST?.split(",");
  const firstAllowed = allowList?.find((value) => value.trim().length > 0);
  const originFromAllowList = firstAllowed
    ? safeOrigin(firstAllowed.trim())
    : null;

  const fallbacks = [
    process.env.APP_ORIGIN,
    originFromAllowList,
    `http://localhost:${process.env.PORT ?? 3000}`,
  ];

  for (const candidate of fallbacks) {
    const origin = candidate && safeOrigin(candidate);
    if (origin) return origin;
  }

  return "http://localhost:3000";
}

function safeOrigin(value: string | undefined | null) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch (error) {
    console.warn("Ignoring invalid origin while resolving session base URL:", value, error);
    return null;
  }
}
