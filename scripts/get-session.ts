import { getSessionFromRequest } from "@/lib/auth/auth.server";

export async function getSessionFromHeader(cookieHeader?: string) {
  const baseUrl = resolveBaseUrl();
  const req = new Request(`${baseUrl}/api/auth/session`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  return getSessionFromRequest(req);
}

function resolveBaseUrl() {
  const allowList = process.env.AUTH_REDIRECT_ALLOWLIST?.split(",");
  const firstAllowed = allowList?.find((value) => value.trim().length > 0);
  const candidates = [process.env.APP_ORIGIN, firstAllowed];

  for (const candidate of candidates) {
    const origin = safeOrigin(candidate);
    if (origin) {
      return origin;
    }
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

function safeOrigin(value?: string | null) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
