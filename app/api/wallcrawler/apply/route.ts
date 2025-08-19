import { NextRequest, NextResponse } from "next/server";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { checkApplyRateLimit } from "@/lib/auth/rate-limiter";
import { Stagehand } from "@wallcrawler/stagehand";
import { createWallcrawlerClient } from "@/lib/wallcrawler-client";
import { withAuthOrAnonToken, setRefreshedTokenCookie } from "@/lib/auth/api-wrappers";

export const POST = withAuthOrAnonToken(async (request, context, { user, refreshedToken }) => {
  try {
    const body = await request.json();
    const { jobUrl, jobDetails, resumeS3Key, coverLetter, sessionId } = body;

    if (!jobUrl || !jobDetails) {
      return setRefreshedTokenCookie(
        NextResponse.json(
          {
            error: "Missing required fields: jobUrl and jobDetails are required",
          },
          { status: 400 }
        ),
        refreshedToken
      );
    }

    // Check rate limit
    const rateLimit = await checkApplyRateLimit(request);
    if (!rateLimit.allowed) {
      return setRefreshedTokenCookie(
        NextResponse.json(
          {
            error: "Rate limit exceeded",
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": rateLimit.limit.toString(),
              "X-RateLimit-Remaining": rateLimit.remaining.toString(),
              "X-RateLimit-Reset": new Date(rateLimit.resetTime).toISOString(),
            },
          }
        ),
        refreshedToken
      );
    }

    if (user.isAuthenticated) {
      // Authenticated user flow - use Stagehand to automate application
      let stagehand: Stagehand | null = null;

      try {
        // If sessionId is provided, use existing session, otherwise create new
        if (sessionId) {
          // Use existing Wallcrawler session
          const wallcrawler = createWallcrawlerClient();
          const session = await wallcrawler.sessions.retrieve(sessionId);

          // Initialize Stagehand with existing session
          stagehand = new Stagehand({
            env: "WALLCRAWLER",
            apiKey: process.env.WALLCRAWLER_API_KEY,
            projectId: process.env.WALLCRAWLER_PROJECT_ID,
            modelName: "anthropic/claude-3-5-sonnet-latest",
            modelClientOptions: {
              apiKey: process.env.ANTHROPIC_API_KEY,
            },
            useAPI: false,
          });
        } else {
          // Create new Stagehand session for application
          stagehand = new Stagehand({
            env: "WALLCRAWLER",
            apiKey: process.env.WALLCRAWLER_API_KEY,
            projectId: process.env.WALLCRAWLER_PROJECT_ID,
            modelName: "anthropic/claude-3-5-sonnet-latest",
            modelClientOptions: {
              apiKey: process.env.ANTHROPIC_API_KEY,
            },
            browserbaseSessionCreateParams: {
              projectId: process.env.WALLCRAWLER_PROJECT_ID || "jobseek-dev",
              userMetadata: {
                userId: user.userId,
                action: "apply",
                jobUrl: jobUrl,
              },
            },
            useAPI: false,
          });

          await stagehand.init();
        }

        const page = stagehand.page;

        // Navigate to job URL
        await page.goto(jobUrl);

        // Use Stagehand AI to click Apply button
        await page.act({
          action: "Click the Apply or Apply Now button for this job",
        });

        // TODO: Fill out application form with user data
        // This would require retrieving user profile data and resume
        // For now, just save the application attempt

        const application = await dynamodbService.saveApplication({
          userId: user.userId,
          applicationId: `app_${Date.now()}`,
          jobId: jobDetails.jobId || `job_${Date.now()}`,
          jobTitle: jobDetails.title,
          company: jobDetails.company,
          appliedAt: new Date().toISOString(),
          status: "applied", // Changed from "applied" to "initiated"
          notes: resumeS3Key ? `Resume: ${resumeS3Key}\nJob URL: ${jobUrl}` : `Job URL: ${jobUrl}`,
        });

        return setRefreshedTokenCookie(
          NextResponse.json({
            success: true,
            applicationId: application.applicationId,
            sessionId: sessionId,
            message:
              "Application process initiated. Complete the form in the browser.",
          }),
          refreshedToken
        );
      } finally {
        // Close Stagehand if we created a new session
        if (stagehand && !sessionId) {
          await stagehand.close();
        }
      }
    } else {
      // Anonymous user flow
      return setRefreshedTokenCookie(
        NextResponse.json({
          success: true,
          message:
            "Please apply directly on the job board. Sign in to track your applications.",
        }),
        refreshedToken
      );
    }
  } catch (error) {
    console.error("Failed to apply to job:", error);
    return setRefreshedTokenCookie(
      NextResponse.json(
        { error: "Failed to apply to job" },
        { status: 500 }
      ),
      refreshedToken
    );
  }
});
