import {
  ANONYMOUS_ACCESS_TOKEN_TTL,
  ANONYMOUS_REFRESH_TOKEN_TTL,
} from "./anonymous.constants";

export const ANONYMOUS_SESSION_FLAG_KEY = "jobseek_has_anon_session";
interface AnonymousFetchOptions {
  skipRefresh?: boolean;
}

async function refreshAnonymousSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/anonymous/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return false;
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ANONYMOUS_SESSION_FLAG_KEY, "true");
      } catch {
        // Ignore storage errors in non-browser contexts
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to refresh anonymous session:", error);
    return false;
  }
}

/**
 * Ensures an anonymous access session exists by attempting a refresh first,
 * then falling back to minting a brand new token pair.
 */
export async function ensureAnonymousSession(): Promise<boolean> {
  // Try to refresh existing session first to preserve anonymous ID
  if (await refreshAnonymousSession()) {
    return true;
  }

  try {
    const response = await fetch("/api/auth/anonymous", {
      credentials: "include",
    });

    if (!response.ok) {
      // Surface 429 retry delay through console for debugging purposes
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter) {
          console.warn(
            `Anonymous token issuance rate limited. Retry after ${retryAfter} seconds.`
          );
        }
      }
      return false;
    }

    const data = await response.json().catch(() => null);
    const success = Boolean(data?.success);

    if (success && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ANONYMOUS_SESSION_FLAG_KEY, "true");
      } catch {
        // Ignore storage errors in non-browser contexts
      }
    }

    return success;
  } catch (error) {
    console.error("Error ensuring anonymous session:", error);
    return false;
  }
}

/**
 * Wrapper around fetch that automatically attempts to refresh anonymous
 * credentials once when a 401 response is encountered. The caller is
 * responsible for inspecting the returned response.
 */
export async function fetchWithAnonymousRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: AnonymousFetchOptions
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status !== 401 || options?.skipRefresh) {
    return response;
  }

  // Attempt to refresh session and retry request once
  const refreshed = await refreshAnonymousSession();
  if (!refreshed) {
    return response;
  }

  const retryInit = init ? { ...init } : undefined;
  return fetch(input, retryInit);
}

export function getAnonymousSessionDurations() {
  return {
    accessTokenTtlSeconds: ANONYMOUS_ACCESS_TOKEN_TTL,
    refreshTokenTtlSeconds: ANONYMOUS_REFRESH_TOKEN_TTL,
  };
}

export { refreshAnonymousSession };
