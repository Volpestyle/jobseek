import { NextRequest, NextResponse } from "next/server";
import { getPreferences, savePreferences, Preferences } from "@/lib/db";

export async function GET() {
  const prefs = getPreferences();
  return NextResponse.json(prefs);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Preferences;

  savePreferences({
    keywords: body.keywords || "",
    location: body.location || "",
    remote: Boolean(body.remote),
    experience: body.experience || "",
    date_posted: body.date_posted || "",
    max_pages: body.max_pages || 5,
  });

  return NextResponse.json({ success: true });
}
