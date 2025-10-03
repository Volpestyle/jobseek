import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { setCookie } from "hono/cookie";
import {
  createAnonymousRefreshToken,
  createAnonymousToken,
  parseRefreshTokenCookie,
  refreshTokenMatches,
} from "@/lib/auth/anonymous";
import {
  ANONYMOUS_ACCESS_COOKIE_NAME,
  ANONYMOUS_ACCESS_TOKEN_TTL,
  ANONYMOUS_REFRESH_COOKIE_NAME,
  ANONYMOUS_REFRESH_TOKEN_TTL,
} from "@/lib/auth/anonymous.constants";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import {
  checkAnonymousTokenIssueRateLimit,
  checkAnonymousTokenRefreshRateLimit,
} from "@/lib/auth/rate-limiter";
import { handleAuthRequest } from "@/lib/auth/auth.server";
import { toRequestContext } from "@/lib/auth/auth-utils";
import { api as applicationApi } from "@/lib/server/router";

export function createApp() {
  const app = new Hono();

  app.use("*", prettyJSON());

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  app.get("/api/auth/anonymous", async (c) => {
    try {
      const context = toRequestContext(c.req.raw);
      context.ip =
        c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
        c.req.header("x-real-ip") ||
        context.ip;

      const rateLimit = await checkAnonymousTokenIssueRateLimit(context);
      if (!rateLimit.allowed) {
        const retryAfter = Math.max(
          0,
          Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        );

        c.header("Retry-After", retryAfter.toString());
        return c.json({ error: "Too many anonymous session requests" }, 429);
      }

      const accessToken = createAnonymousToken();
      const refreshToken = createAnonymousRefreshToken();
      const userId = `anon_${accessToken.id}`;

      await dynamodbService.saveAnonymousRefreshToken({
        userId,
        tokenId: refreshToken.tokenId,
        refreshTokenHash: refreshToken.hashedToken,
        expiresAt: new Date(refreshToken.expiresAt * 1000).toISOString(),
        ttl: refreshToken.expiresAt,
      });

      const secure = process.env.NODE_ENV === "production";

      setCookie(c, ANONYMOUS_ACCESS_COOKIE_NAME, accessToken.token, {
        httpOnly: true,
        secure,
        sameSite: "Lax",
        maxAge: ANONYMOUS_ACCESS_TOKEN_TTL,
        path: "/",
      });

      const refreshCookieValue = `${accessToken.id}.${refreshToken.tokenId}.${refreshToken.token}`;
      setCookie(c, ANONYMOUS_REFRESH_COOKIE_NAME, refreshCookieValue, {
        httpOnly: true,
        secure,
        sameSite: "Lax",
        maxAge: ANONYMOUS_REFRESH_TOKEN_TTL,
        path: "/",
      });

      return c.json({
        success: true,
        expiresIn: ANONYMOUS_ACCESS_TOKEN_TTL,
        refreshExpiresIn: ANONYMOUS_REFRESH_TOKEN_TTL,
      });
    } catch (error) {
      console.error("Failed to generate anonymous token:", error);
      return c.json({ error: "Failed to generate anonymous token" }, 500);
    }
  });

  app.post("/api/auth/anonymous/refresh", async (c) => {
    try {
      const context = toRequestContext(c.req.raw);
      context.ip =
        c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
        c.req.header("x-real-ip") ||
        context.ip;

      const rateLimit = await checkAnonymousTokenRefreshRateLimit(context);
      if (!rateLimit.allowed) {
        const retryAfter = Math.max(
          0,
          Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        );

        c.header("Retry-After", retryAfter.toString());
        return c.json({ error: "Too many refresh requests" }, 429);
      }

      const refreshCookieValue = context.cookies?.get(
        ANONYMOUS_REFRESH_COOKIE_NAME
      )?.value;
      const parsed = parseRefreshTokenCookie(refreshCookieValue);

      if (!parsed) {
        return c.json({ error: "Refresh token missing" }, 401);
      }

      const userId = `anon_${parsed.anonymousId}`;
      const existingRecord = await dynamodbService.getAnonymousRefreshToken(
        userId,
        parsed.tokenId
      );

      if (!existingRecord) {
        return c.json({ error: "Invalid refresh token" }, 401);
      }

      const now = Math.floor(Date.now() / 1000);
      const isExpired = existingRecord.ttl <= now;
      const isMatch = refreshTokenMatches(
        parsed.token,
        existingRecord.refreshTokenHash
      );

      if (!isMatch || isExpired) {
        await dynamodbService.deleteAnonymousRefreshToken(
          userId,
          parsed.tokenId
        );
        return c.json({ error: "Invalid refresh token" }, 401);
      }

      await dynamodbService.deleteAnonymousRefreshToken(userId, parsed.tokenId);

      const newRefreshToken = createAnonymousRefreshToken();
      await dynamodbService.saveAnonymousRefreshToken({
        userId,
        tokenId: newRefreshToken.tokenId,
        refreshTokenHash: newRefreshToken.hashedToken,
        expiresAt: new Date(newRefreshToken.expiresAt * 1000).toISOString(),
        ttl: newRefreshToken.expiresAt,
      });

      const newAccessToken = createAnonymousToken(parsed.anonymousId);

      setCookie(c, ANONYMOUS_ACCESS_COOKIE_NAME, newAccessToken.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: ANONYMOUS_ACCESS_TOKEN_TTL,
        path: "/",
      });

      const refreshCookie = `${parsed.anonymousId}.${newRefreshToken.tokenId}.${newRefreshToken.token}`;
      setCookie(c, ANONYMOUS_REFRESH_COOKIE_NAME, refreshCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: ANONYMOUS_REFRESH_TOKEN_TTL,
        path: "/",
      });

      return c.json({
        success: true,
        expiresIn: ANONYMOUS_ACCESS_TOKEN_TTL,
        refreshExpiresIn: ANONYMOUS_REFRESH_TOKEN_TTL,
      });
    } catch (error) {
      console.error("Failed to refresh anonymous token:", error);
      return c.json({ error: "Failed to refresh anonymous token" }, 500);
    }
  });

  app.post("/api/auth/signout", (c) => {
    const secure = process.env.NODE_ENV === "production";
    const cookiesToClear = [
      // Auth.js v5 cookie names
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "authjs.csrf-token",
      "authjs.callback-url",
      // Legacy NextAuth.js cookie names kept for compatibility
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "next-auth.callback-url",
    ];

    for (const name of cookiesToClear) {
      setCookie(c, name, "", {
        httpOnly: true,
        secure: name.startsWith("__Secure-") ? true : secure,
        sameSite: "Lax",
        maxAge: 0,
        expires: new Date(0),
        path: "/",
      });
    }

    return c.json({ success: true });
  });

  app.use("/api/auth/*", async (c, next) => {
    const pathname = new URL(c.req.url).pathname;
    if (
      pathname === "/api/auth/anonymous" ||
      pathname.startsWith("/api/auth/anonymous/")
    ) {
      return next();
    }
    if (pathname === "/api/auth/signout" && c.req.method === "POST") {
      return next();
    }
    if (pathname === "/api/auth/migrate") {
      return next();
    }

    const url = new URL(c.req.url);
    console.log("[auth]", c.req.method, url.pathname + url.search);
    const response = await handleAuthRequest(c.req.raw);
    return response;
  });

  app.route("/api", applicationApi);

  app.all("*", (c) =>
    c.text(
      "Jobseek Hono server placeholder. Wire TanStack Router output and remaining APIs in the next migration steps.",
      200
    )
  );

  return app;
}
