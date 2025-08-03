import { NextRequest } from "next/server"
import crypto from "crypto"
import jwt from "jsonwebtoken"

/**
 * JWT secret for anonymous IDs (should be in env in production)
 */
const ANONYMOUS_JWT_SECRET = process.env.ANONYMOUS_JWT_SECRET || 'jobseek-anonymous-jwt-secret-2024';

/**
 * Creates a JWT token containing anonymous user fingerprint
 */
export function createAnonymousToken(request: NextRequest): string {
  const fingerprint = {
    userAgent: request.headers.get('user-agent') || '',
    acceptLanguage: request.headers.get('accept-language') || '',
    acceptEncoding: request.headers.get('accept-encoding') || '',
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
  };

  // Create a hash of the fingerprint for the ID
  const id = crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprint))
    .digest('hex')
    .substring(0, 32);

  // Create JWT token
  const token = jwt.sign(
    {
      id,
      fingerprint,
      iat: Math.floor(Date.now() / 1000),
    },
    ANONYMOUS_JWT_SECRET,
    {
      expiresIn: '7d', // Token valid for 7 days
      algorithm: 'HS256',
    }
  );

  return token;
}

/**
 * Verifies and decodes an anonymous JWT token
 */
export function verifyAnonymousToken(token: string): { id: string; fingerprint: any } | null {
  try {
    const decoded = jwt.verify(token, ANONYMOUS_JWT_SECRET) as any;
    return {
      id: decoded.id,
      fingerprint: decoded.fingerprint,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Validates that the request matches the token fingerprint (with some flexibility)
 */
export function validateTokenFingerprint(
  token: string,
  request: NextRequest,
  strict: boolean = false
): boolean {
  const decoded = verifyAnonymousToken(token);
  if (!decoded) return false;

  const currentFingerprint = {
    userAgent: request.headers.get('user-agent') || '',
    acceptLanguage: request.headers.get('accept-language') || '',
    acceptEncoding: request.headers.get('accept-encoding') || '',
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
  };

  if (strict) {
    // Strict mode: all fields must match
    return (
      decoded.fingerprint.userAgent === currentFingerprint.userAgent &&
      decoded.fingerprint.acceptLanguage === currentFingerprint.acceptLanguage &&
      decoded.fingerprint.acceptEncoding === currentFingerprint.acceptEncoding &&
      decoded.fingerprint.ip === currentFingerprint.ip
    );
  } else {
    // Relaxed mode: just check user agent (allows for IP changes, etc.)
    return decoded.fingerprint.userAgent === currentFingerprint.userAgent;
  }
}