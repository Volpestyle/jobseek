import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth/auth-utils";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { actionLogEmitter } from "@/lib/events/action-logs";

export async function GET(
  request: NextRequest,
  { params }: { params: { searchId: string } }
) {
  const { searchId } = params;
  const encoder = new TextEncoder();

  // Get user from request (handles both authenticated and anonymous users)
  const userInfo = await getUserFromRequest(request);

  if (!userInfo) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = userInfo.userId;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        const message = JSON.stringify({ type, data });
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      };

      try {
        // 1. Send master search info
        const masterSearch = await dynamodbService.getMasterSearch(
          userId,
          searchId
        );
        
        if (!masterSearch) {
          send("error", { message: "Search not found" });
          controller.close();
          return;
        }

        // Verify ownership
        if (masterSearch.userId !== userId) {
          send("error", { message: "Unauthorized" });
          controller.close();
          return;
        }

        send("search", {
          searchId: masterSearch.searchId,
          searchParams: masterSearch.searchParams,
          boardSessions: masterSearch.boardSessions,
          totalJobsFound: masterSearch.totalJobsFound,
          status: masterSearch.status,
          createdAt: masterSearch.createdAt,
          updatedAt: masterSearch.updatedAt
        });

        // 2. Send all existing results from all boards
        const allResults = await dynamodbService.getSearchResults(searchId);
        for (const boardResult of allResults) {
          send("board-jobs", {
            board: boardResult.boardName,
            jobs: boardResult.jobs,
            status: boardResult.status,
            totalJobsFound: boardResult.totalJobsFound
          });
        }

        // 3. Subscribe to updates from all board sessions
        const unsubscribes: (() => void)[] = [];
        
        Object.entries(masterSearch.boardSessions).forEach(
          ([boardName, session]) => {
            if (session.sessionId) {
              // Subscribe to job updates for this board
              const unsubJobs = actionLogEmitter.subscribeToSession(
                session.sessionId,
                {
                  onJobs: (jobs) => {
                    send("board-jobs-update", { 
                      board: boardName, 
                      jobs,
                      sessionId: session.sessionId
                    });
                  },
                  onLog: (log) => {
                    send("board-log", { 
                      board: boardName, 
                      log,
                      sessionId: session.sessionId
                    });
                  },
                  onTotalJobs: (totalJobs) => {
                    send("board-total-update", {
                      board: boardName,
                      totalJobs,
                      sessionId: session.sessionId
                    });
                  }
                }
              );
              unsubscribes.push(unsubJobs);
            }
          }
        );

        // 4. Subscribe to master search updates
        // Note: We need to add this functionality to actionLogEmitter
        const masterUnsub = () => {
          // Placeholder for master search subscription
          // This would listen for overall search status updates
        };
        unsubscribes.push(masterUnsub);

        // 5. Heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(":heartbeat\n\n"));
          } catch (error) {
            // Connection closed, cleanup
            clearInterval(heartbeat);
            unsubscribes.forEach(unsub => unsub());
          }
        }, 30000); // Send heartbeat every 30 seconds

        // Clean up on disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          unsubscribes.forEach(unsub => unsub());
          controller.close();
        });

      } catch (error) {
        console.error("Stream error:", error);
        send("error", { 
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error"
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}