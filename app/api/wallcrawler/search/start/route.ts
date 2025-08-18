import { NextResponse } from "next/server";
import { withAuthOrAnonToken } from "@/lib/auth/api-wrappers";
import { wallcrawlerService } from "@/lib/wallcrawler.server";
import { checkSearchRateLimit } from "@/lib/auth/rate-limiter";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const POST = withAuthOrAnonToken(async (request, context, { user }) => {
  try {
    const body = await request.json();
    const { keywords, location, boards, saveSearch, searchName } = body;

    if (!keywords || !boards || boards.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: keywords and boards are required" },
        { status: 400 }
      );
    }

    // * Check rate limit for all users (authenticated and anonymous)
    // const rateLimit = await checkSearchRateLimit(request)
    // if (!rateLimit.allowed) {
    //   return NextResponse.json(
    //     {
    //       error: "Rate limit exceeded",
    //       retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    //     },
    //     {
    //       status: 429,
    //       headers: {
    //         'X-RateLimit-Limit': rateLimit.limit.toString(),
    //         'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    //         'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
    //       }
    //     }
    //   )
    // }

    // Build user metadata for session tracking
    const userMetadata: Record<string, unknown> = {
      keywords,
      location: location || "",
      jobBoard: boards[0],
      createdAt: new Date().toISOString(),
      userId: user.userId,
      isAnonymous: user.isAnonymous,
    };

    if (user.isAuthenticated) {
      userMetadata.userEmail = user.email;

      // Save the search if requested
      if (saveSearch && searchName) {
        await dynamodbService.saveSearch({
          userId: user.userId,
          searchId: `search_${Date.now()}`,
          name: searchName,
          keywords,
          location,
          jobBoards: boards,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        });
      }
    } else {
      // Anonymous users cannot save searches
      if (saveSearch) {
        return NextResponse.json(
          {
            error:
              "Anonymous users cannot save searches. Please sign in to save searches.",
          },
          { status: 403 }
        );
      }
    }

    // Run the job search on the first board with Stagehand
    const result = await wallcrawlerService.runJobSearch({
      keywords,
      location: location || "",
      jobBoard: boards[0], // Use the first board for now
      userMetadata,
    });

    // Return session details and initial results
    return NextResponse.json({
      sessionId: result.sessionId,
      debugUrl: result.debugUrl,
      jobs: result.jobs,
      message: `Found ${result.jobs.length} jobs on ${boards[0]}`,
    });
  } catch (error) {
    console.error("Failed to start job search:", error);
    return NextResponse.json(
      { error: "Failed to start job search" },
      { status: 500 }
    );
  }
});
