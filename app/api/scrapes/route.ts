import { NextRequest, NextResponse } from "next/server";
import { getScrapes, deleteScrape } from "@/lib/db";

export async function GET() {
  const scrapes = getScrapes();
  return NextResponse.json(scrapes);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");

  if (!idParam) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id parameter" }, { status: 400 });
  }

  const deleted = deleteScrape(id);
  if (!deleted) {
    return NextResponse.json({ error: "Scrape not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
