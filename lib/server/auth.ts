import type { Context } from "hono";
import type { Next } from "hono";
import { setCookie } from "hono/cookie";
import { getUserFromRequest, toRequestContext } from "@/lib/auth/auth-utils";
import {
  ANONYMOUS_ACCESS_COOKIE_NAME,
  ANONYMOUS_ACCESS_TOKEN_TTL,
} from "@/lib/auth/anonymous.constants";
import { reissueAnonymousToken } from "@/lib/auth/anonymous";

export interface AuthState {
  userId: string;
  email?: string | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
}

export function requireAuthenticated() {
  return async (c: Context, next: Next) => {
    const context = toRequestContext(c.req.raw);
    const user = await getUserFromRequest(context);

    if (!user || !user.isAuthenticated) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("auth", normalizeAuthState(user));
    await next();
  };
}

export function requireAuthOrAnonymous({
  refreshAnonymousToken = true,
}: { refreshAnonymousToken?: boolean } = {}) {
  return async (c: Context, next: Next) => {
    const context = toRequestContext(c.req.raw);
    const user = await getUserFromRequest(context);

    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (refreshAnonymousToken && user.isAnonymous) {
      const token = c.req.cookie(ANONYMOUS_ACCESS_COOKIE_NAME);
      if (token) {
        const refreshed = reissueAnonymousToken(token);
        if (refreshed) {
          setCookie(c, ANONYMOUS_ACCESS_COOKIE_NAME, refreshed.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: ANONYMOUS_ACCESS_TOKEN_TTL,
            path: "/",
          });
        }
      }
    }

    c.set("auth", normalizeAuthState(user));
    await next();
  };
}

export function getAuth(c: Context): AuthState | undefined {
  return c.get("auth") as AuthState | undefined;
}

function normalizeAuthState(user: {
  userId: string;
  email?: string | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
}): AuthState {
  return {
    userId: user.userId,
    email: user.email,
    isAuthenticated: user.isAuthenticated,
    isAnonymous: user.isAnonymous,
  };
}
