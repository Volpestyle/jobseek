import { NextRequest, NextResponse } from "next/server";
import { getScrape } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id parameter" }, { status: 400 });
  }

  const scrape = getScrape(id);
  if (!scrape) {
    return NextResponse.json({ error: "Scrape not found" }, { status: 404 });
  }

  return NextResponse.json(scrape);
}
