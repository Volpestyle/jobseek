import { NextRequest, NextResponse } from "next/server";
import { createWallcrawlerClient } from "@/lib/wallcrawler-client";
import { withAuthOrAnonToken } from "@/lib/auth/api-wrappers";

export const GET = withAuthOrAnonToken(async (request, context, { user }) => {
  try {
    // Initialize Wallcrawler SDK
    const wallcrawler = createWallcrawlerClient();

    // Build query as JSON object for user metadata filtering
    const query = JSON.stringify({ userId: user.userId });

    // List sessions filtered by user metadata
    let response;
    try {
      response = await wallcrawler.sessions.list({
        q: query,
        status: "RUNNING", // Only get active sessions
      });
      console.log("Successfully listed sessions:", response);
    } catch (error: any) {
      console.error("Failed to list sessions:", {
        status: error.status,
        message: error.message,
        error: error.error,
        headers: error.headers,
      });
      throw error;
    }

    // The SDK returns SessionListResponse which is Array<Session>
    const sessions = response || [];

    // Format sessions for frontend
    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      region: session.region,
      keywords: session.userMetadata?.keywords || "",
      location: session.userMetadata?.location || "",
      jobBoard: session.userMetadata?.jobBoard || "",
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
});
