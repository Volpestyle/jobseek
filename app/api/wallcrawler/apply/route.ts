import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamodbService } from "@/lib/db/dynamodb.service"
import { generateAnonymousId } from "@/lib/auth/anonymous"
import { checkAnonymousApplyRateLimit } from "@/lib/auth/rate-limiter"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { jobUrl, jobDetails, resumeS3Key, coverLetter, anonymousId } = body

    if (!jobUrl || !jobDetails) {
      return NextResponse.json(
        { error: "Missing required fields: jobUrl and jobDetails are required" },
        { status: 400 }
      )
    }

    if (session?.user) {
      // Authenticated user flow
      // For now, we'll just save the application to DynamoDB
      // In a real implementation, you would integrate with the job board's API
      // or use Stagehand to automate the application process
      
      const application = await dynamodbService.saveApplication({
        userId: session.user.id,
        applicationId: `app_${Date.now()}`,
        jobId: jobDetails.jobId || `job_${Date.now()}`,
        jobTitle: jobDetails.title,
        company: jobDetails.company,
        appliedAt: new Date().toISOString(),
        status: "applied",
        resumeUsed: resumeS3Key,
        coverLetter,
      })

      return NextResponse.json({ 
        success: true,
        applicationId: application.applicationId,
        message: "Application saved. Please apply directly on the job board." 
      })
    } else {
      // Anonymous user flow
      // Check rate limit
      const rateLimit = checkAnonymousApplyRateLimit(request)
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

      const generatedId = generateAnonymousId(request)
      
      // Validate anonymous ID matches
      if (anonymousId !== generatedId) {
        return NextResponse.json({ error: "Invalid anonymous ID" }, { status: 401 })
      }

      // For anonymous users, we don't save to DynamoDB and don't automate applications
      // Just return a message to apply directly
      return NextResponse.json({ 
        success: true,
        message: "Please apply directly on the job board. Sign in to track your applications."
      })
    }
  } catch (error) {
    console.error("Failed to apply to job:", error)
    return NextResponse.json(
      { error: "Failed to apply to job" },
      { status: 500 }
    )
  }
}