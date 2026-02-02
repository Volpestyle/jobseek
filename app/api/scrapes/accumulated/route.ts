import { NextRequest, NextResponse } from "next/server";
import { getAccumulatedJobs } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countParam = searchParams.get("count");

  let count: number | "all" = 5; // default

  if (countParam === "all") {
    count = "all";
  } else if (countParam) {
    const parsed = parseInt(countParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      count = parsed;
    }
  }

  const result = getAccumulatedJobs(count);
  return NextResponse.json(result);
}
