import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { getUserFromRequest } from "@/lib/auth/auth-utils";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { createWallcrawlerClient } from "@/lib/wallcrawler-client";
import { actionLogEmitter } from "@/lib/events/action-logs";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  const encoder = new TextEncoder();

  // Get user from request (handles both authenticated and anonymous users)
  const userInfo = await getUserFromRequest(request);

  if (!userInfo) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = userInfo.userId;
  const isAuthenticated = userInfo.isAuthenticated;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        const message = JSON.stringify({ type, data });
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      };

      try {
        // 1. Send initial session data from Wallcrawler
        const wallcrawler = createWallcrawlerClient();

        let wallcrawlerSession;
        try {
          wallcrawlerSession = await wallcrawler.sessions.retrieve(sessionId);

          // Verify ownership
          const sessionUserId = wallcrawlerSession.userMetadata?.userId;
          if (sessionUserId && sessionUserId !== userId) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", data: { message: "Unauthorized" } })}\n\n`
              )
            );
            controller.close();
            return;
          }

          send("session", {
            id: wallcrawlerSession.id,
            status: wallcrawlerSession.status,
            createdAt: wallcrawlerSession.createdAt,
            updatedAt: wallcrawlerSession.updatedAt,
            startedAt: wallcrawlerSession.startedAt,
            endedAt: wallcrawlerSession.endedAt,
            region: wallcrawlerSession.region,
            userMetadata: wallcrawlerSession.userMetadata,
            connectUrl: wallcrawlerSession.connectUrl,
          });
        } catch (error) {
          console.error("Failed to retrieve Wallcrawler session:", error);
          send("session", null);
        }

        // 2. Send historical jobs from DynamoDB
        if (isAuthenticated) {
          const jobResults = await dynamodbService.getJobSearchResults(
            userId,
            sessionId
          );
          send("jobs", jobResults?.jobs || []);
          send("totalJobs", jobResults?.totalJobsFound || 0);
        } else {
          // For anonymous users, client will send stored jobs
          send("jobs", []);
          send("totalJobs", 0);
        }

        // 3. Send all historical action logs
        const historicalLogs = await dynamodbService.getActionLogs(sessionId);
        send("logs-history", historicalLogs);

        // 4. Subscribe to real-time updates
        const unsubscribe = actionLogEmitter.subscribeToSession(sessionId, {
          onLog: (log) => send("log", log),
          onJobs: (jobs) => send("jobs-update", jobs),
          onTotalJobs: (totalJobs) => send("totalJobs-update", totalJobs),
        });

        // 5. Heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(":heartbeat\n\n"));
          } catch (error) {
            // Connection closed, cleanup
            clearInterval(heartbeat);
            unsubscribe();
          }
        }, 30000);

        // 6. Cleanup on disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        });
      } catch (error) {
        console.error("SSE stream error:", error);
        send("error", {
          message: error instanceof Error ? error.message : "Stream failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
