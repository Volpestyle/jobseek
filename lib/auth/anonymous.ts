import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  ANONYMOUS_ACCESS_TOKEN_TTL,
  ANONYMOUS_REFRESH_TOKEN_TTL,
} from "./anonymous.constants";

/**
 * JWT secret for anonymous IDs (should be in env in production)
 */
const ANONYMOUS_JWT_SECRET = process.env.ANONYMOUS_JWT_SECRET!;

export interface AnonymousAccessToken {
  token: string;
  id: string;
  expiresAt: number; // Unix timestamp (seconds)
}

export interface AnonymousRefreshTokenPayload {
  tokenId: string;
  token: string;
  hashedToken: string;
  expiresAt: number; // Unix timestamp (seconds)
}

/**
 * Creates a signed access token for an anonymous user.
 */
export function createAnonymousToken(existingId?: string): AnonymousAccessToken {
  const id = existingId || crypto.randomBytes(16).toString("hex");
  const issuedAt = Math.floor(Date.now() / 1000);

  const token = jwt.sign(
    {
      id,
      iat: issuedAt,
    },
    ANONYMOUS_JWT_SECRET,
    {
      expiresIn: ANONYMOUS_ACCESS_TOKEN_TTL,
      algorithm: "HS256",
    }
  );

  return {
    token,
    id,
    expiresAt: issuedAt + ANONYMOUS_ACCESS_TOKEN_TTL,
  };
}

/**
 * Re-issues an anonymous token with the same ID but fresh expiration.
 */
export function reissueAnonymousToken(
  existingToken: string
): AnonymousAccessToken | null {
  const decoded = verifyAnonymousToken(existingToken);
  if (!decoded) return null;

  return createAnonymousToken(decoded.id);
}

/**
 * Verifies and decodes an anonymous JWT token.
 */
export function verifyAnonymousToken(token: string): {
  id: string;
  exp: number;
} | null {
  try {
    const decoded = jwt.verify(token, ANONYMOUS_JWT_SECRET) as jwt.JwtPayload;
    if (!decoded?.id || typeof decoded.id !== "string") {
      return null;
    }

    return {
      id: decoded.id,
      exp: typeof decoded.exp === "number" ? decoded.exp : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Generates a secure refresh token payload (token + hash + metadata).
 */
export function createAnonymousRefreshToken(): AnonymousRefreshTokenPayload {
  const tokenId = crypto.randomBytes(8).toString("hex");
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashRefreshToken(token);
  const expiresAt = Math.floor(Date.now() / 1000) + ANONYMOUS_REFRESH_TOKEN_TTL;

  return {
    tokenId,
    token,
    hashedToken,
    expiresAt,
  };
}

/**
 * Hashes a refresh token using SHA-256.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Timing-safe comparison between a token and its stored hash.
 */
export function refreshTokenMatches(
  token: string,
  expectedHash: string
): boolean {
  const tokenHash = hashRefreshToken(token);
  const tokenBuffer = Buffer.from(tokenHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}

/**
 * Parses the refresh token cookie value into tokenId and token parts.
 */
export function parseRefreshTokenCookie(
  value?: string | null
): { anonymousId: string; tokenId: string; token: string } | null {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [anonymousId, tokenId, token] = parts;
  if (!anonymousId || !tokenId || !token) {
    return null;
  }

  return { anonymousId, tokenId, token };
}
