import { NextRequest, NextResponse } from "next/server";
import {
  getPipelineEntries,
  addToPipeline,
  updatePipelineStage,
  updatePipelineNotes,
  removeFromPipeline,
  getAccumulatedJobs,
} from "@/lib/db";
import { PIPELINE_STAGES, type PipelineStage, type Job, type HydratedPipelineEntry } from "@/lib/pipeline-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = getPipelineEntries();
  const { jobs } = getAccumulatedJobs("all");

  const jobMap = new Map<string, Job>();
  for (const job of jobs) {
    jobMap.set(job.link, job);
  }

  const hydrated: HydratedPipelineEntry[] = entries.map((entry) => ({
    pipeline: entry,
    job: jobMap.get(entry.link) ?? null,
  }));

  return NextResponse.json({ entries: hydrated });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { link: string; stage?: PipelineStage };
  const { link, stage } = body;

  if (!link) {
    return NextResponse.json({ error: "link is required" }, { status: 400 });
  }

  const validStage = stage && PIPELINE_STAGES.includes(stage) ? stage : "interested";
  const entry = addToPipeline(link, validStage);

  return NextResponse.json({ entry });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json() as { link: string; stage?: PipelineStage; notes?: string };
  const { link, stage, notes } = body;

  if (!link) {
    return NextResponse.json({ error: "link is required" }, { status: 400 });
  }

  let updated = false;

  if (stage && PIPELINE_STAGES.includes(stage)) {
    updated = updatePipelineStage(link, stage) || updated;
  }

  if (notes !== undefined) {
    updated = updatePipelineNotes(link, notes) || updated;
  }

  if (!updated) {
    return NextResponse.json({ error: "Entry not found or no changes" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const link = searchParams.get("link");

  if (!link) {
    return NextResponse.json({ error: "link query param is required" }, { status: 400 });
  }

  const removed = removeFromPipeline(link);
  if (!removed) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
