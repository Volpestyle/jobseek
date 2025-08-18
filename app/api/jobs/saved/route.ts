import { NextRequest, NextResponse } from "next/server";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { withAuth } from "@/lib/auth/api-wrappers";

export const GET = withAuth(async (request, context, { user }) => {
  try {
    const savedJobs = await dynamodbService.getSavedJobs(user.id);

    return NextResponse.json({ jobs: savedJobs });
  } catch (error) {
    console.error("Failed to get saved jobs:", error);
    return NextResponse.json(
      { error: "Failed to get saved jobs" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, context, { user }) => {
  try {
    const body = await request.json();
    const {
      jobId,
      title,
      company,
      location,
      salary,
      url,
      description,
      source,
      tags,
      notes,
    } = body;

    if (
      !jobId ||
      !title ||
      !company ||
      !location ||
      !url ||
      !description ||
      !source
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const savedJob = await dynamodbService.saveJob({
      userId: user.id,
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
    });

    return NextResponse.json({ job: savedJob });
  } catch (error) {
    console.error("Failed to save job:", error);
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 });
  }
});
