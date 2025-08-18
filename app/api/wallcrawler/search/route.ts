import { NextRequest, NextResponse } from "next/server";
import { createWallcrawlerClient } from "@/lib/wallcrawler-client";
import { withAuthOrAnonToken } from "@/lib/auth/api-wrappers";

export const GET = withAuthOrAnonToken(async (request, context, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required parameter: sessionId" },
        { status: 400 }
      );
    }

    // Initialize Wallcrawler SDK
    const wallcrawler = createWallcrawlerClient();

    // Retrieve session details
    const session = await wallcrawler.sessions.retrieve(sessionId);

    // Verify the session belongs to the current user
    const sessionUserId = session.userMetadata?.userId;
    if (sessionUserId !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get debug URLs for the session
    const debugInfo = await wallcrawler.sessions.debug(sessionId);

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      debugUrl: debugInfo.debuggerUrl,
      debuggerFullscreenUrl: debugInfo.debuggerFullscreenUrl,
      connectUrl: session.connectUrl,
      userMetadata: session.userMetadata,
      keywords: session.userMetadata?.keywords || "",
      location: session.userMetadata?.location || "",
      jobBoard: session.userMetadata?.jobBoard || "",
    });
  } catch (error) {
    console.error("Failed to retrieve session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
});
