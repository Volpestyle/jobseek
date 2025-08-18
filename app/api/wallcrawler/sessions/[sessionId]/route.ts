import { NextResponse } from "next/server";
import { withAuthOrAnonToken } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { createWallcrawlerClient } from "@/lib/wallcrawler-client";

/**
 * @deprecated This endpoint is deprecated. Use /api/wallcrawler/sessions/[sessionId]/stream instead
 * for real-time SSE streaming of session data.
 * This endpoint will be removed in a future version.
 */
export const GET = withAuthOrAnonToken<{ sessionId: string }>(
  async (request, { params }, { user }) => {
    try {
      const { sessionId } = params;

      // Initialize Wallcrawler SDK
      const wallcrawler = createWallcrawlerClient();

      // Get session details from Wallcrawler
      let wallcrawlerSession;
      try {
        wallcrawlerSession = await wallcrawler.sessions.retrieve(sessionId);

        // Verify session belongs to user
        const sessionUserId = wallcrawlerSession.userMetadata?.userId;
        if (sessionUserId !== user.userId) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      } catch (error) {
        console.error("Failed to retrieve Wallcrawler session:", error);
        // Session might not exist in Wallcrawler yet
      }

      // Get job search results from storage
      let jobSearchResults = null;
      if (user.isAuthenticated) {
        jobSearchResults = await dynamodbService.getJobSearchResults(
          user.userId,
          sessionId
        );
      }
      // For anonymous users, results would be fetched client-side from localStorage

      // Get real action logs from DynamoDB
      const actionLogs = await dynamodbService.getActionLogs(sessionId);

      return NextResponse.json({
        session: wallcrawlerSession
          ? {
              id: wallcrawlerSession.id,
              status: wallcrawlerSession.status,
              createdAt: wallcrawlerSession.createdAt,
              updatedAt: wallcrawlerSession.updatedAt,
              startedAt: wallcrawlerSession.startedAt,
              endedAt: wallcrawlerSession.endedAt,
              region: wallcrawlerSession.region,
              userMetadata: wallcrawlerSession.userMetadata,
              connectUrl: wallcrawlerSession.connectUrl,
            }
          : null,
        jobs: jobSearchResults?.jobs || [],
        totalJobs: jobSearchResults?.totalJobsFound || 0,
        actionLogs,
        searchParams:
          jobSearchResults?.searchParams || wallcrawlerSession?.userMetadata,
      });
    } catch (error) {
      console.error("Failed to get session details:", error);
      return NextResponse.json(
        { error: "Failed to get session details" },
        { status: 500 }
      );
    }
  }
);
