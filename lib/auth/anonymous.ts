import { NextRequest } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * JWT secret for anonymous IDs (should be in env in production)
 */
const ANONYMOUS_JWT_SECRET = process.env.ANONYMOUS_JWT_SECRET!;

/**
 * Salt for making anonymous IDs unguessable
 */
const ANONYMOUS_SALT = process.env.ANONYMOUS_SALT!;

/**
 * Creates a JWT token containing anonymous user fingerprint
 */
export function createAnonymousToken(request: NextRequest): string {
  // Simplified fingerprint - just user agent for stability
  const userAgent = request.headers.get("user-agent") || "";

  // Create a salted hash for unguessable but deterministic ID
  const id = crypto
    .createHash("sha256")
    .update(userAgent + ANONYMOUS_SALT)
    .digest("hex")
    .substring(0, 32);

  // Create JWT token
  const token = jwt.sign(
    {
      id,
      userAgent, // Store just user agent for validation
      iat: Math.floor(Date.now() / 1000),
    },
    ANONYMOUS_JWT_SECRET,
    {
      expiresIn: "7d", // Token valid for 7 days
      algorithm: "HS256",
    }
  );

  return token;
}

/**
 * Verifies and decodes an anonymous JWT token
 */
export function verifyAnonymousToken(
  token: string
): { id: string; userAgent: string } | null {
  try {
    const decoded = jwt.verify(token, ANONYMOUS_JWT_SECRET) as any;
    return {
      id: decoded.id,
      userAgent: decoded.userAgent || decoded.fingerprint?.userAgent || "", // Support old tokens
    };
  } catch (error) {
    return null;
  }
}

/**
 * Validates that the request matches the token's user agent
 */
export function validateTokenFingerprint(
  token: string,
  request: NextRequest,
  strict: boolean = false
): boolean {
  const decoded = verifyAnonymousToken(token);
  if (!decoded) return false;

  const currentUserAgent = request.headers.get("user-agent") || "";

  // Simple validation - just check user agent matches
  return decoded.userAgent === currentUserAgent;
}
