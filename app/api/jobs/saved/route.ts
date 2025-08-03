import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const savedJobs = await dynamoDBService.getSavedJobs(session.user.id)

    return NextResponse.json({ jobs: savedJobs })
  } catch (error) {
    console.error("Failed to get saved jobs:", error)
    return NextResponse.json(
      { error: "Failed to get saved jobs" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, title, company, location, salary, url, description, source, tags, notes } = body

    if (!jobId || !title || !company || !location || !url || !description || !source) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const savedJob = await dynamoDBService.saveJob({
      userId: session.user.id,
      jobId,
      title,
      company,
      location,
      salary,
      url,
      description,
      source,
      savedAt: new Date().toISOString(),
      tags,
      notes,
    })

    return NextResponse.json({ job: savedJob })
  } catch (error) {
    console.error("Failed to save job:", error)
    return NextResponse.json(
      { error: "Failed to save job" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID required" },
        { status: 400 }
      )
    }

    await dynamoDBService.deleteSavedJob(session.user.id, jobId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete saved job:", error)
    return NextResponse.json(
      { error: "Failed to delete saved job" },
      { status: 500 }
    )
  }
}