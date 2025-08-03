import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { wallcrawlerService } from "@/lib/wallcrawler.server"
import { verifyAnonymousToken, validateTokenFingerprint } from "@/lib/auth/anonymous"
import { checkSearchRateLimit } from "@/lib/auth/rate-limiter"
import { dynamodbService } from "@/lib/db/dynamodb.service"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const {
      keywords,
      location,
      boards,
      anonymousId: bodyAnonymousId,
      saveSearch,
      searchName
    } = body

    // Try to get anonymous ID from cookie first, fallback to body
    const anonymousId = request.cookies.get('anonymous-token')?.value || bodyAnonymousId

    if (!keywords || !boards || boards.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: keywords and boards are required" },
        { status: 400 }
      )
    }

    // Check rate limit for all users (authenticated and anonymous)
    const rateLimit = await checkSearchRateLimit(request)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          }
        }
      )
    }

    // For anonymous users, validate JWT token
    if (!session?.user) {
      if (!anonymousId) {
        return NextResponse.json({ error: "Anonymous token required" }, { status: 400 })
      }

      // Verify the JWT token
      const tokenData = verifyAnonymousToken(anonymousId);
      if (!tokenData) {
        return NextResponse.json({ error: "Invalid or expired anonymous token" }, { status: 401 })
      }

      // Validate that the request fingerprint matches (relaxed mode)
      if (!validateTokenFingerprint(anonymousId, request, false)) {
        return NextResponse.json({ error: "Token fingerprint mismatch" }, { status: 401 })
      }
    }

    // Build user metadata for session tracking
    const userMetadata: Record<string, unknown> = {
      keywords,
      location: location || '',
      jobBoard: boards[0],
      createdAt: new Date().toISOString(),
    };

    let userId: string;
    if (session?.user) {
      // Authenticated user
      userId = session.user.id;
      userMetadata.userId = userId;
      userMetadata.userEmail = session.user.email;
      userMetadata.isAnonymous = false;

      // Save the search if requested
      if (saveSearch && searchName) {
        await dynamodbService.saveSearch({
          userId: userId,
          searchId: `search_${Date.now()}`,
          name: searchName,
          keywords,
          location,
          jobBoards: boards,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        })
      }
    } else {
      // Anonymous user - use the ID from the verified token
      const tokenData = verifyAnonymousToken(anonymousId!);
      userId = tokenData?.id || anonymousId;
      userMetadata.userId = userId;
      userMetadata.anonymousId = userId;
      userMetadata.isAnonymous = true;

      // Anonymous users cannot save searches
      if (saveSearch) {
        return NextResponse.json({
          error: "Anonymous users cannot save searches. Please sign in to save searches."
        }, { status: 403 })
      }
    }

    // Run the job search on the first board with Stagehand
    const result = await wallcrawlerService.runJobSearch({
      keywords,
      location: location || '',
      jobBoard: boards[0], // Use the first board for now
      userMetadata,
    });

    // Return session details and initial results
    return NextResponse.json({
      sessionId: result.sessionId,
      debugUrl: result.debugUrl,
      jobs: result.jobs,
      message: `Found ${result.jobs.length} jobs on ${boards[0]}`
    })
  } catch (error) {
    console.error("Failed to start job search:", error)
    return NextResponse.json(
      { error: "Failed to start job search" },
      { status: 500 }
    )
  }
}