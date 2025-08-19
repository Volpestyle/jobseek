import { NextResponse } from "next/server";
import { withAuthOrAnonToken, setRefreshedTokenCookie } from "@/lib/auth/api-wrappers";
import { wallcrawlerService } from "@/lib/wallcrawler.server";

export const POST = withAuthOrAnonToken(async (request, context, { user, refreshedToken }) => {
  const encoder = new TextEncoder();

  try {
    if (!user.isAuthenticated) {
      const response = new NextResponse(
        encoder.encode(
          `data: ${JSON.stringify({ error: "Authentication required" })}\n\n`
        ),
        { status: 401 }
      );
      return setRefreshedTokenCookie(response, refreshedToken);
    }

    const body = await request.json();
    const { keywords, location, jobBoard } = body;

    if (!keywords || !location || !jobBoard) {
      const response = new NextResponse(
        encoder.encode(
          `data: ${JSON.stringify({ error: "Missing required fields" })}\n\n`
        ),
        { status: 400 }
      );
      return setRefreshedTokenCookie(response, refreshedToken);
    }

    // Create a TransformStream to handle the SSE
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the job search with streaming
    wallcrawlerService
      .runJobSearchWithStream(
        {
          keywords,
          location,
          jobBoard,
          userMetadata: {
            userId: user.userId,
            isAnonymous: user.isAnonymous,
          },
        },
        async (event) => {
          // Stream each event to the client
          const message = `data: ${JSON.stringify(event)}\n\n`;
          await writer.write(encoder.encode(message));

          // If it's the final event, close the stream
          if (event.type === "complete" || event.type === "error") {
            await writer.close();
          }
        }
      )
      .catch(async (error) => {
        // Send error and close stream
        const errorMessage = `data: ${JSON.stringify({
          type: "error",
          error: error.message || "Search failed",
        })}\n\n`;
        await writer.write(encoder.encode(errorMessage));
        await writer.close();
      });

    // Create NextResponse from the stream
    const response = new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
    return setRefreshedTokenCookie(response, refreshedToken);
  } catch (error) {
    console.error("Failed to start job search stream:", error);
    const response = new NextResponse(
      encoder.encode(
        `data: ${JSON.stringify({
          type: "error",
          error: "Failed to start search",
        })}\n\n`
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream",
        },
      }
    );
    return setRefreshedTokenCookie(response, refreshedToken);
  }
});
