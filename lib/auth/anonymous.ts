import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * JWT secret for anonymous IDs (should be in env in production)
 */
const ANONYMOUS_JWT_SECRET = process.env.ANONYMOUS_JWT_SECRET!;

/**
 * Creates a JWT token with a random anonymous ID
 * @param existingId Optional existing ID to reuse (for token refresh)
 */
export function createAnonymousToken(existingId?: string): string {
  // Always use random ID, or reuse existing one if provided
  const id = existingId || crypto.randomBytes(16).toString("hex");

  // Create JWT token
  const token = jwt.sign(
    {
      id,
      iat: Math.floor(Date.now() / 1000),
    },
    ANONYMOUS_JWT_SECRET,
    {
      expiresIn: 86400, // Token valid for 1 day (86400 seconds)
      algorithm: "HS256",
    }
  );

  return token;
}

/**
 * Re-issues an anonymous token with the same ID but fresh expiration
 */
export function reissueAnonymousToken(existingToken: string): string | null {
  const decoded = verifyAnonymousToken(existingToken);
  if (!decoded) return null;
  
  return createAnonymousToken(decoded.id);
}

/**
 * Verifies and decodes an anonymous JWT token
 */
export function verifyAnonymousToken(token: string): {
  id: string;
} | null {
  try {
    const decoded = jwt.verify(token, ANONYMOUS_JWT_SECRET) as any;
    return {
      id: decoded.id,
    };
  } catch (error) {
    return null;
  }
}

