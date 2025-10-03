import { Auth } from "@auth/core";
import type { AuthConfig, Session } from "@auth/core/types";
import Google from "@auth/core/providers/google";
import Twitter from "@auth/core/providers/twitter";
import Credentials from "@auth/core/providers/credentials";
import { dynamodbService, type UserProfile } from "@/lib/db/dynamodb.service";

const DEFAULT_BASE_PATH = "/api/auth";

function getBasePath(config: AuthConfig) {
  return config.basePath ?? DEFAULT_BASE_PATH;
}

const providers: AuthConfig["providers"] = [];

const CLIENT_APP_ORIGIN = resolveClientAppOrigin();
const REDIRECT_ALLOWLIST = resolveRedirectAllowlist();

function resolveClientAppOrigin(): string | null {
  const rawOrigin = process.env.APP_ORIGIN;
  if (!rawOrigin) {
    return null;
  }

  try {
    return new URL(rawOrigin).origin;
  } catch (error) {
    console.warn(
      "Invalid client app origin provided, expected absolute URL:",
      rawOrigin,
      error
    );
    return null;
  }
}

function resolveRedirectAllowlist(): string[] {
  const raw = process.env.AUTH_REDIRECT_ALLOWLIST;
  if (!raw && !CLIENT_APP_ORIGIN) {
    return [];
  }

  const origins = new Set<string>();

  if (CLIENT_APP_ORIGIN) {
    origins.add(CLIENT_APP_ORIGIN);
  }

  if (raw) {
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => {
        try {
          const url = new URL(value);
          origins.add(url.origin);
        } catch (error) {
          console.warn(
            "Ignoring invalid redirect allowlist entry. Expected absolute URL:",
            value,
            error
          );
        }
      });
  }

  return Array.from(origins);
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    })
  );
} else if (process.env.NODE_ENV !== "production") {
  console.warn(
    "Google auth provider not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it."
  );
}

if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
  providers.push(
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    })
  );
} else if (process.env.NODE_ENV !== "production") {
  console.warn(
    "Twitter auth provider not configured. Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET to enable it."
  );
}

if (providers.length === 0) {
  providers.push(
    Credentials({
      name: "Placeholder",
      credentials: {},
      authorize: async () => null,
    })
  );
}

export const authConfig: AuthConfig = {
  trustHost: true,
  basePath: DEFAULT_BASE_PATH,
  secret: process.env.AUTH_SECRET ?? "local-dev-secret",
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        const existingProfile = await dynamodbService.getUserProfile(user.id!);

        let providerData: Partial<UserProfile> = {};

        if (account?.provider === "google" && profile) {
          providerData = {
            firstName: profile.given_name || user.name?.split(" ")[0] || "",
            lastName:
              profile.family_name || user.name?.split(" ").slice(1).join(" ") || "",
            avatarUrl: profile.picture || user.image,
            location: profile.locale as string,
          };
        } else if (account?.provider === "twitter" && profile) {
          providerData = {
            firstName: user.name?.split(" ")[0] || "",
            lastName: user.name?.split(" ").slice(1).join(" ") || "",
            avatarUrl:
              (profile.profile_image_url_https as string) ||
              (user.image as string),
            bio: profile.description as string,
            location: profile.location as string,
            portfolioUrl: profile.url as string,
          };
        }

        const profileData: UserProfile = {
          userId: user.id!,
          email: user.email,
          provider: account?.provider,
          updatedAt: new Date().toISOString(),
          createdAt: existingProfile?.createdAt || new Date().toISOString(),
          ...existingProfile,
          ...providerData,
        };

        await dynamodbService.saveUserProfile(profileData);
        return true;
      } catch (error) {
        console.error("Failed to create/update user profile:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub ?? undefined;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        if (account) {
          (token as Record<string, unknown>).provider = account.provider;
        }
      }
      return token;
    },
    redirect({ url, baseUrl }) {
      const baseOrigin = normalizeOrigin(baseUrl);
      const allowedOrigins = new Set<string>([baseOrigin, ...REDIRECT_ALLOWLIST]);
      const primaryClientOrigin =
        REDIRECT_ALLOWLIST.find((origin) => origin !== baseOrigin) ??
        CLIENT_APP_ORIGIN ??
        baseOrigin;

      if (isRelative(url)) {
        return `${primaryClientOrigin}${ensureLeadingSlash(url)}`;
      }

      try {
        const target = new URL(url);

        if (allowedOrigins.has(target.origin)) {
          if (target.origin === baseOrigin && primaryClientOrigin !== baseOrigin) {
            return `${primaryClientOrigin}${target.pathname}${target.search}${target.hash}`;
          }

          return target.toString();
        }
      } catch (error) {
        console.warn("Invalid redirect URL requested:", url, error);
      }

      return primaryClientOrigin;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};

function isRelative(url: string): boolean {
  return url.startsWith("/") || url.startsWith(".") || url === "";
}

function ensureLeadingSlash(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function buildAuthUrl(path: string, baseUrl: string) {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function handleAuthRequest(request: Request) {
  return Auth(request, authConfig);
}

export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  const currentUrl = new URL(request.url);
  const origin = `${currentUrl.protocol}//${currentUrl.host}`;
  const sessionUrl = buildAuthUrl(`${getBasePath(authConfig)}/session`, origin);
  const headers = new Headers(request.headers);
  headers.set("host", new URL(sessionUrl).host);
  const sessionRequest = new Request(sessionUrl, {
    method: "GET",
    headers,
  });

  const response = await handleAuthRequest(sessionRequest);
  if (!response.ok) {
    return null;
  }

  try {
    const data = (await response.json()) as Session | null;
    return data ?? null;
  } catch (error) {
    console.error("Failed to parse session response:", error);
    return null;
  }
}
