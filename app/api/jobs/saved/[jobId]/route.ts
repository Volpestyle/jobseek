import { NextResponse } from "next/server";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { withAuth } from "@/lib/auth/api-wrappers";

export const GET = withAuth<{ jobId: string }>(
  async (request, { params }, { user }) => {
    try {
      const job = await dynamodbService.getSavedJob(user.id, params.jobId);

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json({ job });
    } catch (error) {
      console.error("Failed to get saved job:", error);
      return NextResponse.json(
        { error: "Failed to get saved job" },
        { status: 500 }
      );
    }
  }
);

export const PUT = withAuth<{ jobId: string }>(
  async (request, { params }, { user }) => {
    try {
      const body = await request.json();
      const { tags, notes, status } = body;

      const existingJob = await dynamodbService.getSavedJob(
        user.id,
        params.jobId
      );

      if (!existingJob) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const updatedJob = await dynamodbService.updateSavedJob({
        ...existingJob,
        tags: tags !== undefined ? tags : existingJob.tags,
        notes: notes !== undefined ? notes : existingJob.notes,
        status: status !== undefined ? status : existingJob.status,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ job: updatedJob });
    } catch (error) {
      console.error("Failed to update saved job:", error);
      return NextResponse.json(
        { error: "Failed to update saved job" },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAuth<{ jobId: string }>(
  async (request, { params }, { user }) => {
    try {
      await dynamodbService.deleteSavedJob(user.id, params.jobId);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Failed to delete saved job:", error);
      return NextResponse.json(
        { error: "Failed to delete saved job" },
        { status: 500 }
      );
    }
  }
);
