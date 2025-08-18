import { NextRequest, NextResponse } from "next/server";
import { createAnonymousToken } from "@/lib/auth/anonymous";

/**
 * GET /api/auth/anonymous
 * Generates a JWT token for anonymous users
 */
export async function GET(request: NextRequest) {
  try {
    const token = createAnonymousToken(request);
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    const response = NextResponse.json({
      success: true,
      expiresIn,
    });

    // Set httpOnly cookie for maximum security
    response.cookies.set("anonymous-token", token, {
      httpOnly: true, // Prevents JS access (XSS protection)
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      maxAge: expiresIn, // 7 days
      path: "/", // Available site-wide
    });

    return response;
  } catch (error) {
    console.error("Failed to generate anonymous token:", error);
    return NextResponse.json(
      { error: "Failed to generate anonymous token" },
      { status: 500 }
    );
  }
}
